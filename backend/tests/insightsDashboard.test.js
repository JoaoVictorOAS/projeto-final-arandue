const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Módulo de Insights Proativos de IA & Lançamento de Comprovante', () => {
  let tokenUser = '';
  let userId = null;
  let clienteId = null;

  const user = {
    nome: 'MEI Insights Teste',
    email: 'insights.test@mei.com',
    senha: 'SenhaForte123@'
  };

  const limparDados = async () => {
    await pool.execute(`DELETE FROM movimentacoes WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = 'insights.test@mei.com')`);
    await pool.execute(`DELETE FROM cobrancas WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = 'insights.test@mei.com')`);
    await pool.execute(`DELETE FROM orcamentos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = 'insights.test@mei.com')`);
    await pool.execute(`DELETE FROM clientes WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = 'insights.test@mei.com')`);
    await pool.execute(`DELETE FROM usuarios WHERE email = 'insights.test@mei.com'`);
  };

  beforeAll(async () => {
    await limparDados();
    const res = await request(app).post('/api/auth/register').send(user);
    tokenUser = res.body.dados.token;
    userId = res.body.dados.id;

    const cliRes = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenUser}`)
      .send({ nome: 'Cliente Insights', email: 'cliinsights@email.com', telefone: '11999998888' });
    clienteId = cliRes.body.dados.id;

    const hoje = new Date().toISOString().slice(0, 10);
    await pool.execute(
      `INSERT INTO cobrancas (usuario_id, cliente_id, valor, vencimento, status)
       VALUES (?, ?, ?, ?, 'ATRASADO')`,
      [userId, clienteId, 600.00, hoje]
    );
  });

  afterAll(async () => {
    await limparDados();
    await pool.end();
  });

  test('GET /api/dashboard/insights deve retornar insights proativos estruturados', async () => {
    const res = await request(app)
      .get('/api/dashboard/insights')
      .set('Authorization', `Bearer ${tokenUser}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados).toHaveProperty('total_insights');
    expect(res.body.dados).toHaveProperty('resumo_saude');
    expect(res.body.dados).toHaveProperty('insights');
    expect(Array.isArray(res.body.dados.insights)).toBe(true);
    expect(res.body.dados.total_insights).toBeGreaterThan(0);

    const insightCobranca = res.body.dados.insights.find(i => i.id === 'cobrancas_vencidas');
    expect(insightCobranca).toBeDefined();
    expect(insightCobranca.severidade).toBe('critico');
    expect(insightCobranca.categoria).toBe('financeiro');
  });

  test('POST /api/assistente/imagem/lancar-comprovante deve lançar movimentação no Livro Caixa com sucesso', async () => {
    const hoje = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .post('/api/assistente/imagem/lancar-comprovante')
      .set('Authorization', `Bearer ${tokenUser}`)
      .send({
        valor: 150.75,
        tipo: 'SAIDA',
        categoria: 'Despesas de Insumos',
        descricao: 'Compra de material de limpeza',
        data_movimentacao: hoje
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados).toHaveProperty('id');
    expect(Number(res.body.dados.valor)).toBe(150.75);
    expect(res.body.dados.tipo).toBe('SAIDA');
    expect(res.body.dados.descricao).toBe('Compra de material de limpeza');
  });
});
