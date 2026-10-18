const express = require('express');
const servicoController = require('../controllers/servicoController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Garante autenticação em todas as rotas de serviços e assinaturas
router.use(authMiddleware);

// --- Rotas de Assinaturas Recorrentes (Devem vir antes de /:id para evitar conflito de roteamento) ---
router.get('/assinaturas', servicoController.listarAssinaturas);
router.post('/assinaturas', servicoController.criarAssinatura);
router.get('/assinaturas/:id', servicoController.buscarAssinaturaPorId);
router.put('/assinaturas/:id', servicoController.atualizarAssinatura);
router.patch('/assinaturas/:id/status', servicoController.atualizarStatusAssinatura);
router.post('/assinaturas/:id/gerar-cobranca', servicoController.gerarCobrancaAssinatura);

// --- Rotas de Serviços / Produtos ---
router.get('/', servicoController.listar);
router.post('/', servicoController.criar);
router.get('/:id', servicoController.buscarPorId);
router.put('/:id', servicoController.atualizar);
router.delete('/:id', servicoController.excluir);

module.exports = router;
