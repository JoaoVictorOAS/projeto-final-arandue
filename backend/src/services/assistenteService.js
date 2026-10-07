const jwt = require('jsonwebtoken');
const conversaRepository = require('../repositories/conversaRepository');
const aiServiceClient = require('./aiServiceClient');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_chave_jwt_recode_2026';

// Armazenamento em memória para Rate Limit (20 mensagens a cada 10 minutos por usuário)
const userRateLimits = new Map();

function checkRateLimit(usuario_id) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxRequests = 20;

  let records = userRateLimits.get(usuario_id) || [];
  // Remove requisições mais antigas que a janela
  records = records.filter(timestamp => (now - timestamp) < windowMs);

  if (records.length >= maxRequests) {
    const erro = new Error('Limite de mensagens atingido (máximo de 20 mensagens por 10 minutos). Tente novamente em instantes.');
    erro.statusCode = 429;
    throw erro;
  }

  records.push(now);
  userRateLimits.set(usuario_id, records);
}

const assistenteService = {
  /**
   * Envia uma mensagem no assistente e processa a resposta.
   */
  async enviarMensagem(usuario_id, { conversa_id, mensagem }) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    if (!mensagem || typeof mensagem !== 'string' || !mensagem.trim()) {
      const erro = new Error('O conteúdo da mensagem é obrigatório');
      erro.statusCode = 400;
      throw erro;
    }

    const mensagemLimpa = mensagem.trim();
    if (mensagemLimpa.length > 2000) {
      const erro = new Error('A mensagem não pode ultrapassar 2000 caracteres');
      erro.statusCode = 400;
      throw erro;
    }

    // 1. Verifica taxa de requisição
    checkRateLimit(usuario_id);

    // 2. Obtém ou cria a conversa
    let idConversaAtiva = conversa_id;
    if (idConversaAtiva) {
      const conversaExistente = await conversaRepository.buscarConversaPorId(idConversaAtiva, usuario_id);
      if (!conversaExistente) {
        const erro = new Error('Conversa não encontrada');
        erro.statusCode = 404;
        throw erro;
      }
    } else {
      const titulo = mensagemLimpa.length > 60 ? mensagemLimpa.slice(0, 57) + '...' : mensagemLimpa;
      try {
        idConversaAtiva = await conversaRepository.criarConversa(usuario_id, titulo);
      } catch (err) {
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.message?.includes('foreign key constraint fails')) {
          const erroAuth = new Error('Sessão expirada ou usuário não encontrado no banco de dados. Por favor, saia e faça login novamente.');
          erroAuth.statusCode = 401;
          throw erroAuth;
        }
        throw err;
      }
    }

    // 3. Monta histórico recente para contexto (até 10 mensagens anteriores)
    const mensagensAnteriores = await conversaRepository.listarMensagensPorConversa(idConversaAtiva, usuario_id) || [];
    const historicoRecente = mensagensAnteriores.slice(-10).map(m => ({
      papel: m.papel,
      texto: m.conteudo
    }));

    // 4. Salva a pergunta do usuário
    await conversaRepository.salvarMensagem(idConversaAtiva, 'usuario', mensagemLimpa);

    // 5. Gera token restrito de leitura (scoped token) de 15 minutos para as tools do MCP
    const tenantToken = jwt.sign(
      {
        id: usuario_id,
        scope: 'assistente:read'
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // 6. Chama o microserviço de IA
    let respostaAi;
    try {
      respostaAi = await aiServiceClient.enviarMensagem({
        tenant_id: usuario_id,
        tenant_token: tenantToken,
        mensagem: mensagemLimpa,
        historico: historicoRecente
      });
    } catch (err) {
      const erroStatus = err.statusCode || 503;
      const erroAmigavel = new Error(err.message || 'Assistente IA temporariamente indisponível. Tente novamente em instantes.');
      erroAmigavel.statusCode = erroStatus;
      throw erroAmigavel;
    }

    // 7. Salva a resposta do assistente
    const msgId = await conversaRepository.salvarMensagem(
      idConversaAtiva,
      'assistente',
      respostaAi.resposta,
      respostaAi.fontes || [],
      respostaAi.tools_usadas || [],
      respostaAi.rag_backend || 'none'
    );

    return {
      conversa_id: idConversaAtiva,
      mensagem: {
        id: msgId,
        papel: 'assistente',
        conteudo: respostaAi.resposta,
        fontes: respostaAi.fontes || [],
        criado_em: new Date().toISOString()
      }
    };
  },

  async listarConversas(usuario_id) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }
    return await conversaRepository.listarConversasPorUsuario(usuario_id);
  },

  async listarMensagens(conversa_id, usuario_id) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }
    const mensagens = await conversaRepository.listarMensagensPorConversa(conversa_id, usuario_id);
    if (mensagens === null) {
      const erro = new Error('Conversa não encontrada');
      erro.statusCode = 404;
      throw erro;
    }
    return mensagens;
  },

  async excluirConversa(conversa_id, usuario_id) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }
    const removido = await conversaRepository.excluirConversa(conversa_id, usuario_id);
    if (!removido) {
      const erro = new Error('Conversa não encontrada');
      erro.statusCode = 404;
      throw erro;
    }
    return true;
  }
};

module.exports = assistenteService;
