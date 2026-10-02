const express = require('express');
const cobrancaController = require('../controllers/cobrancaController');

const router = express.Router();

router.get('/', cobrancaController.listar);
router.post('/', cobrancaController.criar);
router.get('/:id', cobrancaController.buscarPorId);
router.put('/:id', cobrancaController.atualizar);
router.patch('/:id/pagar', cobrancaController.darBaixa);
router.put('/:id/pagar', cobrancaController.darBaixa);
router.delete('/:id', cobrancaController.excluir);

module.exports = router;
