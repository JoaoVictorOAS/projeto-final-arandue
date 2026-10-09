const express = require('express');
const multer = require('multer');
const configuracoesController = require('../controllers/configuracoesController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Proteção por autenticação JWT em todas as rotas de configurações
router.use(authMiddleware);

router.get('/', configuracoesController.obterConfiguracoes);
router.put('/', configuracoesController.salvarConfiguracoes);
router.get('/estados', configuracoesController.listarEstados);

// Gestão de Certificado Digital ICP-Brasil A1
router.get('/certificado', configuracoesController.obterCertificadoStatus);
router.post('/certificado', upload.single('certificado'), configuracoesController.uploadCertificado);
router.delete('/certificado', configuracoesController.removerCertificado);
router.patch('/certificado/toggle', configuracoesController.toggleTransmissaoSefaz);

router.get('/cnpj/:cnpj', configuracoesController.consultarCnpj);
router.get('/cnpj/*', (req, res) => {
  req.params.cnpj = req.params[0] || req.params.cnpj;
  return configuracoesController.consultarCnpj(req, res);
});

module.exports = router;
