const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Módulo Financeiro (Cobranças & Livro Caixa) - Multi-Tenancy & Integração', () => {
  let tokenUser1 = '';
  let tokenUser2 = '';
  let user1Id = null;
  let user2Id = null;

  let clienteUser1Id = null;
  let clienteUser2Id = null;

  const user1 = {
    nome: 'MEI Financeiro Um',
    email: 'fin.user1@mei.com',
    senha: 'SenhaForte123@'
  };

  const user2 = {
    nome: 'MEI Financeiro Dois',
    email: 'fin.user2@mei.com',
    senha: 'SenhaForte123@'
  };

  const limparDados = async () => {
    await pool.execute(`
      DELETE FROM movimentacoes 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('fin.user1@mei.com', 'fin.user2@mei.com'))
    `);
    await pool.execute(`
      DELETE FROM cobrancas 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('fin.user1@mei.com', 'fin.user2@mei.com'))
    `);
    await pool.execute(`
      DELETE FROM clientes 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('fin.user1@mei.com', 'fin.user2@mei.com'))
    `);
    await pool.execute(`
      DELETE FROM usuarios 
      WHERE email IN ('fin.user1@mei.com', 'fin.user2@mei.com')
    `);
  };

  beforeAll(async () => {
    await limparDados();

    // Registro dos 2 MEIs
    const res1 = await request(app).post('/api/auth/register').send(user1);
    tokenUser1 = res1.body.dados.token;
    user1Id = res1.body.dados.id;

    const res2 = await request(app).post('/api/auth/register').send(user2);
    tokenUser2 = res2.body.dados.token;
    user2Id = res2.body.dados.id;

    // Criar Cliente para MEI 1
    const cliRes1 = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ nome: 'Cliente do Fin MEI 1', email: 'fincli1@email.com', telefone: '11955555555' });
    clienteUser1Id = cliRes1.body.dados.id;

    // Criar Cliente para MEI 2
    const cliRes2 = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenUser2}`)
      .send({ nome: 'Cliente do Fin MEI 2', email: 'fincli2@email.com', telefone: '11966666666' });
    clienteUser2Id = cliRes2.body.dados.id;
  });

  afterAll(async () => {
    await limparDados();
    await pool.end();
  });

  // ==========================================
  // AUTENTICAÇÃO E SEGURANÇA
  // ==========================================
  describe('Proteção das rotas com AuthMiddleware', () => {
    test('deve negar acesso a /api/cobrancas sem token (401)', async () => {
      const res = await request(app).get('/api/cobrancas');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });

    test('deve negar acesso a /api/movimentacoes sem token (401)', async () => {
      const res = await request(app).get('/api/movimentacoes');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });

    test('deve negar acesso com token inválido (401)', async () => {
      const res = await request(app)
        .get('/api/cobrancas')
        .set('Authorization', 'Bearer token_invalido_xyz');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });
  });

  // ==========================================
  // MÓDULO COBRANÇAS
  // ==========================================
  describe('Validações de Cobrança (POST /api/cobrancas)', () => {
    test('deve rejeitar cobrança sem cliente_id (400)', async () => {
      const res = await request(app)
        .post('/api/cobrancas')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          valor: 150.00,
          vencimento: '2026-11-15'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/cliente/i);
    });

    test('deve rejeitar cliente pertencente a outro MEI (404)', async () => {
      const res = await request(app)
        .post('/api/cobrancas')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cliente_id: clienteUser2Id,
          valor: 150.00,
          vencimento: '2026-11-15'
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/cliente/i);
    });

    test('deve rejeitar cobrança com valor zero ou negativo (400)', async () => {
      const resZero = await request(app)
        .post('/api/cobrancas')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cliente_id: clienteUser1Id,
          valor: 0,
          vencimento: '2026-11-15'
        });
      expect(resZero.statusCode).toBe(400);
      expect(resZero.body.sucesso).toBe(false);

      const resNeg = await request(app)
        .post('/api/cobrancas')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cliente_id: clienteUser1Id,
          valor: -25.50,
          vencimento: '2026-11-15'
        });
      expect(resNeg.statusCode).toBe(400);
      expect(resNeg.body.sucesso).toBe(false);
    });

    test('deve rejeitar cobrança com vencimento inválido (400)', async () => {
      const res = await request(app)
        .post('/api/cobrancas')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cliente_id: clienteUser1Id,
          valor: 200.00,
          vencimento: 'data_invalida'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/vencimento/i);
    });

    test('deve criar cobrança pendente com sucesso (201)', async () => {
      const res = await request(app)
        .post('/api/cobrancas')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cliente_id: clienteUser1Id,
          valor: 350.00,
          vencimento: '2026-11-20',
          observacoes: 'Serviço de manutenção elétrica'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toHaveProperty('id');
      expect(res.body.dados.cliente_id).toBe(clienteUser1Id);
      expect(Number(res.body.dados.valor)).toBe(350.00);
      expect(res.body.dados.status).toBe('PENDENTE');
      expect(res.body.dados.cliente_nome).toBe('Cliente do Fin MEI 1');
      expect(res.body.dados.data_pagamento).toBeNull();
    });
  });

  // ==========================================
  // BAIXA DE COBRANÇA E INTEGRAÇÃO COM CAIXA
  // ==========================================
  describe('Baixa de Cobrança e Integração com Livro Caixa (PATCH /api/cobrancas/:id/pagar)', () => {
    let cobrancaParaPagarId = null;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/cobrancas')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cliente_id: clienteUser1Id,
          valor: 500.00,
          vencimento: '2026-11-25',
          observacoes: 'Cobrança para teste de baixa automática'
        });
      cobrancaParaPagarId = res.body.dados.id;
    });

    test('MEI 2 não pode dar baixa na cobrança do MEI 1 (404)', async () => {
      const res = await request(app)
        .patch(`/api/cobrancas/${cobrancaParaPagarId}/pagar`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ data_pagamento: '2026-11-25' });

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });

    test('deve dar baixa na cobrança marcando como PAGO e gerando movimentação automática de ENTRADA no caixa (200)', async () => {
      const resBaixa = await request(app)
        .patch(`/api/cobrancas/${cobrancaParaPagarId}/pagar`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          data_pagamento: '2026-11-25',
          gerar_movimentacao_caixa: true
        });

      expect(resBaixa.statusCode).toBe(200);
      expect(resBaixa.body.sucesso).toBe(true);
      expect(resBaixa.body.dados.status).toBe('PAGO');
      expect(resBaixa.body.dados.data_pagamento).toBe('2026-11-25');
      expect(resBaixa.body.dados.movimentacao_caixa).toBeDefined();
      expect(resBaixa.body.dados.movimentacao_caixa.tipo).toBe('ENTRADA');
      expect(Number(resBaixa.body.dados.movimentacao_caixa.valor)).toBe(500.00);
      expect(resBaixa.body.dados.movimentacao_caixa.cobranca_id).toBe(cobrancaParaPagarId);

      // Verificar que o livro caixa agora contém a movimentação de ENTRADA vinculada
      const resCaixa = await request(app)
        .get('/api/movimentacoes')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(resCaixa.statusCode).toBe(200);
      const movEntrada = resCaixa.body.dados.find(m => m.cobranca_id === cobrancaParaPagarId);
      expect(movEntrada).toBeDefined();
      expect(movEntrada.tipo).toBe('ENTRADA');
      expect(Number(movEntrada.valor)).toBe(500.00);
      expect(movEntrada.descricao).toContain(String(cobrancaParaPagarId));
      expect(movEntrada.categoria).toBe('Recebimento de Cobrança');
    });

    test('PUT /api/cobrancas/:id/pagar também deve funcionar como alias idempotente', async () => {
      const resPut = await request(app)
        .put(`/api/cobrancas/${cobrancaParaPagarId}/pagar`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          data_pagamento: '2026-11-26',
          gerar_movimentacao_caixa: false
        });

      expect(resPut.statusCode).toBe(200);
      expect(resPut.body.sucesso).toBe(true);
      expect(resPut.body.dados.status).toBe('PAGO');
    });
  });

  // ==========================================
  // OPERAÇÕES DO LIVRO CAIXA (MOVIMENTAÇÕES)
  // ==========================================
  describe('Gestão Avulsa do Livro Caixa (POST, GET, DELETE /api/movimentacoes)', () => {
    let despesaId = null;

    test('deve rejeitar movimentação sem tipo válido (400)', async () => {
      const res = await request(app)
        .post('/api/movimentacoes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          tipo: 'OUTRO_TIPO',
          valor: 100.00,
          descricao: 'Material'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
    });

    test('deve rejeitar movimentação com valor menor ou igual a zero (400)', async () => {
      const res = await request(app)
        .post('/api/movimentacoes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          tipo: 'SAIDA',
          valor: 0,
          descricao: 'Compra de parafusos'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
    });

    test('deve registrar movimentação avulsa de SAÍDA (despesa operacional) (201)', async () => {
      const res = await request(app)
        .post('/api/movimentacoes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          tipo: 'SAIDA',
          categoria: 'Materiais e Ferramentas',
          valor: 120.00,
          data_movimentacao: '2026-11-26',
          descricao: 'Compra de fiação elétrica e conectores'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toHaveProperty('id');
      expect(res.body.dados.tipo).toBe('SAIDA');
      expect(Number(res.body.dados.valor)).toBe(120.00);
      expect(res.body.dados.cobranca_id).toBeNull();
      despesaId = res.body.dados.id;
    });

    test('deve registrar movimentação avulsa de ENTRADA (ex: aporte ou venda balcão) (201)', async () => {
      const res = await request(app)
        .post('/api/movimentacoes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          tipo: 'ENTRADA',
          categoria: 'Venda Avulsa',
          valor: 80.00,
          data_movimentacao: '2026-11-26',
          descricao: 'Venda avulsa de lâmpada LED'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.tipo).toBe('ENTRADA');
      expect(Number(res.body.dados.valor)).toBe(80.00);
    });

    test('deve obter resumo do caixa com totais corretos (GET /api/movimentacoes/resumo)', async () => {
      const res = await request(app)
        .get('/api/movimentacoes/resumo?ano=2026&mes=11')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toHaveProperty('entradas');
      expect(res.body.dados).toHaveProperty('saidas');
      expect(res.body.dados).toHaveProperty('saldo');

      // MEI 1 teve: 500 (baixa) + 80 (venda avulsa) = 580 entradas, 120 saídas. Saldo = 460
      expect(res.body.dados.entradas).toBe(580.00);
      expect(res.body.dados.saidas).toBe(120.00);
      expect(res.body.dados.saldo).toBe(460.00);
    });

    test('deve excluir uma movimentação do caixa (DELETE /api/movimentacoes/:id) (200)', async () => {
      const res = await request(app)
        .delete(`/api/movimentacoes/${despesaId}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);

      const resGet = await request(app)
        .get(`/api/movimentacoes/${despesaId}`)
        .set('Authorization', `Bearer ${tokenUser1}`);
      expect(resGet.statusCode).toBe(404);
    });
  });

  // ==========================================
  // ISOLAMENTO MULTI-TENANT RIGOROSO
  // ==========================================
  describe('Isolamento Multi-Tenant em Cobranças e Caixa', () => {
    let cobrancaUser1Id = null;
    let movimentacaoUser1Id = null;

    beforeAll(async () => {
      // MEI 1 cria cobrança
      const cRes = await request(app)
        .post('/api/cobrancas')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cliente_id: clienteUser1Id,
          valor: 999.00,
          vencimento: '2026-12-01'
        });
      cobrancaUser1Id = cRes.body.dados.id;

      // MEI 1 cria movimentação
      const mRes = await request(app)
        .post('/api/movimentacoes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          tipo: 'ENTRADA',
          valor: 300.00,
          descricao: 'Depósito MEI 1'
        });
      movimentacaoUser1Id = mRes.body.dados.id;
    });

    test('MEI 2 não deve enxergar cobranças de MEI 1 na listagem', async () => {
      const res = await request(app)
        .get('/api/cobrancas')
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(200);
      const ids = res.body.dados.map(c => c.id);
      expect(ids).not.toContain(cobrancaUser1Id);
    });

    test('MEI 2 não deve acessar cobrança de MEI 1 por ID (404)', async () => {
      const res = await request(app)
        .get(`/api/cobrancas/${cobrancaUser1Id}`)
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });

    test('MEI 2 não deve excluir cobrança de MEI 1 (404)', async () => {
      const res = await request(app)
        .delete(`/api/cobrancas/${cobrancaUser1Id}`)
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });

    test('MEI 2 não deve enxergar movimentações de MEI 1 na listagem', async () => {
      const res = await request(app)
        .get('/api/movimentacoes')
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(200);
      const ids = res.body.dados.map(m => m.id);
      expect(ids).not.toContain(movimentacaoUser1Id);
    });

    test('MEI 2 não deve acessar movimentação de MEI 1 por ID (404)', async () => {
      const res = await request(app)
        .get(`/api/movimentacoes/${movimentacaoUser1Id}`)
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });

    test('MEI 2 não deve excluir movimentação de MEI 1 (404)', async () => {
      const res = await request(app)
        .delete(`/api/movimentacoes/${movimentacaoUser1Id}`)
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });

    test('Resumo financeiro do MEI 2 não deve conter valores do MEI 1', async () => {
      const res = await request(app)
        .get('/api/movimentacoes/resumo')
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.dados.entradas).toBe(0);
      expect(res.body.dados.saidas).toBe(0);
      expect(res.body.dados.saldo).toBe(0);
    });
  });
});
