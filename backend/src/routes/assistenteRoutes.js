const express = require('express');
const assistenteController = require('../controllers/assistenteController');

const router = express.Router();

router.get('/conversas', assistenteController.listarConversas);
router.post('/mensagens', assistenteController.enviarMensagem);
router.get('/mensagens/:id/status', assistenteController.consultarStatusMensagem);
router.get('/conversas/:id/mensagens', assistenteController.listarMensagens);
router.delete('/conversas/:id', assistenteController.excluirConversa);

// Rotas de Integração do WhatsApp
router.get('/whatsapp/status', assistenteController.obterStatusWhatsApp);
router.post('/whatsapp/vincular', assistenteController.vincularWhatsApp);
router.post('/whatsapp/resetar', assistenteController.resetarSessaoWhatsApp);

module.exports = router;
