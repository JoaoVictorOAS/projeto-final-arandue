const express = require('express');
const configuracoesController = require('../controllers/configuracoesController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Proteção por autenticação JWT em todas as rotas de configurações
router.use(authMiddleware);

router.get('/', configuracoesController.obterConfiguracoes);
router.put('/', configuracoesController.salvarConfiguracoes);
router.get('/estados', configuracoesController.listarEstados);
router.get('/cnpj/:cnpj', configuracoesController.consultarCnpj);
router.get('/cnpj/*', (req, res) => {
  req.params.cnpj = req.params[0] || req.params.cnpj;
  return configuracoesController.consultarCnpj(req, res);
});

module.exports = router;
