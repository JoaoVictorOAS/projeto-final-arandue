const express = require('express');
const servicoController = require('../controllers/servicoController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Garante autenticação em todas as rotas de serviços
router.use(authMiddleware);

router.get('/', servicoController.listar);
router.post('/', servicoController.criar);
router.get('/:id', servicoController.buscarPorId);
router.put('/:id', servicoController.atualizar);
router.delete('/:id', servicoController.excluir);

module.exports = router;
