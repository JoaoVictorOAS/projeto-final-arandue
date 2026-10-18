const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Módulo de Assinaturas e Serviços Recorrentes (/api/servicos/assinaturas)', () => {
  let tokenUser1 = '';
  let tokenUser2 = '';
  let user1Id = null;
  let user2Id = null;

  let cliente1User1 = null;
  let cliente2User2 = null;

  let servicoRecorrenteUser1 = null;
  let servicoPontualUser1 = null;
  let servicoUser2 = null;

  const user1 = {
    nome: 'MEI Assinatura Um',
    email: 'assinatura.user1@mei.com',
    senha: 'SenhaForte123@'
  };

  const user2 = {
    nome: 'MEI Assinatura Dois',
    email: 'assinatura.user2@mei.com',
    senha: 'SenhaForte123@'
  };

  beforeAll(async () => {
    // Limpeza prévia
    await pool.execute("DELETE FROM cobrancas WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('assinatura.user1@mei.com', 'assinatura.user2@mei.com'))");
    await pool.execute("DELETE FROM assinaturas WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('assinatura.user1@mei.com', 'assinatura.user2@mei.com'))");
    await pool.execute("DELETE FROM servicos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('assinatura.user1@mei.com', 'assinatura.user2@mei.com'))");
    await pool.execute("DELETE FROM clientes WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('assinatura.user1@mei.com', 'assinatura.user2@mei.com'))");
    await pool.execute("DELETE FROM usuarios WHERE email IN ('assinatura.user1@mei.com', 'assinatura.user2@mei.com')");

    // Registro User 1
    const res1 = await request(app).post('/api/auth/register').send(user1);
    tokenUser1 = res1.body.dados.token;
    user1Id = res1.body.dados.id;

    // Registro User 2
    const res2 = await request(app).post('/api/auth/register').send(user2);
    tokenUser2 = res2.body.dados.token;
    user2Id = res2.body.dados.id;

    // Clientes
    const c1 = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ nome: 'Cliente Recorrente 1', email: 'cli1@teste.com', telefone: '11988887777' });
    cliente1User1 = c1.body.dados;

    const c2 = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenUser2}`)
      .send({ nome: 'Cliente Recorrente 2', email: 'cli2@teste.com', telefone: '11977776666' });
    cliente2User2 = c2.body.dados;

    // Serviços User 1
    const s1 = await request(app)
      .post('/api/servicos')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({
        nome: 'Manutenção Mensal Recorrente',
        preco: 200.00,
        categoria: 'Manutenção',
        recorrente: true,
        periodicidade: 'MENSAL',
        dia_vencimento_padrao: 15
      });
    servicoRecorrenteUser1 = s1.body.dados;

    const s2 = await request(app)
      .post('/api/servicos')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({
        nome: 'Formatação Avulsa',
        preco: 100.00,
        categoria: 'Geral',
        recorrente: false
      });
    servicoPontualUser1 = s2.body.dados;

    // Serviço User 2
    const s3 = await request(app)
      .post('/api/servicos')
      .set('Authorization', `Bearer ${tokenUser2}`)
      .send({
        nome: 'Consultoria User 2',
        preco: 500.00,
        categoria: 'Consultoria',
        recorrente: true,
        periodicidade: 'MENSAL',
        dia_vencimento_padrao: 5
      });
    servicoUser2 = s3.body.dados;
  });

  afterAll(async () => {
    await pool.execute("DELETE FROM cobrancas WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('assinatura.user1@mei.com', 'assinatura.user2@mei.com'))");
    await pool.execute("DELETE FROM assinaturas WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('assinatura.user1@mei.com', 'assinatura.user2@mei.com'))");
    await pool.execute("DELETE FROM servicos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('assinatura.user1@mei.com', 'assinatura.user2@mei.com'))");
    await pool.execute("DELETE FROM clientes WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('assinatura.user1@mei.com', 'assinatura.user2@mei.com'))");
    await pool.execute("DELETE FROM usuarios WHERE email IN ('assinatura.user1@mei.com', 'assinatura.user2@mei.com')");
    await pool.end();
  });

  describe('Criação e Listagem de Serviços com Atributos Recorrentes', () => {
    test('deve persistir corretamente campos de recorrência ao criar serviço', () => {
      expect(servicoRecorrenteUser1.recorrente).toBe(1);
      expect(servicoRecorrenteUser1.periodicidade).toBe('MENSAL');
      expect(servicoRecorrenteUser1.dia_vencimento_padrao).toBe(15);

      expect(servicoPontualUser1.recorrente).toBe(0);
      expect(servicoPontualUser1.periodicidade).toBeNull();
    });

    test('deve filtrar serviços pelo parâmetro ?recorrente=true', async () => {
      const res = await request(app)
        .get('/api/servicos?recorrente=true')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.every(s => s.recorrente === 1)).toBe(true);
      expect(res.body.dados.some(s => s.id === servicoRecorrenteUser1.id)).toBe(true);
      expect(res.body.dados.some(s => s.id === servicoPontualUser1.id)).toBe(false);
    });
  });

  describe('CRUD de Assinaturas Recorrentes', () => {
    let assinaturaCriadaId = null;

    test('deve validar obrigatoriedade de cliente_id e servico_id', async () => {
      const res = await request(app)
        .post('/api/servicos/assinaturas')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
    });

    test('deve herdar preço, periodicidade e dia de vencimento do serviço quando omitidos', async () => {
      const res = await request(app)
        .post('/api/servicos/assinaturas')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cliente_id: cliente1User1.id,
          servico_id: servicoRecorrenteUser1.id,
          data_inicio: '2026-10-01'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.sucesso).toBe(true);
      const ass = res.body.dados;
      assinaturaCriadaId = ass.id;

      expect(Number(ass.valor)).toBe(200.00);
      expect(ass.periodicidade).toBe('MENSAL');
      expect(ass.dia_vencimento).toBe(15);
      expect(ass.status).toBe('ATIVA');
      expect(ass.cliente_nome).toBe('Cliente Recorrente 1');
      expect(ass.servico_nome).toBe('Manutenção Mensal Recorrente');
      expect(ass.proximo_vencimento).toBeDefined();
    });

    test('deve listar assinaturas com resumo de MRR e status', async () => {
      const res = await request(app)
        .get('/api/servicos/assinaturas')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(Array.isArray(res.body.dados)).toBe(true);
      expect(res.body.dados.length).toBeGreaterThanOrEqual(1);

      expect(res.body.resumo).toBeDefined();
      expect(res.body.resumo.total_ativas).toBeGreaterThanOrEqual(1);
      expect(res.body.resumo.mrr).toBeGreaterThanOrEqual(200.00);
    });

    test('deve alterar status da assinatura para PAUSADA e depois reativar', async () => {
      const resPausa = await request(app)
        .patch(`/api/servicos/assinaturas/${assinaturaCriadaId}/status`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ status: 'PAUSADA' });

      expect(resPausa.statusCode).toBe(200);
      expect(resPausa.body.dados.status).toBe('PAUSADA');

      const resAtiva = await request(app)
        .patch(`/api/servicos/assinaturas/${assinaturaCriadaId}/status`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ status: 'ATIVA' });

      expect(resAtiva.statusCode).toBe(200);
      expect(resAtiva.body.dados.status).toBe('ATIVA');
    });

    test('deve gerar cobrança e avançar o proximo_vencimento para o próximo ciclo', async () => {
      const antes = await request(app)
        .get(`/api/servicos/assinaturas/${assinaturaCriadaId}`)
        .set('Authorization', `Bearer ${tokenUser1}`);
      const vencimentoAnterior = antes.body.dados.proximo_vencimento;

      const res = await request(app)
        .post(`/api/servicos/assinaturas/${assinaturaCriadaId}/gerar-cobranca`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({});

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.cobranca).toBeDefined();
      expect(Number(res.body.dados.cobranca.valor)).toBe(200.00);
      expect(res.body.dados.proximo_vencimento).not.toBe(vencimentoAnterior);

      // Verifica se a cobrança foi criada no banco
      const [cobs] = await pool.execute('SELECT * FROM cobrancas WHERE id = ?', [res.body.dados.cobranca.id]);
      expect(cobs.length).toBe(1);
      expect(cobs[0].usuario_id).toBe(user1Id);
      expect(cobs[0].cliente_id).toBe(cliente1User1.id);
    });

    test('não deve permitir gerar cobrança para assinatura cancelada', async () => {
      await request(app)
        .patch(`/api/servicos/assinaturas/${assinaturaCriadaId}/status`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ status: 'CANCELADA' });

      const res = await request(app)
        .post(`/api/servicos/assinaturas/${assinaturaCriadaId}/gerar-cobranca`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/cancelada/i);
    });
  });

  describe('Isolamento Multi-Tenant Rigoroso de Assinaturas', () => {
    let assUser1Id = null;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/servicos/assinaturas')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cliente_id: cliente1User1.id,
          servico_id: servicoRecorrenteUser1.id,
          valor: 350.00,
          periodicidade: 'MENSAL',
          dia_vencimento: 20
        });
      assUser1Id = res.body.dados.id;
    });

    test('Usuário 2 NÃO deve ver as assinaturas do Usuário 1', async () => {
      const res = await request(app)
        .get('/api/servicos/assinaturas')
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.dados.some(a => a.id === assUser1Id)).toBe(false);
    });

    test('Usuário 2 NÃO deve conseguir buscar por ID a assinatura do Usuário 1', async () => {
      const res = await request(app)
        .get(`/api/servicos/assinaturas/${assUser1Id}`)
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });

    test('Usuário 2 NÃO deve conseguir gerar cobrança para assinatura do Usuário 1', async () => {
      const res = await request(app)
        .post(`/api/servicos/assinaturas/${assUser1Id}/gerar-cobranca`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({});

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });

    test('Usuário 2 NÃO deve conseguir criar assinatura usando cliente do Usuário 1', async () => {
      const res = await request(app)
        .post('/api/servicos/assinaturas')
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({
          cliente_id: cliente1User1.id, // cliente do User 1
          servico_id: servicoUser2.id
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/cliente não encontrado/i);
    });

    test('Usuário 2 NÃO deve conseguir criar assinatura usando serviço do Usuário 1', async () => {
      const res = await request(app)
        .post('/api/servicos/assinaturas')
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({
          cliente_id: cliente2User2.id,
          servico_id: servicoRecorrenteUser1.id // serviço do User 1
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/serviço não encontrado/i);
    });
  });
});
