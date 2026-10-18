const express = require('express');
const assistenteController = require('../controllers/assistenteController');
const devAuthMiddleware = require('../middlewares/devAuthMiddleware');

const router = express.Router();

router.get('/conversas', assistenteController.listarConversas);
router.post('/mensagens', assistenteController.enviarMensagem);
router.get('/mensagens/:id/status', assistenteController.consultarStatusMensagem);
router.get('/conversas/:id/mensagens', assistenteController.listarMensagens);
router.delete('/conversas/:id', assistenteController.excluirConversa);

// Rotas Multimodais (Paridade MCP)
router.post('/audio/transcrever', assistenteController.transcreverAudio);
router.post('/imagem/analisar', assistenteController.analisarImagem);
router.post('/imagem/lancar-comprovante', assistenteController.lancarComprovanteCaixa);

// Rotas de Integração do WhatsApp
router.get('/whatsapp/status', assistenteController.obterStatusWhatsApp);
router.post('/whatsapp/vincular', assistenteController.vincularWhatsApp);
router.post('/whatsapp/resetar', devAuthMiddleware, assistenteController.resetarSessaoWhatsApp);

module.exports = router;
