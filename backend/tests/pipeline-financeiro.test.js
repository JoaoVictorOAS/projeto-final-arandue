const pool = require('../src/config/database');
const orcamentoService = require('../src/services/orcamentoService');
const agendamentoService = require('../src/services/agendamentoService');
const cobrancaService = require('../src/services/cobrancaService');
const bcrypt = require('bcryptjs');

describe('Pipeline Financeiro Integrado: Orçamento -> Agendamento -> Cobrança -> Caixa (TDD)', () => {
  const EMAIL_USER1 = 'pipeline.mei1@test.com';
  const EMAIL_USER2 = 'pipeline.mei2@test.com';

  let user1Id;
  let user2Id;
  let cliente1Id;
  let cliente2Id;
  let servico1Id;

  const limparDados = async () => {
    await pool.execute(`
      DELETE FROM movimentacoes 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN (?, ?))
    `, [EMAIL_USER1, EMAIL_USER2]);

    await pool.execute(`
      DELETE FROM cobrancas 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN (?, ?))
    `, [EMAIL_USER1, EMAIL_USER2]);

    await pool.execute(`
      DELETE FROM agendamentos 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN (?, ?))
    `, [EMAIL_USER1, EMAIL_USER2]);

    await pool.execute(`
      DELETE FROM orcamento_itens 
      WHERE orcamento_id IN (
        SELECT id FROM orcamentos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN (?, ?))
      )
    `, [EMAIL_USER1, EMAIL_USER2]);

    await pool.execute(`
      DELETE FROM orcamentos 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN (?, ?))
    `, [EMAIL_USER1, EMAIL_USER2]);

    await pool.execute(`
      DELETE FROM servicos 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN (?, ?))
    `, [EMAIL_USER1, EMAIL_USER2]);

    await pool.execute(`
      DELETE FROM clientes 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN (?, ?))
    `, [EMAIL_USER1, EMAIL_USER2]);

    await pool.execute(`
      DELETE FROM usuarios 
      WHERE email IN (?, ?)
    `, [EMAIL_USER1, EMAIL_USER2]);
  };

  beforeAll(async () => {
    await limparDados();

    const senhaHash = await bcrypt.hash('SenhaForte123@', 10);

    // Criar Usuário 1
    const [u1] = await pool.execute(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['MEI Pipeline Um', EMAIL_USER1, senhaHash]
    );
    user1Id = u1.insertId;

    // Criar Usuário 2
    const [u2] = await pool.execute(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['MEI Pipeline Dois', EMAIL_USER2, senhaHash]
    );
    user2Id = u2.insertId;

    // Criar Cliente para Usuário 1
    const [c1] = await pool.execute(
      'INSERT INTO clientes (usuario_id, nome, email, telefone) VALUES (?, ?, ?, ?)',
      [user1Id, 'Cliente Pipeline MEI 1', 'cli1@pipeline.com', '11988887777']
    );
    cliente1Id = c1.insertId;

    // Criar Cliente para Usuário 2
    const [c2] = await pool.execute(
      'INSERT INTO clientes (usuario_id, nome, email, telefone) VALUES (?, ?, ?, ?)',
      [user2Id, 'Cliente Pipeline MEI 2', 'cli2@pipeline.com', '11977776666']
    );
    cliente2Id = c2.insertId;

    // Criar Serviço para Usuário 1
    const [s1] = await pool.execute(
      'INSERT INTO servicos (usuario_id, nome, preco, categoria) VALUES (?, ?, ?, ?)',
      [user1Id, 'Manutenção Especializada', 300.00, 'Elétrica']
    );
    servico1Id = s1.insertId;
  });

  afterAll(async () => {
    await limparDados();
    await pool.end();
  });

  let orcamentoAprovadoId;
  let orcamentoRascunhoId;
  let agendamentoId;
  let cobrancaId;

  // 1. Criação do Orçamento ➔ Mudança de status para APROVADO
  test('1. Cria orçamento com item e calcula subtotal/desconto/total, depois aprova', async () => {
    const orc = await orcamentoService.criar({
      usuario_id: user1Id,
      cliente_id: cliente1Id,
      data_emissao: '2026-10-02',
      validade: '2026-10-15',
      desconto: 50.00,
      observacoes: 'Orçamento com desconto para fidelidade',
      itens: [
        { servico_id: servico1Id, quantidade: 1, preco_unitario: 300.00 }
      ]
    });

    expect(orc).toBeDefined();
    expect(orc.id).toBeDefined();
    expect(orc.status).toBe('RASCUNHO');
    expect(Number(orc.subtotal)).toBe(300.00);
    expect(Number(orc.desconto)).toBe(50.00);
    expect(Number(orc.total)).toBe(250.00);

    orcamentoAprovadoId = orc.id;

    // Muda status para APROVADO
    const orcAprovado = await orcamentoService.atualizarStatus(orcamentoAprovadoId, user1Id, 'APROVADO');
    expect(orcAprovado.status).toBe('APROVADO');

    // Cria outro orçamento que ficará em RASCUNHO
    const orcRascunho = await orcamentoService.criar({
      usuario_id: user1Id,
      cliente_id: cliente1Id,
      data_emissao: '2026-10-02',
      validade: '2026-10-15',
      desconto: 0,
      itens: [
        { servico_id: servico1Id, quantidade: 1, preco_unitario: 300.00 }
      ]
    });
    orcamentoRascunhoId = orcRascunho.id;
  });

  // 2. Bloqueio de agendamento em orçamento não-aprovado ou ausente
  test('2. Bloqueia agendamento sem orcamento_id ou com orçamento não-aprovado (status != APROVADO)', async () => {
    // Sem orcamento_id
    await expect(agendamentoService.criar({
      usuario_id: user1Id,
      cliente_id: cliente1Id,
      data_hora: '2026-10-05 10:00:00'
    })).rejects.toThrow('Todo agendamento deve ser vinculado a um orçamento aprovado.');

    // Com orçamento em RASCUNHO
    await expect(agendamentoService.criar({
      usuario_id: user1Id,
      orcamento_id: orcamentoRascunhoId,
      data_hora: '2026-10-05 10:00:00'
    })).rejects.toThrow('Apenas orçamentos com status APROVADO podem ser agendados.');
  });

  // 3. Agendamento com sucesso vinculado ao orcamento_id e prevenção de duplicidade
  test('3. Cria agendamento vinculado ao orcamento_id aprovado com herança de cliente/servico', async () => {
    const agendamento = await agendamentoService.criar({
      usuario_id: user1Id,
      orcamento_id: orcamentoAprovadoId,
      data_hora: '2026-10-05 10:00:00',
      observacoes: 'Atendimento agendado para o orçamento aprovado'
    });

    expect(agendamento).toBeDefined();
    expect(agendamento.id).toBeDefined();
    expect(agendamento.orcamento_id).toBe(orcamentoAprovadoId);
    expect(agendamento.cliente_id).toBe(cliente1Id);
    expect(agendamento.status).toBe('PENDENTE');

    agendamentoId = agendamento.id;

    // Tentativa de duplicar agendamento para o mesmo orçamento aprovado ativo
    await expect(agendamentoService.criar({
      usuario_id: user1Id,
      orcamento_id: orcamentoAprovadoId,
      data_hora: '2026-10-06 14:00:00'
    })).rejects.toThrow('Já existe um agendamento ativo para este orçamento.');
  });

  // 4. Bloqueio de cobrança em agendamento não-concluído ou sem agendamento_id
  test('4. Bloqueia cobrança sem agendamento_id ou com agendamento não-concluído', async () => {
    // Sem agendamento_id
    await expect(cobrancaService.criar({
      usuario_id: user1Id,
      vencimento: '2026-10-20'
    })).rejects.toThrow('Toda cobrança deve ser vinculada a um atendimento concluído.');

    // Agendamento ainda está PENDENTE
    await expect(cobrancaService.criar({
      usuario_id: user1Id,
      agendamento_id: agendamentoId,
      vencimento: '2026-10-20'
    })).rejects.toThrow('Cobranças só podem ser emitidas para atendimentos concluídos.');
  });

  // 5. Conclusão do agendamento ➔ Emissão da Cobrança com trava de valor ao orçamento
  test('5. Conclui agendamento e emite cobrança herdando valor e vínculos do orçamento', async () => {
    // Conclui agendamento
    const agConcluido = await agendamentoService.atualizarStatus(agendamentoId, user1Id, 'CONCLUIDO');
    expect(agConcluido.status).toBe('CONCLUIDO');

    // Emite cobrança
    const cobranca = await cobrancaService.criar({
      usuario_id: user1Id,
      agendamento_id: agendamentoId,
      vencimento: '2026-10-20',
      observacoes: 'Cobrança do serviço executado'
    });

    expect(cobranca).toBeDefined();
    expect(cobranca.id).toBeDefined();
    expect(cobranca.agendamento_id).toBe(agendamentoId);
    expect(cobranca.orcamento_id).toBe(orcamentoAprovadoId);
    expect(cobranca.cliente_id).toBe(cliente1Id);
    expect(Number(cobranca.valor)).toBe(250.00); // Travado no total do orçamento aprovado!
    expect(cobranca.status).toBe('PENDENTE');

    cobrancaId = cobranca.id;

    // Prevenção de duplicidade: não permite emitir segunda cobrança para o mesmo atendimento
    await expect(cobrancaService.criar({
      usuario_id: user1Id,
      agendamento_id: agendamentoId,
      vencimento: '2026-10-25'
    })).rejects.toThrow('Já existe uma cobrança emitida para este atendimento.');
  });

  // 6. Liquidação (darBaixa) gerando lançamento no Livro Caixa com vínculo
  test('6. Dá baixa na cobrança gerando movimentação de ENTRADA no Livro Caixa atomicamente', async () => {
    const cobrancaBaixada = await cobrancaService.darBaixa(cobrancaId, user1Id, {
      data_pagamento: '2026-10-05',
      gerar_movimentacao_caixa: true
    });

    expect(cobrancaBaixada.status).toBe('PAGO');
    expect(cobrancaBaixada.data_pagamento).toBe('2026-10-05');

    // Verifica se a movimentação no Caixa foi gerada e vinculada
    const [movRows] = await pool.execute(
      'SELECT id, cobranca_id, tipo, valor, data_movimentacao, descricao FROM movimentacoes WHERE cobranca_id = ? AND usuario_id = ?',
      [cobrancaId, user1Id]
    );

    expect(movRows.length).toBe(1);
    const mov = movRows[0];
    expect(mov.tipo).toBe('ENTRADA');
    expect(Number(mov.valor)).toBe(250.00);
    expect(mov.cobranca_id).toBe(cobrancaId);
    expect(mov.descricao).toContain(`Cobrança #${cobrancaId}`);
  });

  // 7. Consulta do orçamento retornando a árvore de rastreabilidade completa (fluxo)
  test('7. Consulta orcamentoService.obterPorId retornando árvore de rastreabilidade completa (fluxo)', async () => {
    const orc = await orcamentoService.obterPorId(orcamentoAprovadoId, user1Id);

    expect(orc).toBeDefined();
    expect(orc.fluxo).toBeDefined();
    expect(orc.fluxo.agendamento).toBeDefined();
    expect(orc.fluxo.agendamento.id).toBe(agendamentoId);
    expect(orc.fluxo.agendamento.status).toBe('CONCLUIDO');

    expect(orc.fluxo.cobranca).toBeDefined();
    expect(orc.fluxo.cobranca.id).toBe(cobrancaId);
    expect(Number(orc.fluxo.cobranca.valor)).toBe(250.00);
    expect(orc.fluxo.cobranca.status).toBe('PAGO');

    expect(orc.fluxo.caixa).toBeDefined();
    expect(orc.fluxo.caixa.movimentacao_id).toBeDefined();
    expect(Number(orc.fluxo.caixa.valor)).toBe(250.00);

    // Também verifica em buscarPorId (compatibilidade)
    const orcBuscar = await orcamentoService.buscarPorId(orcamentoAprovadoId, user1Id);
    expect(orcBuscar.fluxo).toBeDefined();
    expect(orcBuscar.fluxo.agendamento.id).toBe(agendamentoId);

    // E em listar
    const lista = await orcamentoService.listar(user1Id);
    const itemAprovado = lista.find((o) => o.id === orcamentoAprovadoId);
    expect(itemAprovado).toBeDefined();
    expect(itemAprovado.fluxo).toBeDefined();
    expect(itemAprovado.fluxo.agendamento.id).toBe(agendamentoId);
  });

  // 8. Bloqueio de exclusão do orçamento com agendamentos/cobranças vinculados
  test('8. Bloqueia exclusão de orçamento com agendamentos ou cobranças vinculadas', async () => {
    await expect(orcamentoService.excluir(orcamentoAprovadoId, user1Id))
      .rejects.toThrow('Não é possível excluir orçamento com agendamentos ou cobranças associados.');
  });

  // 9. Isolamento multi-tenant estrito entre MEIs
  test('9. Garante isolamento multi-tenant: MEI 2 não pode agendar, cobrar ou ver orçamento do MEI 1', async () => {
    // MEI 2 tentando agendar orçamento do MEI 1
    await expect(agendamentoService.criar({
      usuario_id: user2Id,
      orcamento_id: orcamentoAprovadoId,
      data_hora: '2026-10-07 10:00:00'
    })).rejects.toThrow('Orçamento não encontrado.');

    // MEI 2 tentando cobrar agendamento do MEI 1
    await expect(cobrancaService.criar({
      usuario_id: user2Id,
      agendamento_id: agendamentoId,
      vencimento: '2026-10-30'
    })).rejects.toThrow('Agendamento não encontrado.');

    // MEI 2 tentando obter orçamento do MEI 1
    await expect(orcamentoService.obterPorId(orcamentoAprovadoId, user2Id))
      .rejects.toThrow('Orçamento não encontrado');
  });
});
