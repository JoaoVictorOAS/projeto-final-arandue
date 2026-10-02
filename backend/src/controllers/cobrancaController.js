const financeiroService = require('../services/financeiroService');

/**
 * Controller responsável pelas operações de Cobranças do MEI.
 */
const cobrancaController = {
  /**
   * GET /api/cobrancas
   * Lista cobranças do MEI autenticado com filtros opcionais.
   */
  async listar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { status, cliente_id } = req.query;

      const cobrancas = await financeiroService.listarCobrancas(usuario_id, {
        status,
        cliente_id
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cobranças listadas com sucesso',
        dados: cobrancas
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao listar cobranças'
      });
    }
  },

  /**
   * GET /api/cobrancas/:id
   * Busca cobrança por ID.
   */
  async buscarPorId(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      const cobranca = await financeiroService.buscarCobrancaPorId(id, usuario_id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cobrança encontrada com sucesso',
        dados: cobranca
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao buscar cobrança'
      });
    }
  },

  /**
   * POST /api/cobrancas
   * Registra uma nova cobrança vinculada a um cliente.
   */
  async criar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const {
        cliente_id,
        orcamento_id,
        valor,
        vencimento,
        status,
        observacoes
      } = req.body;

      const novaCobranca = await financeiroService.criarCobranca({
        usuario_id,
        cliente_id,
        orcamento_id,
        valor,
        vencimento,
        status,
        observacoes
      });

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Cobrança cadastrada com sucesso',
        dados: novaCobranca
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao cadastrar cobrança'
      });
    }
  },

  /**
   * PUT /api/cobrancas/:id
   * Atualiza dados de uma cobrança existente.
   */
  async atualizar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;
      const dados = req.body;

      const cobrancaAtualizada = await financeiroService.atualizarCobranca(id, usuario_id, dados);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cobrança atualizada com sucesso',
        dados: cobrancaAtualizada
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao atualizar cobrança'
      });
    }
  },

  /**
   * PATCH ou PUT /api/cobrancas/:id/pagar
   * Dá baixa na cobrança como PAGO e gera movimentação de entrada no Livro Caixa.
   */
  async darBaixa(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;
      const { data_pagamento, gerar_movimentacao_caixa } = req.body || {};

      const cobrancaBaixada = await financeiroService.darBaixaCobranca(id, usuario_id, {
        data_pagamento,
        gerar_movimentacao_caixa: gerar_movimentacao_caixa !== undefined
          ? Boolean(gerar_movimentacao_caixa)
          : true
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cobrança baixada com sucesso',
        dados: cobrancaBaixada
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao baixar cobrança'
      });
    }
  },

  /**
   * DELETE /api/cobrancas/:id
   * Remove uma cobrança do sistema.
   */
  async excluir(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      await financeiroService.excluirCobranca(id, usuario_id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cobrança excluída com sucesso'
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao excluir cobrança'
      });
    }
  }
};

module.exports = cobrancaController;
