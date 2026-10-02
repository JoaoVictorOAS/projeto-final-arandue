const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Módulo de Orçamentos API (/api/orcamentos) - Cálculos & Multi-Tenancy', () => {
  let tokenUser1 = '';
  let tokenUser2 = '';
  let user1Id = null;
  let user2Id = null;

  let clienteUser1Id = null;
  let clienteUser2Id = null;
  let servicoUser1Id = null;

  const user1 = {
    nome: 'MEI Orçamento Um',
    email: 'orc.user1@mei.com',
    senha: 'SenhaForte123@'
  };

  const user2 = {
    nome: 'MEI Orçamento Dois',
    email: 'orc.user2@mei.com',
    senha: 'SenhaForte123@'
  };

  beforeAll(async () => {
    // Limpeza prévia de execuções anteriores
    await pool.execute("DELETE FROM orcamento_itens WHERE orcamento_id IN (SELECT id FROM orcamentos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('orc.user1@mei.com', 'orc.user2@mei.com')))");
    await pool.execute("DELETE FROM orcamentos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('orc.user1@mei.com', 'orc.user2@mei.com'))");
    await pool.execute("DELETE FROM servicos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('orc.user1@mei.com', 'orc.user2@mei.com'))");
    await pool.execute("DELETE FROM clientes WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('orc.user1@mei.com', 'orc.user2@mei.com'))");
    await pool.execute("DELETE FROM usuarios WHERE email IN ('orc.user1@mei.com', 'orc.user2@mei.com')");

    // Registro User 1
    const res1 = await request(app).post('/api/auth/register').send(user1);
    tokenUser1 = res1.body.dados.token;
    user1Id = res1.body.dados.id;

    // Registro User 2
    const res2 = await request(app).post('/api/auth/register').send(user2);
    tokenUser2 = res2.body.dados.token;
    user2Id = res2.body.dados.id;

    // Criar Cliente para User 1
    const cliRes1 = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ nome: 'Cliente do MEI 1', email: 'cli1@email.com', telefone: '11911111111' });
    clienteUser1Id = cliRes1.body.dados.id;

    // Criar Cliente para User 2
    const cliRes2 = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenUser2}`)
      .send({ nome: 'Cliente do MEI 2', email: 'cli2@email.com', telefone: '11922222222' });
    clienteUser2Id = cliRes2.body.dados.id;

    // Criar Serviço para User 1
    const srvRes1 = await request(app)
      .post('/api/servicos')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ nome: 'Pintura Residencial', preco: 150.00, categoria: 'Pintura' });
    servicoUser1Id = srvRes1.body.dados.id;
  });

  afterAll(async () => {
    // Limpeza final dos dados
    await pool.execute("DELETE FROM orcamento_itens WHERE orcamento_id IN (SELECT id FROM orcamentos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('orc.user1@mei.com', 'orc.user2@mei.com')))");
    await pool.execute("DELETE FROM orcamentos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('orc.user1@mei.com', 'orc.user2@mei.com'))");
    await pool.execute("DELETE FROM servicos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('orc.user1@mei.com', 'orc.user2@mei.com'))");
    await pool.execute("DELETE FROM clientes WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('orc.user1@mei.com', 'orc.user2@mei.com'))");
    await pool.execute("DELETE FROM usuarios WHERE email IN ('orc.user1@mei.com', 'orc.user2@mei.com')");
    await pool.end();
  });

  describe('Proteção das rotas com AuthMiddleware', () => {
    test('deve negar acesso sem token (401)', async () => {
      const res = await request(app).get('/api/orcamentos');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });

    test('deve negar acesso com token inválido (401)', async () => {
      const res = await request(app)
        .get('/api/orcamentos')
        .set('Authorization', 'Bearer token_invalido');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('Validações de Regra de Negócio na Emissão (POST /api/orcamentos)', () => {
    test('deve rejeitar orçamento sem cliente_id (400)', async () => {
      const res = await request(app)
        .post('/api/orcamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          itens: [{ quantidade: 1, preco_unitario: 100.00 }]
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/cliente/i);
    });

    test('deve rejeitar cliente pertencente a outro usuário MEI (404/400)', async () => {
      const res = await request(app)
        .post('/api/orcamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cliente_id: clienteUser2Id,
          itens: [{ quantidade: 1, preco_unitario: 100.00 }]
        });

      expect([400, 404]).toContain(res.statusCode);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/cliente.*não encontrado/i);
    });

    test('deve rejeitar orçamento sem itens (400)', async () => {
      const res = await request(app)
        .post('/api/orcamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cliente_id: clienteUser1Id,
          itens: []
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/pelo menos um item/i);
    });

    test('deve rejeitar orçamento com item de quantidade menor que 1 (400)', async () => {
      const res = await request(app)
        .post('/api/orcamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cliente_id: clienteUser1Id,
          itens: [{ quantidade: 0, preco_unitario: 100.00 }]
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/quantidade/i);
    });

    test('deve rejeitar orçamento com item de preço negativo (400)', async () => {
      const res = await request(app)
        .post('/api/orcamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cliente_id: clienteUser1Id,
          itens: [{ quantidade: 1, preco_unitario: -50.00 }]
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/preço/i);
    });

    test('deve rejeitar orçamento com desconto negativo (400)', async () => {
      const res = await request(app)
        .post('/api/orcamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cliente_id: clienteUser1Id,
          desconto: -10.00,
          itens: [{ quantidade: 1, preco_unitario: 100.00 }]
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/desconto/i);
    });

    test('deve rejeitar orçamento com desconto maior que o subtotal (400)', async () => {
      const res = await request(app)
        .post('/api/orcamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cliente_id: clienteUser1Id,
          desconto: 150.00,
          itens: [{ quantidade: 1, preco_unitario: 100.00 }] // subtotal = 100
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/desconto.*superior|maior/i);
    });
  });

  describe('Criação com Cálculo Automático no Servidor (POST /api/orcamentos)', () => {
    let orcamentoCriado = null;

    test('deve criar orçamento calculando subtotal e total com desconto com sucesso (201)', async () => {
      const payload = {
        cliente_id: clienteUser1Id,
        data_emissao: '2026-10-10',
        validade: '2026-10-25',
        desconto: 30.00,
        observacoes: 'Orçamento de teste automatizado',
        itens: [
          {
            servico_id: servicoUser1Id,
            quantidade: 2,
            preco_unitario: 150.00 // subtotal item 1 = 300.00
          },
          {
            quantidade: 3,
            preco_unitario: 50.00 // subtotal item 2 = 150.00
          }
        ]
      };

      const res = await request(app)
        .post('/api/orcamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toHaveProperty('id');
      expect(res.body.dados.cliente_id).toBe(clienteUser1Id);
      expect(res.body.dados.status).toBe('RASCUNHO');

      // Verificação rigorosa do cálculo
      // subtotal = 300 + 150 = 450.00
      // total = 450 - 30 = 420.00
      expect(Number(res.body.dados.subtotal)).toBe(450.00);
      expect(Number(res.body.dados.desconto)).toBe(30.00);
      expect(Number(res.body.dados.total)).toBe(420.00);

      // Verificação da lista de itens
      expect(Array.isArray(res.body.dados.itens)).toBe(true);
      expect(res.body.dados.itens).toHaveLength(2);
      expect(Number(res.body.dados.itens[0].subtotal)).toBe(300.00);
      expect(Number(res.body.dados.itens[1].subtotal)).toBe(150.00);
      expect(res.body.dados.itens[0].servico_nome).toBe('Pintura Residencial');

      orcamentoCriado = res.body.dados;
    });

    test('deve persistir corretamente no banco os dados calculados e os itens', async () => {
      const [rows] = await pool.execute('SELECT * FROM orcamentos WHERE id = ?', [orcamentoCriado.id]);
      expect(rows).toHaveLength(1);
      expect(Number(rows[0].subtotal)).toBe(450.00);
      expect(Number(rows[0].desconto)).toBe(30.00);
      expect(Number(rows[0].total)).toBe(420.00);

      const [itensRows] = await pool.execute('SELECT * FROM orcamento_itens WHERE orcamento_id = ? ORDER BY id ASC', [orcamentoCriado.id]);
      expect(itensRows).toHaveLength(2);
      expect(itensRows[0].quantidade).toBe(2);
      expect(Number(itensRows[0].preco_unitario)).toBe(150.00);
      expect(Number(itensRows[0].subtotal)).toBe(300.00);
    });
  });

  describe('Consulta e Listagem de Orçamentos (GET /api/orcamentos)', () => {
    let orcamentoUser1 = null;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/orcamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cliente_id: clienteUser1Id,
          itens: [{ quantidade: 1, preco_unitario: 80.00 }]
        });
      orcamentoUser1 = res.body.dados;
    });

    test('deve listar os orçamentos do MEI autenticado (200)', async () => {
      const res = await request(app)
        .get('/api/orcamentos')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(Array.isArray(res.body.dados)).toBe(true);
      expect(res.body.dados.length).toBeGreaterThanOrEqual(1);

      const ids = res.body.dados.map(o => o.id);
      expect(ids).toContain(orcamentoUser1.id);
    });

    test('deve filtrar orçamentos por status (200)', async () => {
      const res = await request(app)
        .get('/api/orcamentos?status=RASCUNHO')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.dados.every(o => o.status === 'RASCUNHO')).toBe(true);
    });

    test('deve buscar orçamento por ID com dados do cliente e itens (200)', async () => {
      const res = await request(app)
        .get(`/api/orcamentos/${orcamentoUser1.id}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.id).toBe(orcamentoUser1.id);
      expect(res.body.dados.cliente_nome).toBe('Cliente do MEI 1');
      expect(Array.isArray(res.body.dados.itens)).toBe(true);
      expect(res.body.dados.itens).toHaveLength(1);
    });

    test('deve retornar 404 para ID inexistente', async () => {
      const res = await request(app)
        .get('/api/orcamentos/999999')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('Alteração de Status (PATCH /api/orcamentos/:id/status)', () => {
    let orcamentoParaStatus = null;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/orcamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cliente_id: clienteUser1Id,
          itens: [{ quantidade: 1, preco_unitario: 200.00 }]
        });
      orcamentoParaStatus = res.body.dados;
    });

    test('deve atualizar status para ENVIADO (200)', async () => {
      const res = await request(app)
        .patch(`/api/orcamentos/${orcamentoParaStatus.id}/status`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ status: 'ENVIADO' });

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.status).toBe('ENVIADO');
    });

    test('deve atualizar status para APROVADO (200)', async () => {
      const res = await request(app)
        .patch(`/api/orcamentos/${orcamentoParaStatus.id}/status`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ status: 'APROVADO' });

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.status).toBe('APROVADO');
    });

    test('deve atualizar status para RECUSADO (200)', async () => {
      const res = await request(app)
        .patch(`/api/orcamentos/${orcamentoParaStatus.id}/status`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ status: 'RECUSADO' });

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.status).toBe('RECUSADO');
    });

    test('deve rejeitar status inválido (400)', async () => {
      const res = await request(app)
        .patch(`/api/orcamentos/${orcamentoParaStatus.id}/status`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ status: 'STATUS_INEXISTENTE' });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/status inválido/i);
    });
  });

  describe('Isolamento Multi-Tenant em Orçamentos', () => {
    let orcamentoUser1 = null;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/orcamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cliente_id: clienteUser1Id,
          itens: [{ quantidade: 1, preco_unitario: 500.00 }]
        });
      orcamentoUser1 = res.body.dados;
    });

    test('Usuário 2 não deve ver o orçamento do Usuário 1 na listagem', async () => {
      const res = await request(app)
        .get('/api/orcamentos')
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(200);
      const ids = res.body.dados.map(o => o.id);
      expect(ids).not.toContain(orcamentoUser1.id);
    });

    test('Usuário 2 não deve conseguir acessar por ID o orçamento do Usuário 1 (404)', async () => {
      const res = await request(app)
        .get(`/api/orcamentos/${orcamentoUser1.id}`)
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/orçamento não encontrado/i);
    });

    test('Usuário 2 não deve conseguir alterar o status do orçamento do Usuário 1 (404)', async () => {
      const res = await request(app)
        .patch(`/api/orcamentos/${orcamentoUser1.id}/status`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ status: 'APROVADO' });

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/orçamento não encontrado/i);
    });

    test('Usuário 2 não deve conseguir excluir o orçamento do Usuário 1 (404)', async () => {
      const res = await request(app)
        .delete(`/api/orcamentos/${orcamentoUser1.id}`)
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/orçamento não encontrado/i);
    });

    test('Usuário 1 deve conseguir excluir seu próprio orçamento (200)', async () => {
      const res = await request(app)
        .delete(`/api/orcamentos/${orcamentoUser1.id}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);

      // Confirmar que foi excluído
      const busca = await request(app)
        .get(`/api/orcamentos/${orcamentoUser1.id}`)
        .set('Authorization', `Bearer ${tokenUser1}`);
      expect(busca.statusCode).toBe(404);
    });
  });
});
