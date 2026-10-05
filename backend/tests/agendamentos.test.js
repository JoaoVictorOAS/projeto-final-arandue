const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Módulo de Agendamentos API (/api/agendamentos) - Anti-Choque & Multi-Tenancy', () => {
  let tokenUser1 = '';
  let tokenUser2 = '';
  let user1Id = null;
  let user2Id = null;

  let clienteUser1Id = null;
  let clienteUser2Id = null;
  let servicoUser1Id = null;
  let servicoUser2Id = null;

  const user1 = {
    nome: 'MEI Agenda Um',
    email: 'agenda.user1@mei.com',
    senha: 'SenhaForte123@'
  };

  const user2 = {
    nome: 'MEI Agenda Dois',
    email: 'agenda.user2@mei.com',
    senha: 'SenhaForte123@'
  };

  async function limparBanco() {
    await pool.execute("DELETE FROM movimentacoes WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('agenda.user1@mei.com', 'agenda.user2@mei.com'))");
    await pool.execute("DELETE FROM cobrancas WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('agenda.user1@mei.com', 'agenda.user2@mei.com'))");
    await pool.execute("DELETE FROM agendamentos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('agenda.user1@mei.com', 'agenda.user2@mei.com'))");
    await pool.execute("DELETE FROM orcamento_itens WHERE orcamento_id IN (SELECT id FROM orcamentos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('agenda.user1@mei.com', 'agenda.user2@mei.com')))");
    await pool.execute("DELETE FROM orcamentos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('agenda.user1@mei.com', 'agenda.user2@mei.com'))");
    await pool.execute("DELETE FROM servicos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('agenda.user1@mei.com', 'agenda.user2@mei.com'))");
    await pool.execute("DELETE FROM clientes WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('agenda.user1@mei.com', 'agenda.user2@mei.com'))");
    await pool.execute("DELETE FROM usuarios WHERE email IN ('agenda.user1@mei.com', 'agenda.user2@mei.com')");
  }

  async function criarOrcamentoAprovado(token, clienteId, servicoId) {
    const resOrc = await request(app)
      .post('/api/orcamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cliente_id: clienteId,
        data_emissao: '2026-11-01',
        itens: [{ servico_id: servicoId, quantidade: 1, preco_unitario: 180.00 }]
      });
    const orcId = resOrc.body.dados.id;
    await request(app)
      .patch(`/api/orcamentos/${orcId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'APROVADO' });
    return orcId;
  }

  beforeAll(async () => {
    // Limpeza prévia
    await limparBanco();

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
      .send({ nome: 'Cliente Agenda 1', email: 'cli.agenda1@email.com', telefone: '11933333333' });
    clienteUser1Id = cliRes1.body.dados.id;

    // Criar Cliente para User 2
    const cliRes2 = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenUser2}`)
      .send({ nome: 'Cliente Agenda 2', email: 'cli.agenda2@email.com', telefone: '11944444444' });
    clienteUser2Id = cliRes2.body.dados.id;

    // Criar Serviço para User 1
    const srvRes1 = await request(app)
      .post('/api/servicos')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ nome: 'Conserto Elétrico', preco: 180.00, categoria: 'Manutenção' });
    servicoUser1Id = srvRes1.body.dados.id;

    // Criar Serviço para User 2
    const srvRes2 = await request(app)
      .post('/api/servicos')
      .set('Authorization', `Bearer ${tokenUser2}`)
      .send({ nome: 'Jardinagem Completa', preco: 220.00, categoria: 'Jardinagem' });
    servicoUser2Id = srvRes2.body.dados.id;
  });

  afterAll(async () => {
    // Limpeza final
    await limparBanco();
    await pool.end();
  });

  describe('Proteção das rotas com AuthMiddleware', () => {
    test('deve negar acesso sem token (401)', async () => {
      const res = await request(app).get('/api/agendamentos');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });

    test('deve negar acesso com token inválido (401)', async () => {
      const res = await request(app)
        .get('/api/agendamentos')
        .set('Authorization', 'Bearer token_invalido');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('Validações de Regra de Negócio (POST /api/agendamentos)', () => {
    test('deve rejeitar agendamento sem orcamento_id (400)', async () => {
      const res = await request(app)
        .post('/api/agendamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          data_hora: '2026-11-05 14:00:00'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/orçamento/i);
    });

    test('deve rejeitar orçamento pertencente a outro MEI (404/400)', async () => {
      const orcOutroMEI = await criarOrcamentoAprovado(tokenUser2, clienteUser2Id, servicoUser2Id);
      const res = await request(app)
        .post('/api/agendamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          orcamento_id: orcOutroMEI,
          cliente_id: clienteUser2Id,
          data_hora: '2026-11-05 14:00:00'
        });

      expect([400, 404]).toContain(res.statusCode);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/orçamento.*não encontrado/i);
    });

    test('deve rejeitar data_hora vazia ou inválida (400)', async () => {
      const orcValido = await criarOrcamentoAprovado(tokenUser1, clienteUser1Id, servicoUser1Id);
      const res = await request(app)
        .post('/api/agendamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          orcamento_id: orcValido,
          cliente_id: clienteUser1Id,
          data_hora: 'data-invalida-xyz'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/data e hora.*inválid/i);
    });

    test('deve rejeitar servico_id pertencente a outro MEI (404/400)', async () => {
      const orcValido = await criarOrcamentoAprovado(tokenUser1, clienteUser1Id, servicoUser1Id);
      const res = await request(app)
        .post('/api/agendamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          orcamento_id: orcValido,
          cliente_id: clienteUser1Id,
          servico_id: servicoUser2Id,
          data_hora: '2026-11-05 14:00:00'
        });

      expect([400, 404]).toContain(res.statusCode);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/serviço.*não encontrado/i);
    });
  });

  describe('Criação de Agendamento Válido (POST /api/agendamentos)', () => {
    let agendamentoCriado = null;
    let orcamentoCriadoId = null;
    const horarioAtendimento = '2026-11-10 09:30:00';

    beforeAll(async () => {
      orcamentoCriadoId = await criarOrcamentoAprovado(tokenUser1, clienteUser1Id, servicoUser1Id);
    });

    test('deve criar agendamento válido com sucesso (201)', async () => {
      const payload = {
        orcamento_id: orcamentoCriadoId,
        cliente_id: clienteUser1Id,
        servico_id: servicoUser1Id,
        data_hora: horarioAtendimento,
        observacoes: 'Trazer multímetro e chave de teste'
      };

      const res = await request(app)
        .post('/api/agendamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toHaveProperty('id');
      expect(res.body.dados.cliente_id).toBe(clienteUser1Id);
      expect(res.body.dados.orcamento_id).toBe(orcamentoCriadoId);
      expect(res.body.dados.status).toBe('PENDENTE');
      expect(res.body.dados.cliente_nome).toBe('Cliente Agenda 1');
      expect(res.body.dados.servico_nome).toBe('Conserto Elétrico');

      agendamentoCriado = res.body.dados;
    });

    test('deve bloquear com erro 409 ao tentar agendar no mesmo horário para o mesmo MEI', async () => {
      const orcOutro = await criarOrcamentoAprovado(tokenUser1, clienteUser1Id, servicoUser1Id);
      const payloadDuplicado = {
        orcamento_id: orcOutro,
        cliente_id: clienteUser1Id,
        servico_id: servicoUser1Id,
        data_hora: horarioAtendimento,
        observacoes: 'Tentativa de choque de horário'
      };

      const res = await request(app)
        .post('/api/agendamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(payloadDuplicado);

      expect(res.statusCode).toBe(409);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/conflito de horário/i);
    });

    test('deve permitir agendamento no MESMO horário para MEIs DIFERENTES (multi-tenant)', async () => {
      const orcUser2 = await criarOrcamentoAprovado(tokenUser2, clienteUser2Id, servicoUser2Id);
      const payloadOutroMEI = {
        orcamento_id: orcUser2,
        cliente_id: clienteUser2Id,
        servico_id: servicoUser2Id,
        data_hora: horarioAtendimento,
        observacoes: 'Atendimento concomitante de outro MEI'
      };

      const res = await request(app)
        .post('/api/agendamentos')
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send(payloadOutroMEI);

      expect(res.statusCode).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toHaveProperty('id');
      expect(res.body.dados.usuario_id).toBe(user2Id);
    });
  });

  describe('Consulta e Listagem de Agendamentos (GET /api/agendamentos)', () => {
    let agendamento1 = null;
    let agendamento2 = null;

    beforeAll(async () => {
      const orc1 = await criarOrcamentoAprovado(tokenUser1, clienteUser1Id, servicoUser1Id);
      const res1 = await request(app)
        .post('/api/agendamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          orcamento_id: orc1,
          cliente_id: clienteUser1Id,
          data_hora: '2026-11-12 10:00:00',
          observacoes: 'Primeiro atendimento'
        });
      agendamento1 = res1.body.dados;

      const orc2 = await criarOrcamentoAprovado(tokenUser1, clienteUser1Id, servicoUser1Id);
      const res2 = await request(app)
        .post('/api/agendamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          orcamento_id: orc2,
          cliente_id: clienteUser1Id,
          data_hora: '2026-11-12 14:00:00',
          observacoes: 'Segundo atendimento'
        });
      agendamento2 = res2.body.dados;
    });

    test('deve listar agendamentos ordenados por data_hora ASC (200)', async () => {
      const res = await request(app)
        .get('/api/agendamentos')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(Array.isArray(res.body.dados)).toBe(true);
      expect(res.body.dados.length).toBeGreaterThanOrEqual(2);

      // Valida ordenação cronológica
      const datas = res.body.dados.map(a => new Date(a.data_hora).getTime());
      for (let i = 0; i < datas.length - 1; i++) {
        expect(datas[i]).toBeLessThanOrEqual(datas[i + 1]);
      }
    });

    test('deve filtrar agendamentos por data (200)', async () => {
      const res = await request(app)
        .get('/api/agendamentos?data=2026-11-12')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.dados.length).toBeGreaterThanOrEqual(2);
      expect(res.body.dados.every(a => a.data_hora.includes('2026-11-12'))).toBe(true);
    });

    test('deve filtrar agendamentos por status (200)', async () => {
      const res = await request(app)
        .get('/api/agendamentos?status=PENDENTE')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.dados.every(a => a.status === 'PENDENTE')).toBe(true);
    });

    test('deve buscar agendamento por ID com dados do cliente e serviço (200)', async () => {
      const res = await request(app)
        .get(`/api/agendamentos/${agendamento1.id}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.id).toBe(agendamento1.id);
      expect(res.body.dados.cliente_nome).toBe('Cliente Agenda 1');
      expect(res.body.dados.observacoes).toBe('Primeiro atendimento');
    });

    test('deve retornar 404 para ID inexistente', async () => {
      const res = await request(app)
        .get('/api/agendamentos/999999')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('Alteração de Status e Atualização (PATCH/PUT /api/agendamentos)', () => {
    let agendamentoParaStatus = null;

    beforeAll(async () => {
      const orc = await criarOrcamentoAprovado(tokenUser1, clienteUser1Id, servicoUser1Id);
      const res = await request(app)
        .post('/api/agendamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          orcamento_id: orc,
          cliente_id: clienteUser1Id,
          data_hora: '2026-11-15 08:00:00'
        });
      agendamentoParaStatus = res.body.dados;
    });

    test('deve alterar status para CONFIRMADO (200)', async () => {
      const res = await request(app)
        .patch(`/api/agendamentos/${agendamentoParaStatus.id}/status`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ status: 'CONFIRMADO' });

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.status).toBe('CONFIRMADO');
    });

    test('deve alterar status para CONCLUIDO (200)', async () => {
      const res = await request(app)
        .patch(`/api/agendamentos/${agendamentoParaStatus.id}/status`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ status: 'CONCLUIDO' });

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.status).toBe('CONCLUIDO');
    });

    test('deve alterar status para CANCELADO (200)', async () => {
      const res = await request(app)
        .patch(`/api/agendamentos/${agendamentoParaStatus.id}/status`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ status: 'CANCELADO' });

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.status).toBe('CANCELADO');
    });

    test('deve rejeitar status inválido (400)', async () => {
      const res = await request(app)
        .patch(`/api/agendamentos/${agendamentoParaStatus.id}/status`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ status: 'STATUS_DESCONHECIDO' });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/status inválido/i);
    });

    test('deve reagendar para novo horário livre com sucesso via PUT (200)', async () => {
      const res = await request(app)
        .put(`/api/agendamentos/${agendamentoParaStatus.id}`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          data_hora: '2026-11-15 11:30:00',
          observacoes: 'Horário alterado a pedido do cliente'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.observacoes).toBe('Horário alterado a pedido do cliente');
    });

    test('deve bloquear reagendamento com 409 caso novo horário colida com outro agendamento ativo', async () => {
      const orcOutro = await criarOrcamentoAprovado(tokenUser1, clienteUser1Id, servicoUser1Id);
      // Cria outro agendamento ativo às 16:00
      const outro = await request(app)
        .post('/api/agendamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          orcamento_id: orcOutro,
          cliente_id: clienteUser1Id,
          data_hora: '2026-11-15 16:00:00'
        });

      // Tenta reagendar o primeiro para as 16:00
      const res = await request(app)
        .put(`/api/agendamentos/${agendamentoParaStatus.id}`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          data_hora: '2026-11-15 16:00:00'
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/conflito de horário/i);
    });
  });

  describe('Isolamento Multi-Tenant em Agendamentos', () => {
    let agendamentoUser1 = null;

    beforeAll(async () => {
      const orc = await criarOrcamentoAprovado(tokenUser1, clienteUser1Id, servicoUser1Id);
      const res = await request(app)
        .post('/api/agendamentos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          orcamento_id: orc,
          cliente_id: clienteUser1Id,
          data_hora: '2026-11-20 15:00:00',
          observacoes: 'Atendimento sigiloso MEI 1'
        });
      agendamentoUser1 = res.body.dados;
    });

    test('Usuário 2 não deve ver agendamentos do Usuário 1 na listagem', async () => {
      const res = await request(app)
        .get('/api/agendamentos')
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(200);
      const ids = res.body.dados.map(a => a.id);
      expect(ids).not.toContain(agendamentoUser1.id);
    });

    test('Usuário 2 não deve conseguir consultar agendamento do Usuário 1 por ID (404)', async () => {
      const res = await request(app)
        .get(`/api/agendamentos/${agendamentoUser1.id}`)
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/agendamento não encontrado/i);
    });

    test('Usuário 2 não deve conseguir alterar status de agendamento do Usuário 1 (404)', async () => {
      const res = await request(app)
        .patch(`/api/agendamentos/${agendamentoUser1.id}/status`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ status: 'CONFIRMADO' });

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/agendamento não encontrado/i);
    });

    test('Usuário 2 não deve conseguir atualizar agendamento do Usuário 1 (404)', async () => {
      const res = await request(app)
        .put(`/api/agendamentos/${agendamentoUser1.id}`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ observacoes: 'Tentativa de alteração indevida' });

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/agendamento não encontrado/i);
    });

    test('Usuário 2 não deve conseguir excluir agendamento do Usuário 1 (404)', async () => {
      const res = await request(app)
        .delete(`/api/agendamentos/${agendamentoUser1.id}`)
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/agendamento não encontrado/i);
    });

    test('Usuário 1 deve conseguir excluir seu próprio agendamento (200)', async () => {
      const res = await request(app)
        .delete(`/api/agendamentos/${agendamentoUser1.id}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);

      const busca = await request(app)
        .get(`/api/agendamentos/${agendamentoUser1.id}`)
        .set('Authorization', `Bearer ${tokenUser1}`);
      expect(busca.statusCode).toBe(404);
    });
  });
});
