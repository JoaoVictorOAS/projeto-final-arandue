const financeiroService = require('../services/financeiroService');

/**
 * Controller responsável pelas operações do Livro Caixa (Movimentações) do MEI.
 */
const movimentacaoController = {
  /**
   * GET /api/movimentacoes
   * Lista movimentações com filtros opcionais.
   */
  async listar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { tipo, categoria, data_inicio, data_fim } = req.query;

      const movimentacoes = await financeiroService.listarMovimentacoes(usuario_id, {
        tipo,
        categoria,
        data_inicio,
        data_fim
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Movimentações listadas com sucesso',
        dados: movimentacoes
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao listar movimentações'
      });
    }
  },

  /**
   * GET /api/movimentacoes/:id
   * Busca movimentação por ID.
   */
  async buscarPorId(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      const movimentacao = await financeiroService.buscarMovimentacaoPorId(id, usuario_id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Movimentação encontrada com sucesso',
        dados: movimentacao
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao buscar movimentação'
      });
    }
  },

  /**
   * POST /api/movimentacoes
   * Registra manualmente uma entrada ou saída no Livro Caixa.
   */
  async criar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const {
        cobranca_id,
        tipo,
        categoria,
        valor,
        data_movimentacao,
        descricao
      } = req.body;

      const novaMovimentacao = await financeiroService.registrarMovimentacao({
        usuario_id,
        cobranca_id,
        tipo,
        categoria,
        valor,
        data_movimentacao,
        descricao
      });

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Movimentação registrada com sucesso',
        dados: novaMovimentacao
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao registrar movimentação'
      });
    }
  },

  /**
   * DELETE /api/movimentacoes/:id
   * Exclui uma movimentação do Livro Caixa.
   */
  async excluir(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      await financeiroService.excluirMovimentacao(id, usuario_id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Movimentação excluída com sucesso'
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao excluir movimentação'
      });
    }
  },

  /**
   * GET /api/movimentacoes/resumo
   * Obtém totais agregados (entradas, saídas, saldo) para o período especificado.
   */
  async obterResumo(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { ano, mes } = req.query;

      const totais = await financeiroService.obterResumoCaixa(usuario_id, ano, mes);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Resumo financeiro obtido com sucesso',
        dados: totais
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao obter resumo financeiro'
      });
    }
  }
};

module.exports = movimentacaoController;
