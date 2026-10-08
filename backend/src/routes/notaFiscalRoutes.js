const express = require('express');
const notaFiscalController = require('../controllers/notaFiscalController');

const router = express.Router();

// Emissão de documentos fiscais
router.post('/nfse', notaFiscalController.emitirNfse);
router.post('/nfe', notaFiscalController.emitirNfe);
router.post('/nfce', notaFiscalController.emitirNfce);

// Listagem com filtros
router.get('/', notaFiscalController.listar);

// Artefato DANFE simplificado
router.get('/:id/danfe', notaFiscalController.obterDanfe);

// Consulta detalhada por ID ou chave
router.get('/:id', notaFiscalController.buscarPorId);

// Cancelamento de documento fiscal
router.post('/:id/cancelar', notaFiscalController.cancelar);

module.exports = router;
