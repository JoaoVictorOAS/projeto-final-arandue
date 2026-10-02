const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Módulo de Dashboard API (/api/dashboard/resumo) - Métricas Agregadas & Multi-Tenancy', () => {
  let tokenUser1 = '';
  let tokenUser2 = '';
  let user1Id = null;
  let user2Id = null;

  let clienteUser1Id = null;
  let clienteUser2Id = null;
  let servicoUser1Id = null;

  const user1 = {
    nome: 'MEI Dashboard Um',
    email: 'dash.user1@mei.com',
    senha: 'SenhaForte123@'
  };

  const user2 = {
    nome: 'MEI Dashboard Dois',
    email: 'dash.user2@mei.com',
    senha: 'SenhaForte123@'
  };

  const limparDados = async () => {
    await pool.execute(`
      DELETE FROM movimentacoes 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('dash.user1@mei.com', 'dash.user2@mei.com'))
    `);
    await pool.execute(`
      DELETE FROM cobrancas 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('dash.user1@mei.com', 'dash.user2@mei.com'))
    `);
    await pool.execute(`
      DELETE FROM orcamento_itens 
      WHERE orcamento_id IN (SELECT id FROM orcamentos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('dash.user1@mei.com', 'dash.user2@mei.com')))
    `);
    await pool.execute(`
      DELETE FROM orcamentos 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('dash.user1@mei.com', 'dash.user2@mei.com'))
    `);
    await pool.execute(`
      DELETE FROM agendamentos 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('dash.user1@mei.com', 'dash.user2@mei.com'))
    `);
    await pool.execute(`
      DELETE FROM servicos 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('dash.user1@mei.com', 'dash.user2@mei.com'))
    `);
    await pool.execute(`
      DELETE FROM clientes 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('dash.user1@mei.com', 'dash.user2@mei.com'))
    `);
    await pool.execute(`
      DELETE FROM usuarios 
      WHERE email IN ('dash.user1@mei.com', 'dash.user2@mei.com')
    `);
  };

  beforeAll(async () => {
    await limparDados();

    // 1. Registro dos MEIs
    const res1 = await request(app).post('/api/auth/register').send(user1);
    tokenUser1 = res1.body.dados.token;
    user1Id = res1.body.dados.id;

    const res2 = await request(app).post('/api/auth/register').send(user2);
    tokenUser2 = res2.body.dados.token;
    user2Id = res2.body.dados.id;

    // 2. Clientes
    const cliRes1 = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ nome: 'Cliente Dash 1', email: 'dashcli1@email.com', telefone: '11977777777' });
    clienteUser1Id = cliRes1.body.dados.id;

    const cliRes2 = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenUser2}`)
      .send({ nome: 'Cliente Dash 2', email: 'dashcli2@email.com', telefone: '11988888888' });
    clienteUser2Id = cliRes2.body.dados.id;

    // 3. Serviço para MEI 1
    const srvRes1 = await request(app)
      .post('/api/servicos')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ nome: 'Consultoria Financeira MEI', preco: 250.00, categoria: 'Consultoria' });
    servicoUser1Id = srvRes1.body.dados.id;

    // Datas base para testes
    const hoje = new Date();
    const dataHojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dataAmanhaStr = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, '0')}-${String(amanha.getDate()).padStart(2, '0')}`;

    // 4. Orçamentos para MEI 1:
    // - 1 ENVIADO (pendente)
    await request(app)
      .post('/api/orcamentos')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({
        cliente_id: clienteUser1Id,
        status: 'ENVIADO',
        data_emissao: dataHojeStr,
        itens: [{ servico_id: servicoUser1Id, quantidade: 1, preco_unitario: 250.00 }]
      });

    // - 1 RASCUNHO (pendente)
    await request(app)
      .post('/api/orcamentos')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({
        cliente_id: clienteUser1Id,
        status: 'RASCUNHO',
        data_emissao: dataHojeStr,
        itens: [{ servico_id: servicoUser1Id, quantidade: 2, preco_unitario: 250.00 }]
      });

    // - 1 APROVADO (não deve contar como pendente)
    await request(app)
      .post('/api/orcamentos')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({
        cliente_id: clienteUser1Id,
        status: 'APROVADO',
        data_emissao: dataHojeStr,
        itens: [{ servico_id: servicoUser1Id, quantidade: 1, preco_unitario: 100.00 }]
      });

    // 5. Cobranças para MEI 1:
    // - 1 PENDENTE de 400.00
    await request(app)
      .post('/api/cobrancas')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({
        cliente_id: clienteUser1Id,
        valor: 400.00,
        vencimento: dataAmanhaStr,
        status: 'PENDENTE'
      });

    // - 1 ATRASADO de 250.00 (deve somar em a_receber_pendente)
    await pool.execute(
      `INSERT INTO cobrancas (usuario_id, cliente_id, valor, vencimento, status)
       VALUES (?, ?, ?, ?, 'ATRASADO')`,
      [user1Id, clienteUser1Id, 250.00, dataHojeStr]
    );

    // - 1 PAGO de 1000.00 (não deve somar em a_receber_pendente)
    await pool.execute(
      `INSERT INTO cobrancas (usuario_id, cliente_id, valor, vencimento, status, data_pagamento)
       VALUES (?, ?, ?, ?, 'PAGO', ?)`,
      [user1Id, clienteUser1Id, 1000.00, dataHojeStr, dataHojeStr]
    );

    // 6. Movimentações no mês corrente para MEI 1:
    // - Entrada de 1200.00
    await request(app)
      .post('/api/movimentacoes')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({
        tipo: 'ENTRADA',
        categoria: 'Serviço',
        valor: 1200.00,
        data_movimentacao: dataHojeStr,
        descricao: 'Pagamento recebido'
      });

    // - Saída de 300.00
    await request(app)
      .post('/api/movimentacoes')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({
        tipo: 'SAIDA',
        categoria: 'Despesas Gerais',
        valor: 300.00,
        data_movimentacao: dataHojeStr,
        descricao: 'Material de escritório'
      });

    // 7. Agendamentos para MEI 1:
    // - Agendamento para hoje no final do dia (status CONFIRMADO)
    await pool.execute(
      `INSERT INTO agendamentos (usuario_id, cliente_id, servico_id, data_hora, status)
       VALUES (?, ?, ?, ?, 'CONFIRMADO')`,
      [user1Id, clienteUser1Id, servicoUser1Id, `${dataHojeStr} 23:50:00`]
    );

    // - Agendamento para hoje CANCELADO (não deve contar)
    await pool.execute(
      `INSERT INTO agendamentos (usuario_id, cliente_id, servico_id, data_hora, status)
       VALUES (?, ?, ?, ?, 'CANCELADO')`,
      [user1Id, clienteUser1Id, servicoUser1Id, `${dataHojeStr} 23:55:00`]
    );

    // - Agendamento para amanhã (status CONFIRMADO)
    await pool.execute(
      `INSERT INTO agendamentos (usuario_id, cliente_id, servico_id, data_hora, status)
       VALUES (?, ?, ?, ?, 'CONFIRMADO')`,
      [user1Id, clienteUser1Id, servicoUser1Id, `${dataAmanhaStr} 14:00:00`]
    );

    // 8. Dados específicos para MEI 2 (para testar multi-tenancy):
    // - Entrada de 75.00
    await request(app)
      .post('/api/movimentacoes')
      .set('Authorization', `Bearer ${tokenUser2}`)
      .send({
        tipo: 'ENTRADA',
        categoria: 'Venda',
        valor: 75.00,
        data_movimentacao: dataHojeStr,
        descricao: 'Venda MEI 2'
      });

    // - Cobrança pendente de 80.00
    await request(app)
      .post('/api/cobrancas')
      .set('Authorization', `Bearer ${tokenUser2}`)
      .send({
        cliente_id: clienteUser2Id,
        valor: 80.00,
        vencimento: dataAmanhaStr,
        status: 'PENDENTE'
      });
  });

  afterAll(async () => {
    await limparDados();
    await pool.end();
  });

  describe('Proteção das rotas com AuthMiddleware', () => {
    test('deve negar acesso ao dashboard sem token (401)', async () => {
      const res = await request(app).get('/api/dashboard/resumo');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });

    test('deve negar acesso com token inválido (401)', async () => {
      const res = await request(app)
        .get('/api/dashboard/resumo')
        .set('Authorization', 'Bearer token_invalido_dashboard');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('Retorno e Estrutura Consolidada de Métricas (GET /api/dashboard/resumo)', () => {
    test('deve retornar estrutura completa com propriedades financeiro e operacional para o MEI 1', async () => {
      const res = await request(app)
        .get('/api/dashboard/resumo')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toBeDefined();

      const { financeiro, operacional } = res.body.dados;
      expect(financeiro).toBeDefined();
      expect(operacional).toBeDefined();

      // Métricas Financeiras
      expect(Number(financeiro.entradas_mes)).toBe(1200.00);
      expect(Number(financeiro.saidas_mes)).toBe(300.00);
      expect(Number(financeiro.saldo_mes)).toBe(900.00);
      // a_receber_pendente = 400 (pendente) + 250 (atrasado) = 650.00
      expect(Number(financeiro.a_receber_pendente)).toBe(650.00);

      // Métricas Operacionais
      expect(operacional.total_clientes).toBe(1);
      // orcamentos_pendentes = 2 (ENVIADO e RASCUNHO, excluindo o APROVADO)
      expect(operacional.orcamentos_pendentes).toBe(2);
      // agendamentos_hoje = 1 (desconsiderando o cancelado)
      expect(operacional.agendamentos_hoje).toBe(1);

      // proximos_agendamentos deve conter os agendamentos futuros não-cancelados
      expect(Array.isArray(operacional.proximos_agendamentos)).toBe(true);
      expect(operacional.proximos_agendamentos.length).toBeGreaterThanOrEqual(1);

      const primeiroAgendamento = operacional.proximos_agendamentos[0];
      expect(primeiroAgendamento).toHaveProperty('id');
      expect(primeiroAgendamento).toHaveProperty('cliente_nome', 'Cliente Dash 1');
      expect(primeiroAgendamento).toHaveProperty('servico_nome', 'Consultoria Financeira MEI');
      expect(primeiroAgendamento.status).not.toBe('CANCELADO');
    });

    test('GET /api/dashboard também deve responder como alias da rota resumo', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toHaveProperty('financeiro');
      expect(res.body.dados).toHaveProperty('operacional');
    });
  });

  describe('Isolamento Multi-Tenant do Dashboard', () => {
    test('MEI 2 deve receber exclusivamente suas próprias métricas agregadas', async () => {
      const res = await request(app)
        .get('/api/dashboard/resumo')
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);

      const { financeiro, operacional } = res.body.dados;

      // MEI 2 teve 75.00 de entrada e 0.00 de saída
      expect(Number(financeiro.entradas_mes)).toBe(75.00);
      expect(Number(financeiro.saidas_mes)).toBe(0.00);
      expect(Number(financeiro.saldo_mes)).toBe(75.00);
      expect(Number(financeiro.a_receber_pendente)).toBe(80.00);

      // MEI 2 tem 1 cliente e nenhum agendamento ou orçamento
      expect(operacional.total_clientes).toBe(1);
      expect(operacional.orcamentos_pendentes).toBe(0);
      expect(operacional.agendamentos_hoje).toBe(0);
      expect(operacional.proximos_agendamentos).toEqual([]);
    });
  });
});
