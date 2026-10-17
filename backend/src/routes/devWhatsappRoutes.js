const express = require('express');
const devWhatsappController = require('../controllers/devWhatsappController');

const router = express.Router();

/**
 * Rotas de infraestrutura e administração do Gateway WhatsApp.
 * Todas as rotas deste router exigem autenticação prévia pelo devAuthMiddleware.
 */
router.get('/status', devWhatsappController.obterStatus);
router.get('/qrcode', devWhatsappController.visualizarQrCode);
router.post('/resetar', devWhatsappController.resetarSessao);

module.exports = router;
