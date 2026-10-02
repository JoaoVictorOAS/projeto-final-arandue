const express = require('express');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.get('/resumo', dashboardController.obterResumo);
router.get('/', dashboardController.obterResumo);

module.exports = router;
