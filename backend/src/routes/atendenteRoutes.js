const express = require('express');
const router = express.Router();
const atendenteController = require('../controllers/atendenteController');
const authMiddleware = require('../middlewares/authMiddleware');

// Rotas Públicas (para clientes finais conversarem com o Atendente do MEI via link/slug)
router.get('/publico/:slug', atendenteController.obterPerfilPublico);
router.post('/publico/:slug/mensagem', atendenteController.enviarMensagemPublica);

// Rotas Protegidas (MEI, Assistente Copiloto ou Scoped Token do Atendente)
router.use(authMiddleware);

// Configuração e Fila de Transbordo Humano (MEI e Assistente Copiloto - bloqueado para atendente:customer no authMiddleware)
router.get('/config', atendenteController.obterConfig);
router.put('/config', atendenteController.atualizarConfig);
router.put('/config/servico/:servico_id', atendenteController.configurarAlcadaServico);
router.get('/pendencias', atendenteController.listarPendencias);
router.patch('/pendencias/:id/status', atendenteController.atualizarStatusPendencia);

// Operações Restritas do Atendente do Cliente (acessíveis por atendente:customer e assistente:operator)
router.get('/operacional/catalogo', atendenteController.consultarCatalogo);
router.get('/operacional/disponibilidade', atendenteController.consultarDisponibilidade);
router.post('/operacional/orcamento', atendenteController.proporOuFecharOrcamento);
router.post('/operacional/agendar', atendenteController.agendarAtendimento);
router.post('/operacional/solicitar-humano', atendenteController.solicitarAtendimentoHumano);

module.exports = router;
