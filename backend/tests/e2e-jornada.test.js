const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Jornada de Ponta a Ponta do Microempreendedor (E2E)', () => {
  const EMAIL_TESTE = 'jornada.completa@mei.com';

  const limparDados = async () => {
    await pool.execute(`
      DELETE FROM movimentacoes 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ?)
    `, [EMAIL_TESTE]);

    await pool.execute(`
      DELETE FROM cobrancas 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ?)
    `, [EMAIL_TESTE]);

    await pool.execute(`
      DELETE FROM agendamentos 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ?)
    `, [EMAIL_TESTE]);

    await pool.execute(`
      DELETE FROM orcamento_itens 
      WHERE orcamento_id IN (
        SELECT id FROM orcamentos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ?)
      )
    `, [EMAIL_TESTE]);

    await pool.execute(`
      DELETE FROM orcamentos 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ?)
    `, [EMAIL_TESTE]);

    await pool.execute(`
      DELETE FROM servicos 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ?)
    `, [EMAIL_TESTE]);

    await pool.execute(`
      DELETE FROM clientes 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ?)
    `, [EMAIL_TESTE]);

    await pool.execute(`
      DELETE FROM usuarios 
      WHERE email = ?
    `, [EMAIL_TESTE]);
  };

  beforeAll(async () => {
    await limparDados();
  });

  afterAll(async () => {
    await limparDados();
    await pool.end();
  });

  test('Executa o fluxo completo do negócio sem intervenção manual no banco', async () => {
    // 1. Cadastro de novo MEI e obtenção do token JWT
    const auth = await request(app).post('/api/auth/register').send({
      nome: 'MEI E2E Jornada',
      email: EMAIL_TESTE,
      senha: 'SenhaForte123'
    });
    expect(auth.statusCode).toBe(201);
    expect(auth.body.sucesso).toBe(true);
    const token = auth.body.dados.token;
    expect(token).toBeDefined();

    // 2. Cadastra Cliente
    const cli = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Cliente Jornada Completa',
        telefone: '11999990000',
        email: 'cliente.jornada@teste.com',
        endereco: 'Rua das Flores, 123'
      });
    expect(cli.statusCode).toBe(201);
    expect(cli.body.sucesso).toBe(true);
    const clienteId = cli.body.dados.id;
    expect(clienteId).toBeDefined();

    // 3. Cadastra Serviço
    const srv = await request(app)
      .post('/api/servicos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Instalação Elétrica Geral',
        descricao: 'Instalação de quadro e tomadas',
        preco: 300.00,
        categoria: 'Elétrica'
      });
    expect(srv.statusCode).toBe(201);
    expect(srv.body.sucesso).toBe(true);
    const servicoId = srv.body.dados.id;
    expect(servicoId).toBeDefined();

    // 4. Cria Orçamento com item e desconto
    const orc = await request(app)
      .post('/api/orcamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cliente_id: clienteId,
        data_emissao: '2026-10-02',
        validade: '2026-10-15',
        desconto: 50.00,
        observacoes: 'Orçamento com desconto para cliente fiel',
        itens: [
          { servico_id: servicoId, quantidade: 1, preco_unitario: 300.00 }
        ]
      });
    expect(orc.statusCode).toBe(201);
    expect(orc.body.sucesso).toBe(true);
    expect(Number(orc.body.dados.subtotal)).toBe(300.00);
    expect(Number(orc.body.dados.desconto)).toBe(50.00);
    expect(Number(orc.body.dados.total)).toBe(250.00);
    const orcamentoId = orc.body.dados.id;

    // 5. Atualiza status do orçamento para APROVADO
    const orcAprov = await request(app)
      .patch(`/api/orcamentos/${orcamentoId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'APROVADO' });
    expect(orcAprov.statusCode).toBe(200);
    expect(orcAprov.body.dados.status).toBe('APROVADO');

    // 6. Cria Agendamento
    const agd = await request(app)
      .post('/api/agendamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cliente_id: clienteId,
        servico_id: servicoId,
        data_hora: '2026-10-05T15:00:00',
        observacoes: 'Execução do serviço aprovado'
      });
    expect(agd.statusCode).toBe(201);
    expect(agd.body.sucesso).toBe(true);

    // 7. Verifica prevenção anti-choque de horário (409 Conflict)
    const conflito = await request(app)
      .post('/api/agendamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cliente_id: clienteId,
        data_hora: '2026-10-05T15:00:00',
        observacoes: 'Horário duplicado'
      });
    expect(conflito.statusCode).toBe(409);

    // 8. Emite Cobrança a partir do orçamento aprovado
    const cob = await request(app)
      .post('/api/cobrancas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cliente_id: clienteId,
        orcamento_id: orcamentoId,
        valor: 250.00,
        vencimento: '2026-10-15',
        observacoes: 'Fatura ref. orçamento aprovado'
      });
    expect(cob.statusCode).toBe(201);
    expect(cob.body.sucesso).toBe(true);
    expect(cob.body.dados.status).toBe('PENDENTE');
    const cobrancaId = cob.body.dados.id;

    // 9. Dá baixa na Cobrança (PAGO) com baixa automática no Caixa
    const bx = await request(app)
      .patch(`/api/cobrancas/${cobrancaId}/pagar`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        data_pagamento: '2026-10-05',
        gerar_movimentacao_caixa: true
      });
    expect(bx.statusCode).toBe(200);
    expect(bx.body.sucesso).toBe(true);
    expect(bx.body.dados.status).toBe('PAGO');

    // 10. Verifica se a movimentação de ENTRADA foi registrada no Livro Caixa
    const caixa = await request(app)
      .get('/api/movimentacoes')
      .set('Authorization', `Bearer ${token}`);
    expect(caixa.statusCode).toBe(200);
    const entrada = caixa.body.dados.find((m) => m.cobranca_id === cobrancaId);
    expect(entrada).toBeDefined();
    expect(entrada.tipo).toBe('ENTRADA');
    expect(Number(entrada.valor)).toBe(250.00);

    // 11. Registra uma despesa operacional avulsa no Livro Caixa (SAIDA)
    const desp = await request(app)
      .post('/api/movimentacoes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipo: 'SAIDA',
        categoria: 'DAS-MEI',
        valor: 75.00,
        data_movimentacao: '2026-10-05',
        descricao: 'Pagamento da guia mensal DAS do MEI'
      });
    expect(desp.statusCode).toBe(201);

    // 12. Confere atualização consolidada no Dashboard
    const dash = await request(app)
      .get('/api/dashboard/resumo')
      .set('Authorization', `Bearer ${token}`);
    expect(dash.statusCode).toBe(200);
    expect(dash.body.sucesso).toBe(true);
    const { financeiro, operacional } = dash.body.dados;

    expect(Number(financeiro.entradas_mes)).toBeGreaterThanOrEqual(250.00);
    expect(Number(financeiro.saidas_mes)).toBeGreaterThanOrEqual(75.00);
    expect(Number(financeiro.saldo_mes)).toBeGreaterThanOrEqual(175.00);
    expect(operacional.total_clientes).toBeGreaterThanOrEqual(1);
  });
});
