const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Módulo Fiscal - Obrigações MEI (DASN-SIMEI e Guia DAS)', () => {
  let token = '';
  let usuarioId = null;

  const testUser = {
    nome: 'MEI Obrigações Teste',
    email: 'obrigacoes.mei@teste.com',
    senha: 'SenhaForte123@'
  };

  beforeAll(async () => {
    // Limpeza prévia
    await pool.execute(
      `DELETE FROM nota_fiscal_itens WHERE nota_fiscal_id IN (
        SELECT id FROM notas_fiscais WHERE usuario_id IN (
          SELECT id FROM usuarios WHERE email = ?
        )
      )`,
      [testUser.email]
    );
    await pool.execute(
      `DELETE FROM notas_fiscais WHERE usuario_id IN (
        SELECT id FROM usuarios WHERE email = ?
      )`,
      [testUser.email]
    );
    await pool.execute(
      `DELETE FROM movimentacoes WHERE usuario_id IN (
        SELECT id FROM usuarios WHERE email = ?
      )`,
      [testUser.email]
    );
    await pool.execute(
      `DELETE FROM usuarios WHERE email = ?`,
      [testUser.email]
    );

    const res = await request(app).post('/api/auth/register').send(testUser);
    token = res.body.dados.token;
    usuarioId = res.body.dados.id;
  });

  afterAll(async () => {
    await pool.execute(
      `DELETE FROM nota_fiscal_itens WHERE nota_fiscal_id IN (
        SELECT id FROM notas_fiscais WHERE usuario_id IN (
          SELECT id FROM usuarios WHERE email = ?
        )
      )`,
      [testUser.email]
    );
    await pool.execute(
      `DELETE FROM notas_fiscais WHERE usuario_id IN (
        SELECT id FROM usuarios WHERE email = ?
      )`,
      [testUser.email]
    );
    await pool.execute(
      `DELETE FROM movimentacoes WHERE usuario_id IN (
        SELECT id FROM usuarios WHERE email = ?
      )`,
      [testUser.email]
    );
    await pool.execute(
      `DELETE FROM usuarios WHERE email = ?`,
      [testUser.email]
    );
  });

  test('GET /api/notas-fiscais/relatorio-receitas deve retornar a estrutura de receitas brutas do MEI', async () => {
    // Emitir uma NFS-e para gerar receita de serviços com todos os campos obrigatórios
    await request(app)
      .post('/api/notas-fiscais/nfse')
      .set('Authorization', `Bearer ${token}`)
      .send({
        destinatario_nome: 'Tomador Servico Teste',
        destinatario_documento: '12345678000195',
        destinatario_email: 'cliente@servico.com',
        discriminacao_servico: 'Consultoria técnica',
        valor: 2500.00
      });

    const res = await request(app)
      .get('/api/notas-fiscais/relatorio-receitas')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados).toBeDefined();
    expect(res.body.dados.servicos_com_nota).toBe(2500.00);
    expect(res.body.dados.total_receita_bruta).toBe(2500.00);
    expect(res.body.dados.limite_anual_mei).toBe(81000.00);
    expect(res.body.dados.alerta_limite).toBe('NORMAL');
  });

  test('GET /api/notas-fiscais/das deve listar as 12 competências das Guias DAS', async () => {
    const res = await request(app)
      .get('/api/notas-fiscais/das')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.guias).toHaveLength(12);
    expect(res.body.dados.resumo).toBeDefined();
    expect(res.body.dados.resumo.total_pago).toBe(0);
  });

  test('POST /api/notas-fiscais/das/pagar deve registrar o pagamento da Guia DAS', async () => {
    const payload = {
      mes: 3,
      ano: new Date().getFullYear(),
      valor: 81.90,
      data_pagamento: '2026-04-20'
    };

    const res = await request(app)
      .post('/api/notas-fiscais/das/pagar')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.id).toBeDefined();
    expect(res.body.dados.competencia).toBe('03/' + new Date().getFullYear());

    // Verificar se agora consta como pago
    const resList = await request(app)
      .get('/api/notas-fiscais/das')
      .set('Authorization', `Bearer ${token}`);

    expect(resList.statusCode).toBe(200);
    const guiaMarco = resList.body.dados.guias.find(g => g.mes === 3);
    expect(guiaMarco.status).toBe('PAGO');
    expect(resList.body.dados.resumo.total_pago).toBe(81.90);
  });
});
