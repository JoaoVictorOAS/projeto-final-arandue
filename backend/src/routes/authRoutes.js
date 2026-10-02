const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Rotas públicas
router.post('/register', authController.registrar);
router.post('/login', authController.login);

// Rota protegida
router.get('/me', authMiddleware, authController.me);

module.exports = router;
