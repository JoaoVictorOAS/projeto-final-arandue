const express = require('express');
const movimentacaoController = require('../controllers/movimentacaoController');

const router = express.Router();

router.get('/resumo', movimentacaoController.obterResumo);
router.get('/', movimentacaoController.listar);
router.post('/', movimentacaoController.criar);
router.get('/:id', movimentacaoController.buscarPorId);
router.delete('/:id', movimentacaoController.excluir);

module.exports = router;
