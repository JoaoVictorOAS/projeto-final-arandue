const agendamentoService = require('../services/agendamentoService');

/**
 * Controller responsável pelas operações de Agendamentos do MEI.
 */
const agendamentoController = {
  /**
   * GET /api/agendamentos
   * Lista os agendamentos do MEI com filtros opcionais por data e status.
   */
  async listar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { data, status } = req.query;

      const agendamentos = await agendamentoService.listar(usuario_id, { data, status });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Agendamentos listados com sucesso',
        dados: agendamentos
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao listar agendamentos'
      });
    }
  },

  /**
   * GET /api/agendamentos/:id
   * Busca um agendamento por ID com dados do cliente e serviço.
   */
  async buscarPorId(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      const agendamento = await agendamentoService.buscarPorId(id, usuario_id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Agendamento encontrado com sucesso',
        dados: agendamento
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao buscar agendamento'
      });
    }
  },

  /**
   * POST /api/agendamentos
   * Cadastra um novo agendamento com verificação de anti-choque de horário (409).
   */
  async criar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { cliente_id, servico_id, data_hora, status, observacoes } = req.body;

      const novoAgendamento = await agendamentoService.criar({
        usuario_id,
        cliente_id,
        servico_id,
        data_hora,
        status,
        observacoes
      });

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Agendamento criado com sucesso',
        dados: novoAgendamento
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao criar agendamento'
      });
    }
  },

  /**
   * PUT /api/agendamentos/:id
   * Atualiza dados de um agendamento existente.
   */
  async atualizar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;
      const { cliente_id, servico_id, data_hora, status, observacoes } = req.body;

      const agendamentoAtualizado = await agendamentoService.atualizar(id, usuario_id, {
        cliente_id,
        servico_id,
        data_hora,
        status,
        observacoes
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Agendamento atualizado com sucesso',
        dados: agendamentoAtualizado
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao atualizar agendamento'
      });
    }
  },

  /**
   * PATCH /api/agendamentos/:id/status
   * PUT /api/agendamentos/:id/status
   * Atualiza apenas o status do agendamento (PENDENTE, CONFIRMADO, CONCLUIDO, CANCELADO).
   */
  async atualizarStatus(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;
      const { status } = req.body;

      const agendamentoAtualizado = await agendamentoService.atualizarStatus(id, usuario_id, status);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Status do agendamento atualizado com sucesso',
        dados: agendamentoAtualizado
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao atualizar status do agendamento'
      });
    }
  },

  /**
   * DELETE /api/agendamentos/:id
   * Exclui um agendamento do MEI.
   */
  async excluir(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      await agendamentoService.excluir(id, usuario_id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Agendamento excluído com sucesso',
        dados: null
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao excluir agendamento'
      });
    }
  }
};

module.exports = agendamentoController;
