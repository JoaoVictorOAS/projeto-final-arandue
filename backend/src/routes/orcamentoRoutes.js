const express = require('express');
const orcamentoController = require('../controllers/orcamentoController');

const router = express.Router();

router.get('/', orcamentoController.listar);
router.post('/', orcamentoController.criar);
router.get('/:id', orcamentoController.buscarPorId);
router.patch('/:id/status', orcamentoController.atualizarStatus);
router.put('/:id/status', orcamentoController.atualizarStatus);
router.delete('/:id', orcamentoController.excluir);

module.exports = router;
