const express = require('express');
const agendamentoController = require('../controllers/agendamentoController');

const router = express.Router();

router.get('/', agendamentoController.listar);
router.post('/', agendamentoController.criar);
router.get('/:id', agendamentoController.buscarPorId);
router.put('/:id', agendamentoController.atualizar);
router.patch('/:id/status', agendamentoController.atualizarStatus);
router.put('/:id/status', agendamentoController.atualizarStatus);
router.delete('/:id', agendamentoController.excluir);

module.exports = router;
