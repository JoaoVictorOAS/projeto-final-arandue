const dashboardService = require('../services/dashboardService');

/**
 * Controller responsável pelas métricas e visão agregada do Dashboard.
 */
const dashboardController = {
  /**
   * GET /api/dashboard/resumo
   * Retorna os indicadores financeiros e operacionais consolidados do MEI.
   */
  async obterResumo(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const dados = await dashboardService.obterResumo(usuario_id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Resumo do dashboard obtido com sucesso',
        dados
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao carregar dados do dashboard'
      });
    }
  }
};

module.exports = dashboardController;
