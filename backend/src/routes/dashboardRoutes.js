const express = require('express');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

// Rotas específicas / estáticas primeiro para evitar colisões com :id
router.get('/resumo', dashboardController.obterResumo);
router.get('/metricas/catalogo', dashboardController.obterCatalogoMetricas);

// Rota raiz: Mantém retrocompatibilidade total com /api/dashboard (resumo)
// e atende /api/dashboards (listagem e auto-provisionamento)
router.get('/', (req, res, next) => {
  if (req.baseUrl === '/api/dashboard') {
    return dashboardController.obterResumo(req, res, next);
  }
  return dashboardController.listarDashboards(req, res, next);
});

// CRUD de Dashboards
router.post('/', dashboardController.criarDashboard);
router.get('/:id', dashboardController.obterDashboard);
router.put('/:id', dashboardController.atualizarDashboard);
router.delete('/:id', dashboardController.excluirDashboard);

// CRUD de Widgets
router.post('/:id/widgets', dashboardController.adicionarWidget);
router.put('/:id/widgets/:widgetId', dashboardController.atualizarWidget);
router.delete('/:id/widgets/:widgetId', dashboardController.excluirWidget);

module.exports = router;
