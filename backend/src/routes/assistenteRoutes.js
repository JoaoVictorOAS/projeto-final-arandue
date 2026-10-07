const express = require('express');
const assistenteController = require('../controllers/assistenteController');

const router = express.Router();

router.get('/conversas', assistenteController.listarConversas);
router.post('/mensagens', assistenteController.enviarMensagem);
router.get('/conversas/:id/mensagens', assistenteController.listarMensagens);
router.delete('/conversas/:id', assistenteController.excluirConversa);

module.exports = router;
