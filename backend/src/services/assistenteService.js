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
   * Envia uma mensagem no assistente e processa a resposta (suporta síncrono ou assíncrono).
   */
  async enviarMensagem(usuario_id, { conversa_id, mensagem, assincrono = false, canal = 'web' }) {
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
        idConversaAtiva = await conversaRepository.criarConversa(usuario_id, titulo, canal);
      } catch (err) {
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.message?.includes('foreign key constraint fails')) {
          const erroAuth = new Error('Sessão expirada ou usuário não encontrado no banco de dados. Por favor, saia e faça login novamente.');
          erroAuth.statusCode = 401;
          throw erroAuth;
        }
        throw err;
      }
    }

    // 3. Monta histórico recente para contexto (até 10 mensagens anteriores concluídas)
    const mensagensAnteriores = await conversaRepository.listarMensagensPorConversa(idConversaAtiva, usuario_id) || [];

    // Se já houver mensagem sendo processada nesta conversa, bloqueia duplicidade simultânea
    const temProcessando = mensagensAnteriores.some(m => m.status === 'processando');
    if (temProcessando) {
      const erro = new Error('Já existe uma pergunta sendo processada nesta conversa. Aguarde a resposta ser concluída.');
      erro.statusCode = 409;
      throw erro;
    }

    const historicoRecente = mensagensAnteriores
      .filter(m => m.status === 'concluida' && m.conteudo)
      .slice(-10)
      .map(m => ({
        papel: m.papel,
        texto: m.conteudo
      }));

    // 4. Salva a pergunta do usuário
    const msgUsuarioId = await conversaRepository.salvarMensagem(
      idConversaAtiva,
      'usuario',
      mensagemLimpa,
      null,
      null,
      null,
      'concluida'
    );

    // 5. Gera token restrito de operação (scoped token) de 15 minutos para as tools do MCP
    const tenantToken = jwt.sign(
      {
        id: usuario_id,
        scope: 'assistente:operator'
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Modo Assíncrono (Short-polling)
    if (assincrono) {
      const msgAssistenteId = await conversaRepository.salvarMensagem(
        idConversaAtiva,
        'assistente',
        null,
        null,
        null,
        null,
        'processando',
        null
      );

      // Dispara em background sem segurar a requisição HTTP
      this._executarProcessamentoBackground({
        msgAssistenteId,
        idConversaAtiva,
        usuario_id,
        tenantToken,
        mensagemLimpa,
        historicoRecente
      }).catch(err => {
        console.error(`[Assistente] Erro de background na mensagem ${msgAssistenteId}:`, err);
      });

      return {
        conversa_id: idConversaAtiva,
        mensagem_usuario_id: msgUsuarioId,
        mensagem: {
          id: msgAssistenteId,
          conversa_id: idConversaAtiva,
          papel: 'assistente',
          status: 'processando',
          conteudo: null,
          fontes: [],
          criado_em: new Date().toISOString()
        }
      };
    }

    // Modo Síncrono (Padrão para retrocompatibilidade)
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

    // Salva a resposta do assistente
    const msgId = await conversaRepository.salvarMensagem(
      idConversaAtiva,
      'assistente',
      respostaAi.resposta,
      respostaAi.fontes || [],
      respostaAi.tools_usadas || [],
      respostaAi.rag_backend || 'none',
      'concluida'
    );

    return {
      conversa_id: idConversaAtiva,
      mensagem: {
        id: msgId,
        conversa_id: idConversaAtiva,
        papel: 'assistente',
        status: 'concluida',
        conteudo: respostaAi.resposta,
        fontes: respostaAi.fontes || [],
        criado_em: new Date().toISOString()
      }
    };
  },

  async _executarProcessamentoBackground({
    msgAssistenteId,
    idConversaAtiva,
    usuario_id,
    tenantToken,
    mensagemLimpa,
    historicoRecente
  }) {
    try {
      const respostaAi = await aiServiceClient.enviarMensagem({
        tenant_id: usuario_id,
        tenant_token: tenantToken,
        mensagem: mensagemLimpa,
        historico: historicoRecente
      });

      await conversaRepository.atualizarMensagem(msgAssistenteId, {
        conteudo: respostaAi.resposta,
        fontes: respostaAi.fontes || [],
        tools_usadas: respostaAi.tools_usadas || [],
        rag_backend: respostaAi.rag_backend || 'none',
        status: 'concluida'
      });
    } catch (err) {
      console.error(`[Assistente] Falha no processamento em segundo plano da mensagem ${msgAssistenteId}:`, err);
      const mensagemErro = err.message || 'Assistente IA temporariamente indisponível. Tente novamente em instantes.';
      await conversaRepository.atualizarMensagem(msgAssistenteId, {
        conteudo: mensagemErro,
        status: 'erro',
        erro_mensagem: mensagemErro
      });
    }
  },

  async buscarStatusMensagem(mensagem_id, usuario_id) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    const msg = await conversaRepository.buscarMensagemPorId(mensagem_id, usuario_id);
    if (!msg) {
      const erro = new Error('Mensagem não encontrada');
      erro.statusCode = 404;
      throw erro;
    }

    return {
      id: msg.id,
      conversa_id: msg.conversa_id,
      papel: msg.papel,
      status: msg.status,
      erro_mensagem: msg.erro_mensagem,
      conteudo: msg.conteudo,
      fontes: msg.fontes || [],
      tools_usadas: msg.tools_usadas || [],
      criado_em: msg.criado_em
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
