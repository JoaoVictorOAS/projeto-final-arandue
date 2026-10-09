const express = require('express');
const router = express.Router();
const estoqueController = require('../controllers/estoqueController');

router.get('/insumos', estoqueController.listarInsumos);
router.post('/insumos', estoqueController.cadastrarInsumo);
router.post('/insumos/entrada', estoqueController.registrarEntrada);
router.get('/fichas-tecnicas/:servicoId', estoqueController.obterFichaTecnica);
router.post('/fichas-tecnicas', estoqueController.salvarFichaTecnica);
router.post('/producao', estoqueController.registrarProducao);
router.post('/simulacao', estoqueController.simular);
router.get('/movimentacoes', estoqueController.listarMovimentacoes);

module.exports = router;
