const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');

describe('Módulo Fiscal API (/api/notas-fiscais) - REST & Multi-Tenancy', () => {
  let tokenUser1 = '';
  let tokenUser2 = '';
  let user1Id = null;
  let user2Id = null;

  const user1 = {
    nome: 'MEI Fiscal Um',
    email: 'fiscal.api1@mei.com',
    senha: 'SenhaForte123@'
  };

  const user2 = {
    nome: 'MEI Fiscal Dois',
    email: 'fiscal.api2@mei.com',
    senha: 'SenhaForte123@'
  };

  beforeAll(async () => {
    // Limpeza prévia
    await pool.execute(
      `DELETE FROM nota_fiscal_itens WHERE nota_fiscal_id IN (
        SELECT id FROM notas_fiscais WHERE usuario_id IN (
          SELECT id FROM usuarios WHERE email IN ('fiscal.api1@mei.com', 'fiscal.api2@mei.com')
        )
      )`
    );
    await pool.execute(
      `DELETE FROM notas_fiscais WHERE usuario_id IN (
        SELECT id FROM usuarios WHERE email IN ('fiscal.api1@mei.com', 'fiscal.api2@mei.com')
      )`
    );
    await pool.execute(
      `DELETE FROM movimentacoes WHERE usuario_id IN (
        SELECT id FROM usuarios WHERE email IN ('fiscal.api1@mei.com', 'fiscal.api2@mei.com')
      )`
    );
    await pool.execute(
      `DELETE FROM usuarios WHERE email IN ('fiscal.api1@mei.com', 'fiscal.api2@mei.com')`
    );

    // Registro dos usuários de teste
    const res1 = await request(app).post('/api/auth/register').send(user1);
    tokenUser1 = res1.body.dados.token;
    user1Id = res1.body.dados.id;

    const res2 = await request(app).post('/api/auth/register').send(user2);
    tokenUser2 = res2.body.dados.token;
    user2Id = res2.body.dados.id;
  });

  afterAll(async () => {
    // Limpeza final
    await pool.execute(
      `DELETE FROM nota_fiscal_itens WHERE nota_fiscal_id IN (
        SELECT id FROM notas_fiscais WHERE usuario_id IN (
          SELECT id FROM usuarios WHERE email IN ('fiscal.api1@mei.com', 'fiscal.api2@mei.com')
        )
      )`
    );
    await pool.execute(
      `DELETE FROM notas_fiscais WHERE usuario_id IN (
        SELECT id FROM usuarios WHERE email IN ('fiscal.api1@mei.com', 'fiscal.api2@mei.com')
      )`
    );
    await pool.execute(
      `DELETE FROM movimentacoes WHERE usuario_id IN (
        SELECT id FROM usuarios WHERE email IN ('fiscal.api1@mei.com', 'fiscal.api2@mei.com')
      )`
    );
    await pool.execute(
      `DELETE FROM usuarios WHERE email IN ('fiscal.api1@mei.com', 'fiscal.api2@mei.com')`
    );
    await pool.end();
  });

  describe('Proteção das rotas com JWT (AuthMiddleware)', () => {
    test('deve negar acesso sem token (401)', async () => {
      const res = await request(app).get('/api/notas-fiscais');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });

    test('deve negar acesso com token inválido (401)', async () => {
      const res = await request(app)
        .get('/api/notas-fiscais')
        .set('Authorization', 'Bearer token_invalido');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('Emissão de NFS-e (POST /api/notas-fiscais/nfse)', () => {
    test('deve rejeitar NFS-e sem campos obrigatórios (400)', async () => {
      const res = await request(app)
        .post('/api/notas-fiscais/nfse')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          valor: 100
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toBeDefined();
    });

    test('deve emitir NFS-e com sucesso retornando status 201 e dados da nota', async () => {
      const payload = {
        destinatario_nome: 'Cliente Servico Ltda',
        destinatario_documento: '12345678000195',
        destinatario_email: 'cliente@servico.com',
        discriminacao_servico: 'Serviço de desenvolvimento web',
        valor: 1200.00,
        codigo_tributacao_nacional: '01.07.01'
      };

      const res = await request(app)
        .post('/api/notas-fiscais/nfse')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toBeDefined();
      expect(res.body.dados.id).toBeDefined();
      expect(res.body.dados.tipo).toBe('NFSE');
      expect(res.body.dados.status).toBe('EMITIDA');
      expect(res.body.dados.numero).toBe(1);
      expect(res.body.dados.chave_acesso).toBeDefined();
      expect(res.body.dados.xml).toContain('<DPS');
      expect(res.body.dados.danfe).toContain('DANFSE');
    });
  });

  describe('Emissão de NF-e (POST /api/notas-fiscais/nfe)', () => {
    test('deve rejeitar NF-e sem itens (400)', async () => {
      const res = await request(app)
        .post('/api/notas-fiscais/nfe')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          destinatario_nome: 'Empresa Compradora',
          destinatario_documento: '12345678000195',
          itens: []
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
    });

    test('deve emitir NF-e com itens e chave de 44 dígitos com status 201', async () => {
      const payload = {
        destinatario_nome: 'Empresa Compradora Ltda',
        destinatario_documento: '12345678000195',
        destinatario_email: 'compradora@teste.com',
        natureza_operacao: 'Venda de mercadorias',
        itens: [
          {
            descricao: 'Teclado Mecânico USB',
            ncm: '84716052',
            cfop: '5102',
            unidade: 'UN',
            quantidade: 2,
            valor_unitario: 150.00
          },
          {
            descricao: 'Mouse Óptico USB',
            ncm: '84716053',
            cfop: '5102',
            unidade: 'UN',
            quantidade: 1,
            valor_unitario: 80.00
          }
        ]
      };

      const res = await request(app)
        .post('/api/notas-fiscais/nfe')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.id).toBeDefined();
      expect(res.body.dados.tipo).toBe('NFE');
      expect(res.body.dados.status).toBe('EMITIDA');
      expect(res.body.dados.chave_acesso).toHaveLength(44);
      expect(Array.isArray(res.body.dados.itens)).toBe(true);
      expect(res.body.dados.itens).toHaveLength(2);
      expect(Number(res.body.dados.valor_total)).toBe(380.00);
    });
  });

  describe('Emissão de NFC-e (POST /api/notas-fiscais/nfce)', () => {
    test('deve emitir NFC-e para consumidor no balcão com status 201', async () => {
      const payload = {
        destinatario_nome: 'Consumidor Final',
        forma_pagamento: 'PIX',
        itens: [
          {
            descricao: 'Café Expresso',
            ncm: '09012100',
            cfop: '5102',
            unidade: 'UN',
            quantidade: 1,
            valor_unitario: 7.50
          }
        ]
      };

      const res = await request(app)
        .post('/api/notas-fiscais/nfce')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.id).toBeDefined();
      expect(res.body.dados.tipo).toBe('NFCE');
      expect(res.body.dados.status).toBe('EMITIDA');
      expect(res.body.dados.chave_acesso).toHaveLength(44);
    });
  });

  describe('Listagem e Consulta (GET /api/notas-fiscais e GET /api/notas-fiscais/:id)', () => {
    let notaUser1Id = null;

    beforeAll(async () => {
      const res = await request(app)
        .get('/api/notas-fiscais')
        .set('Authorization', `Bearer ${tokenUser1}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.dados.length).toBeGreaterThanOrEqual(3);
      notaUser1Id = res.body.dados[0].id;
    });

    test('deve listar notas fiscais do usuário com sucesso (200)', async () => {
      const res = await request(app)
        .get('/api/notas-fiscais')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(Array.isArray(res.body.dados)).toBe(true);
    });

    test('deve filtrar notas fiscais por tipo (200)', async () => {
      const res = await request(app)
        .get('/api/notas-fiscais?tipo=NFSE')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.every(n => n.tipo === 'NFSE')).toBe(true);
    });

    test('deve filtrar notas fiscais por status (200)', async () => {
      const res = await request(app)
        .get('/api/notas-fiscais?status=EMITIDA')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.every(n => n.status === 'EMITIDA')).toBe(true);
    });

    test('deve consultar detalhes da nota fiscal por ID (200)', async () => {
      const res = await request(app)
        .get(`/api/notas-fiscais/${notaUser1Id}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.id).toBe(notaUser1Id);
      expect(res.body.dados).toHaveProperty('chave_acesso');
      expect(res.body.dados).toHaveProperty('itens');
    });

    test('deve retornar 404 ao consultar ID inexistente', async () => {
      const res = await request(app)
        .get('/api/notas-fiscais/99999999')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('Obtenção de DANFE (GET /api/notas-fiscais/:id/danfe)', () => {
    let notaUser1Id = null;

    beforeAll(async () => {
      const res = await request(app)
        .get('/api/notas-fiscais')
        .set('Authorization', `Bearer ${tokenUser1}`);
      notaUser1Id = res.body.dados[0].id;
    });

    test('deve retornar espelho DANFE em JSON por padrão (200)', async () => {
      const res = await request(app)
        .get(`/api/notas-fiscais/${notaUser1Id}/danfe`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.danfe).toBeDefined();
      expect(typeof res.body.dados.danfe).toBe('string');
      expect(res.body.dados.danfe).toContain('<!DOCTYPE html>');
    });

    test('deve retornar HTML diretamente quando solicitado via query formato=html ou Accept text/html', async () => {
      const resHtml = await request(app)
        .get(`/api/notas-fiscais/${notaUser1Id}/danfe?formato=html`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(resHtml.statusCode).toBe(200);
      expect(resHtml.headers['content-type']).toMatch(/text\/html/);
      expect(resHtml.text).toContain('<!DOCTYPE html>');

      const resHeader = await request(app)
        .get(`/api/notas-fiscais/${notaUser1Id}/danfe`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .set('Accept', 'text/html');

      expect(resHeader.statusCode).toBe(200);
      expect(resHeader.headers['content-type']).toMatch(/text\/html/);
      expect(resHeader.text).toContain('<!DOCTYPE html>');
    });
  });

  describe('Cancelamento de Nota Fiscal (POST /api/notas-fiscais/:id/cancelar)', () => {
    let notaParaCancelarId = null;

    beforeAll(async () => {
      // Cria uma nota específica para ser cancelada
      const payload = {
        destinatario_nome: 'Cliente para Cancelamento',
        destinatario_documento: '12345678000195',
        discriminacao_servico: 'Serviço que será cancelado',
        valor: 500.00
      };

      const res = await request(app)
        .post('/api/notas-fiscais/nfse')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(payload);

      notaParaCancelarId = res.body.dados.id;
    });

    test('deve rejeitar cancelamento se motivo tiver menos de 15 caracteres (400)', async () => {
      const res = await request(app)
        .post(`/api/notas-fiscais/${notaParaCancelarId}/cancelar`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ motivo: 'Motivo curto' });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/15 caracteres/i);
    });

    test('deve cancelar nota com sucesso se motivo for válido (200)', async () => {
      const motivoValido = 'Cancelamento solicitado pelo tomador devido a erro no preenchimento';

      const res = await request(app)
        .post(`/api/notas-fiscais/${notaParaCancelarId}/cancelar`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ motivo: motivoValido });

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.status).toBe('CANCELADA');
      expect(res.body.dados.motivo_cancelamento).toBe(motivoValido);
    });

    test('deve rejeitar tentativa de cancelar nota já cancelada (400)', async () => {
      const res = await request(app)
        .post(`/api/notas-fiscais/${notaParaCancelarId}/cancelar`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ motivo: 'Segunda tentativa de cancelamento para esta nota' });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/já está cancelada/i);
    });
  });

  describe('Isolamento Multi-Tenant Rigoroso', () => {
    let notaUser1Id = null;

    beforeAll(async () => {
      const res = await request(app)
        .get('/api/notas-fiscais')
        .set('Authorization', `Bearer ${tokenUser1}`);
      notaUser1Id = res.body.dados[0].id;
    });

    test('Usuário B não deve ver notas fiscais do Usuário A na listagem', async () => {
      const res = await request(app)
        .get('/api/notas-fiscais')
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toHaveLength(0);
    });

    test('Usuário B não deve conseguir consultar nota fiscal do Usuário A (404)', async () => {
      const res = await request(app)
        .get(`/api/notas-fiscais/${notaUser1Id}`)
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });

    test('Usuário B não deve conseguir obter DANFE de nota fiscal do Usuário A (404)', async () => {
      const res = await request(app)
        .get(`/api/notas-fiscais/${notaUser1Id}/danfe`)
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });

    test('Usuário B não deve conseguir cancelar nota fiscal do Usuário A (404)', async () => {
      const res = await request(app)
        .post(`/api/notas-fiscais/${notaUser1Id}/cancelar`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ motivo: 'Tentativa indevida de cancelar nota de outro MEI' });

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });
  });
});
