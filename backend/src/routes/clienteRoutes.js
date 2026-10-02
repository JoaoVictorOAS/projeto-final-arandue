const express = require('express');
const clienteController = require('../controllers/clienteController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Garante autenticação em todas as rotas de clientes
router.use(authMiddleware);

router.get('/', clienteController.listar);
router.post('/', clienteController.criar);
router.get('/:id', clienteController.buscarPorId);
router.put('/:id', clienteController.atualizar);
router.delete('/:id', clienteController.excluir);

module.exports = router;
