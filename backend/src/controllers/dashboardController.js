const dashboardService = require('../services/dashboardService');

/**
 * Controller responsável pelas métricas e visão agregada do Dashboard,
 * além do gerenciamento de painéis dinâmicos e widgets analíticos.
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
  },

  /**
   * GET /api/dashboards/metricas/catalogo
   * Retorna o catálogo oficial de métricas, períodos e tipos de gráficos suportados.
   */
  async obterCatalogoMetricas(req, res) {
    try {
      const dados = dashboardService.obterMetricasDisponiveis();
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Catálogo de métricas obtido com sucesso',
        dados
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao obter catálogo de métricas'
      });
    }
  },

  /**
   * GET /api/dashboards
   * Lista todos os dashboards do usuário com seus respectivos widgets.
   */
  async listarDashboards(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const dados = await dashboardService.listarDashboards(usuario_id);
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Dashboards listados com sucesso',
        dados
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao listar dashboards'
      });
    }
  },

  /**
   * GET /api/dashboards/:id
   * Retorna um dashboard específico e calcula os dados das métricas de seus widgets.
   */
  async obterDashboard(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;
      const dados = await dashboardService.obterDashboard(usuario_id, id, true);
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Dashboard obtido com sucesso',
        dados
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao obter dashboard'
      });
    }
  },

  /**
   * POST /api/dashboards
   * Cria um novo painel de dashboard.
   */
  async criarDashboard(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { nome, descricao, eh_padrao, ordem } = req.body;
      const dados = await dashboardService.criarDashboard(usuario_id, { nome, descricao, eh_padrao, ordem });
      return res.status(201).json({
        sucesso: true,
        mensagem: 'Dashboard criado com sucesso',
        dados
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao criar dashboard'
      });
    }
  },

  /**
   * PUT /api/dashboards/:id
   * Atualiza as configurações de um painel de dashboard.
   */
  async atualizarDashboard(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;
      const { nome, descricao, eh_padrao, ordem } = req.body;
      const dados = await dashboardService.atualizarDashboard(usuario_id, id, { nome, descricao, eh_padrao, ordem });
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Dashboard atualizado com sucesso',
        dados
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao atualizar dashboard'
      });
    }
  },

  /**
   * DELETE /api/dashboards/:id
   * Exclui um painel de dashboard e seus widgets associados.
   */
  async excluirDashboard(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;
      const resultado = await dashboardService.excluirDashboard(usuario_id, id);
      return res.status(200).json(resultado);
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao excluir dashboard'
      });
    }
  },

  /**
   * POST /api/dashboards/:id/widgets
   * Adiciona um widget gráfico a um dashboard.
   */
  async adicionarWidget(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id: dashboard_id } = req.params;
      const dados = await dashboardService.adicionarWidget(usuario_id, dashboard_id, req.body);
      return res.status(201).json({
        sucesso: true,
        mensagem: 'Widget adicionado com sucesso',
        dados
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao adicionar widget'
      });
    }
  },

  /**
   * PUT /api/dashboards/:id/widgets/:widgetId
   * Atualiza as configurações de um widget gráfico.
   */
  async atualizarWidget(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id: dashboard_id, widgetId } = req.params;
      const dados = await dashboardService.atualizarWidget(usuario_id, dashboard_id, widgetId, req.body);
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Widget atualizado com sucesso',
        dados
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao atualizar widget'
      });
    }
  },

  /**
   * DELETE /api/dashboards/:id/widgets/:widgetId
   * Remove um widget gráfico de um dashboard.
   */
  async excluirWidget(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id: dashboard_id, widgetId } = req.params;
      const resultado = await dashboardService.excluirWidget(usuario_id, dashboard_id, widgetId);
      return res.status(200).json(resultado);
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao excluir widget'
      });
    }
  },

  /**
   * GET /api/dashboard/insights
   * Retorna insights proativos da IA para o dashboard.
   */
  async obterInsightsProativos(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const dados = await dashboardService.obterInsightsProativos(usuario_id);
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Insights proativos obtidos com sucesso',
        dados
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao obter insights proativos'
      });
    }
  }
};

module.exports = dashboardController;
