const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../src/middlewares/authMiddleware');

describe('E2E: Emissão Fiscal Conversacional e Operacional do Assistente IA', () => {
  const EMAIL_TENANT_1 = 'assistente.fiscal1@mei.com';
  const EMAIL_TENANT_2 = 'assistente.fiscal2@mei.com';
  const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_chave_jwt_recode_2026';

  let tenant1Id, tokenTenant1, scopedTokenTenant1;
  let tenant2Id, tokenTenant2, scopedTokenTenant2;

  let nfseTenant1Id = null;
  let nfeTenant1Id = null;
  let nfceTenant1Id = null;

  const limparDados = async () => {
    await pool.execute(`
      DELETE FROM nota_fiscal_itens WHERE nota_fiscal_id IN (
        SELECT id FROM notas_fiscais WHERE usuario_id IN (
          SELECT id FROM usuarios WHERE email IN (?, ?)
        )
      )
    `, [EMAIL_TENANT_1, EMAIL_TENANT_2]);

    await pool.execute(`
      DELETE FROM notas_fiscais 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN (?, ?))
    `, [EMAIL_TENANT_1, EMAIL_TENANT_2]);

    await pool.execute(`
      DELETE FROM movimentacoes 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN (?, ?))
    `, [EMAIL_TENANT_1, EMAIL_TENANT_2]);

    await pool.execute(`
      DELETE FROM usuarios WHERE email IN (?, ?)
    `, [EMAIL_TENANT_1, EMAIL_TENANT_2]);
  };

  beforeAll(async () => {
    await limparDados();

    // 1. Cadastra Tenant 1
    const resT1 = await request(app).post('/api/auth/register').send({
      nome: 'Oficina Mecânica Alpha MEI',
      email: EMAIL_TENANT_1,
      senha: 'SenhaSegura123@'
    });
    tenant1Id = resT1.body.dados.id;
    tokenTenant1 = resT1.body.dados.token;

    // 2. Cadastra Tenant 2
    const resT2 = await request(app).post('/api/auth/register').send({
      nome: 'Consultoria Beta MEI',
      email: EMAIL_TENANT_2,
      senha: 'SenhaSegura123@'
    });
    tenant2Id = resT2.body.dados.id;
    tokenTenant2 = resT2.body.dados.token;

    // 3. Emissão de Scoped Tokens (assistente:access) para os Tenants
    scopedTokenTenant1 = authMiddleware.generateScopedToken
      ? authMiddleware.generateScopedToken(tenant1Id, 'assistente:access')
      : jwt.sign({ id: tenant1Id, scope: 'assistente:access' }, JWT_SECRET, { expiresIn: '15m' });

    scopedTokenTenant2 = authMiddleware.generateScopedToken
      ? authMiddleware.generateScopedToken(tenant2Id, 'assistente:access')
      : jwt.sign({ id: tenant2Id, scope: 'assistente:access' }, JWT_SECRET, { expiresIn: '15m' });
  });

  afterAll(async () => {
    await limparDados();
    await pool.end();
  });

  describe('1. Emissão de Scoped JWT Token e Permissões do Assistente', () => {
    test('deve disponibilizar authMiddleware.generateScopedToken gerando token com escopo assistente:access', () => {
      expect(typeof authMiddleware.generateScopedToken).toBe('function');

      const tokenGerado = authMiddleware.generateScopedToken(tenant1Id, 'assistente:access');
      expect(tokenGerado).toBeDefined();

      const decodificado = jwt.verify(tokenGerado, JWT_SECRET);
      expect(decodificado.id).toBe(tenant1Id);
      expect(decodificado.scope).toBe('assistente:access');
    });

    test('deve bloquear métodos de exclusão (DELETE) quando usado token de escopo assistente (403)', async () => {
      const res = await request(app)
        .delete('/api/clientes/999')
        .set('Authorization', `Bearer ${scopedTokenTenant1}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/operador do assistente/i);
    });

    test('deve bloquear acesso direto às rotas do próprio assistente com scoped token (evita recursão) (403)', async () => {
      const res = await request(app)
        .get('/api/assistente/conversas')
        .set('Authorization', `Bearer ${scopedTokenTenant1}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('2. Emissão de Documentos Fiscais via Scoped Token', () => {
    test('deve emitir NFS-e Nacional via scoped token e registrar entrada no Livro Caixa (201)', async () => {
      const payloadNfse = {
        destinatario_nome: 'Auto Peças Modelo Ltda',
        destinatario_documento: '12345678000195',
        destinatario_email: 'contato@pecasmodelo.com',
        discriminacao_servico: 'Manutenção preventiva e alinhamento de motores',
        valor: 1500.00,
        codigo_tributacao_nacional: '14.01.01'
      };

      const res = await request(app)
        .post('/api/notas-fiscais/nfse')
        .set('Authorization', `Bearer ${scopedTokenTenant1}`)
        .send(payloadNfse);

      expect(res.statusCode).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toBeDefined();
      expect(res.body.dados.tipo).toBe('NFSE');
      expect(res.body.dados.status).toBe('EMITIDA');
      expect(res.body.dados.numero).toBeDefined();
      expect(res.body.dados.serie).toBeDefined();
      expect(res.body.dados.chave_acesso).toBeDefined();
      expect(res.body.dados.protocolo_autorizacao).toBeDefined();
      expect(Number(res.body.dados.valor_total)).toBe(1500.00);

      nfseTenant1Id = res.body.dados.id;

      // Valida reflexo financeiro no Livro Caixa (movimentacoes)
      const [movRows] = await pool.query(
        'SELECT * FROM movimentacoes WHERE usuario_id = ? AND tipo = "ENTRADA" ORDER BY id DESC LIMIT 1',
        [tenant1Id]
      );
      expect(movRows.length).toBe(1);
      expect(Number(movRows[0].valor)).toBe(1500.00);
      expect(movRows[0].categoria).toContain('NFS-e');
    });

    test('deve emitir NF-e de Produtos via scoped token com chave de 44 dígitos (201)', async () => {
      const payloadNfe = {
        destinatario_nome: 'Distribuidora Central Ltda',
        destinatario_documento: '98765432000180',
        destinatario_email: 'financeiro@central.com',
        natureza_operacao: 'Venda de produtos e mercadorias',
        itens: [
          {
            descricao: 'Filtro de Óleo Automotivo',
            ncm: '84212300',
            cfop: '5102',
            unidade: 'UN',
            quantidade: 4,
            valor_unitario: 50.00
          },
          {
            descricao: 'Óleo Sintético 5W30 (Litro)',
            ncm: '27101932',
            cfop: '5102',
            unidade: 'UN',
            quantidade: 4,
            valor_unitario: 60.00
          }
        ]
      };

      const res = await request(app)
        .post('/api/notas-fiscais/nfe')
        .set('Authorization', `Bearer ${scopedTokenTenant1}`)
        .send(payloadNfe);

      expect(res.statusCode).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.tipo).toBe('NFE');
      expect(res.body.dados.status).toBe('EMITIDA');
      expect(res.body.dados.chave_acesso).toHaveLength(44);
      expect(res.body.dados.protocolo_autorizacao).toBeDefined();
      expect(Number(res.body.dados.valor_total)).toBe(440.00);
      expect(res.body.dados.itens).toHaveLength(2);

      nfeTenant1Id = res.body.dados.id;
    });

    test('deve emitir NFC-e de Consumidor via scoped token para venda no balcão (201)', async () => {
      const payloadNfce = {
        destinatario_nome: 'Consumidor Balcão',
        forma_pagamento: 'PIX',
        itens: [
          {
            descricao: 'Palheta Limpador de Parabrisa',
            ncm: '85129000',
            cfop: '5102',
            unidade: 'UN',
            quantidade: 1,
            valor_unitario: 45.00
          }
        ]
      };

      const res = await request(app)
        .post('/api/notas-fiscais/nfce')
        .set('Authorization', `Bearer ${scopedTokenTenant1}`)
        .send(payloadNfce);

      expect(res.statusCode).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.tipo).toBe('NFCE');
      expect(res.body.dados.status).toBe('EMITIDA');
      expect(res.body.dados.chave_acesso).toHaveLength(44);
      expect(Number(res.body.dados.valor_total)).toBe(45.00);

      nfceTenant1Id = res.body.dados.id;
    });
  });

  describe('3. Listagem e Consulta de Documentos Fiscais via Scoped Token', () => {
    test('deve listar notas fiscais emitidas pelo Tenant 1 com sucesso (200)', async () => {
      const res = await request(app)
        .get('/api/notas-fiscais')
        .set('Authorization', `Bearer ${scopedTokenTenant1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(Array.isArray(res.body.dados)).toBe(true);
      expect(res.body.dados.length).toBe(3);
    });

    test('deve filtrar notas por tipo NFSE (200)', async () => {
      const res = await request(app)
        .get('/api/notas-fiscais?tipo=NFSE')
        .set('Authorization', `Bearer ${scopedTokenTenant1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.length).toBe(1);
      expect(res.body.dados[0].tipo).toBe('NFSE');
    });

    test('deve consultar detalhes completos da nota fiscal por ID incluindo DANFE (200)', async () => {
      const res = await request(app)
        .get(`/api/notas-fiscais/${nfeTenant1Id}`)
        .set('Authorization', `Bearer ${scopedTokenTenant1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.id).toBe(nfeTenant1Id);
      expect(res.body.dados.tipo).toBe('NFE');
      expect(res.body.dados.chave_acesso).toHaveLength(44);
      expect(res.body.dados.danfe).toBeDefined();
      expect(res.body.dados.danfe).toContain('DANFE');
    });

    test('deve obter DANFE simplificado via endpoint dedicado (200)', async () => {
      const res = await request(app)
        .get(`/api/notas-fiscais/${nfseTenant1Id}/danfe`)
        .set('Authorization', `Bearer ${scopedTokenTenant1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.danfe).toContain('DANFSE');
    });
  });

  describe('4. Cancelamento com Trilha de Auditoria e Estorno Financeiro no Livro Caixa', () => {
    test('deve rejeitar cancelamento se justificativa tiver menos de 15 caracteres (400)', async () => {
      const res = await request(app)
        .post(`/api/notas-fiscais/${nfseTenant1Id}/cancelar`)
        .set('Authorization', `Bearer ${scopedTokenTenant1}`)
        .send({ motivo: 'Curto' });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/15 caracteres/i);
    });

    test('deve cancelar NFS-e com auditoria legal e estornar valor no Livro Caixa (200)', async () => {
      const justificativa = 'Cancelamento acordado com tomador devido a cancelamento do contrato de servico';

      const res = await request(app)
        .post(`/api/notas-fiscais/${nfseTenant1Id}/cancelar`)
        .set('Authorization', `Bearer ${scopedTokenTenant1}`)
        .send({ motivo: justificativa });

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.status).toBe('CANCELADA');
      expect(res.body.dados.motivo_cancelamento).toBe(justificativa);
      expect(res.body.dados.data_cancelamento).toBeDefined();

      // Verifica auditoria na tabela notas_fiscais
      const [notaRows] = await pool.query(
        'SELECT status, motivo_cancelamento, data_cancelamento FROM notas_fiscais WHERE id = ?',
        [nfseTenant1Id]
      );
      expect(notaRows[0].status).toBe('CANCELADA');
      expect(notaRows[0].motivo_cancelamento).toBe(justificativa);
      expect(notaRows[0].data_cancelamento).not.toBeNull();

      // Verifica lançamento compensatório de ESTORNO no Livro Caixa (movimentacoes)
      const [estornoRows] = await pool.query(
        'SELECT * FROM movimentacoes WHERE usuario_id = ? AND tipo = "SAIDA" AND categoria = "Estorno Fiscal" ORDER BY id DESC LIMIT 1',
        [tenant1Id]
      );
      expect(estornoRows.length).toBe(1);
      expect(Number(estornoRows[0].valor)).toBe(1500.00);
      expect(estornoRows[0].descricao).toContain('Estorno de cancelamento');
      expect(estornoRows[0].descricao).toContain(justificativa);
    });

    test('deve rejeitar tentativa de cancelar nota já cancelada (400)', async () => {
      const res = await request(app)
        .post(`/api/notas-fiscais/${nfseTenant1Id}/cancelar`)
        .set('Authorization', `Bearer ${scopedTokenTenant1}`)
        .send({ motivo: 'Tentando cancelar novamente mesma nota fiscal' });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/já está cancelada/i);
    });
  });

  describe('5. Isolamento Multi-Tenancy Rigoroso', () => {
    test('Tenant 2 não deve ver as notas fiscais do Tenant 1 na listagem', async () => {
      const res = await request(app)
        .get('/api/notas-fiscais')
        .set('Authorization', `Bearer ${scopedTokenTenant2}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toHaveLength(0);
    });

    test('Tenant 2 não deve conseguir consultar nota fiscal do Tenant 1 (404)', async () => {
      const res = await request(app)
        .get(`/api/notas-fiscais/${nfeTenant1Id}`)
        .set('Authorization', `Bearer ${scopedTokenTenant2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });

    test('Tenant 2 não deve conseguir consultar DANFE de nota do Tenant 1 (404)', async () => {
      const res = await request(app)
        .get(`/api/notas-fiscais/${nfeTenant1Id}/danfe`)
        .set('Authorization', `Bearer ${scopedTokenTenant2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });

    test('Tenant 2 não deve conseguir cancelar nota fiscal do Tenant 1 (404)', async () => {
      const res = await request(app)
        .post(`/api/notas-fiscais/${nfeTenant1Id}/cancelar`)
        .set('Authorization', `Bearer ${scopedTokenTenant2}`)
        .send({ motivo: 'Tentativa indevida de cancelar nota de outro MEI' });

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });

    test('Tenant 2 não deve ter acesso a nenhuma movimentação ou estorno do Tenant 1', async () => {
      const res = await request(app)
        .get('/api/movimentacoes')
        .set('Authorization', `Bearer ${scopedTokenTenant2}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.dados).toHaveLength(0);
    });
  });
});
