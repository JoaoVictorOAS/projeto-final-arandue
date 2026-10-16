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

const MIME_TYPES_VALIDOS = {
  audio: new Set(['audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/wav', 'audio/x-wav']),
  imagem: new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
};

/**
 * Valida o tipo MIME de arquivos de mídia (áudio ou imagem),
 * preservando parâmetros válidos (ex: 'audio/ogg; codecs=opus') e
 * rejeitando tipos não suportados ou com tamanho superior a 50 caracteres.
 *
 * @param {string} mimeType - Valor do MIME type a ser validado
 * @param {'audio'|'imagem'} tipoEsperado - Tipo esperado da mídia
 * @returns {string} O MIME type validado e higienizado
 */
function validarMimeType(mimeType, tipoEsperado) {
  if (!mimeType || typeof mimeType !== 'string') {
    const erro = new Error('Tipo MIME é obrigatório para anexos de mídia');
    erro.statusCode = 400;
    throw erro;
  }

  const mimeTrimmed = mimeType.trim();

  if (mimeTrimmed.length > 50) {
    const erro = new Error('O formato MIME da mídia não pode exceder 50 caracteres');
    erro.statusCode = 400;
    throw erro;
  }

  const partes = mimeTrimmed.split(';');
  const baseType = partes[0].trim().toLowerCase();

  const permitidos = tipoEsperado === 'audio'
    ? MIME_TYPES_VALIDOS.audio
    : MIME_TYPES_VALIDOS.imagem;

  if (!permitidos || !permitidos.has(baseType)) {
    const erro = new Error(
      `Formato MIME não suportado para ${tipoEsperado === 'audio' ? 'áudio' : 'imagem'}: "${baseType}". Formatos aceitos: ${Array.from(permitidos).join(', ')}`
    );
    erro.statusCode = 400;
    throw erro;
  }

  if (partes.length > 1) {
    for (let i = 1; i < partes.length; i++) {
      const param = partes[i].trim();
      if (!param || !param.includes('=')) {
        const erro = new Error(`Parâmetro de tipo MIME inválido: "${param}"`);
        erro.statusCode = 400;
        throw erro;
      }
    }
  }

  return mimeTrimmed;
}

const assistenteService = {
  /**
   * Envia uma mensagem no assistente e processa a resposta (suporta síncrono ou assíncrono).
   */
  async enviarMensagem(usuario_id, { conversa_id, mensagem, midia = null, tipo_midia = 'texto', assincrono = false, canal = 'web' }) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    let tipoMidiaEfetivo = tipo_midia || (midia?.tipo ? midia.tipo : 'texto');
    let textoMensagem = (mensagem && typeof mensagem === 'string') ? mensagem.trim() : '';
    let transcricaoAudio = null;

    // Se for mensagem de áudio
    if (tipoMidiaEfetivo === 'audio') {
      if (!midia || !midia.dados_base64) {
        const erro = new Error('Os dados de áudio são obrigatórios para mensagens de voz');
        erro.statusCode = 400;
        throw erro;
      }
      const mimeValidado = validarMimeType(midia.mime_type || 'audio/ogg', 'audio');
      midia.mime_type = mimeValidado;

      // Se não veio texto, transcreve usando aiServiceClient
      if (!textoMensagem) {
        try {
          const resultadoTranscricao = await aiServiceClient.transcreverAudio({
            audio_base64: midia.dados_base64,
            mime_type: midia.mime_type
          });
          const transcricao = (resultadoTranscricao?.transcricao || '').trim();
          if (!transcricao) {
            const erro = new Error('Não foi possível identificar conteúdo de fala no áudio enviado. Por favor, tente gravar novamente ou digite sua mensagem.');
            erro.statusCode = 400;
            throw erro;
          }
          textoMensagem = transcricao;
          transcricaoAudio = textoMensagem;
        } catch (transcErr) {
          console.warn('[Assistente] Falha ao transcrever áudio:', transcErr.message);
          const statusCode = transcErr.statusCode || 500;
          const mensagemErro = (transcErr.message && !transcErr.message.includes('status '))
            ? transcErr.message
            : 'Não foi possível transcrever o áudio enviado. Por favor, tente novamente ou digite sua mensagem.';
          const erro = new Error(mensagemErro);
          erro.statusCode = statusCode;
          throw erro;
        }
      } else {
        transcricaoAudio = textoMensagem;
      }
    } else if (tipoMidiaEfetivo === 'imagem') {
      if (!midia || !midia.dados_base64) {
        const erro = new Error('Os dados da imagem são obrigatórios para mensagens visuais');
        erro.statusCode = 400;
        throw erro;
      }
      const mimeValidado = validarMimeType(midia.mime_type || 'image/jpeg', 'imagem');
      midia.mime_type = mimeValidado;

      if (!textoMensagem) {
        textoMensagem = 'Por favor, analise a imagem enviada pelo MEI e responda ou sugira ações operacionais.';
      }
    } else {
      tipoMidiaEfetivo = 'texto';
      if (!textoMensagem) {
        const erro = new Error('O conteúdo da mensagem é obrigatório');
        erro.statusCode = 400;
        throw erro;
      }
    }

    if (textoMensagem.length > 2000) {
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
      const titulo = textoMensagem.length > 60 ? textoMensagem.slice(0, 57) + '...' : textoMensagem;
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

    // 4. Salva a pergunta do usuário com os campos multimodais
    const msgUsuarioId = await conversaRepository.salvarMensagem(
      idConversaAtiva,
      'usuario',
      textoMensagem,
      null,
      null,
      null,
      'concluida',
      null,
      tipoMidiaEfetivo,
      midia?.mime_type || null,
      transcricaoAudio
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
        mensagemLimpa: textoMensagem,
        historicoRecente,
        midia
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
      const payloadAi = {
        tenant_id: usuario_id,
        tenant_token: tenantToken,
        mensagem: textoMensagem,
        historico: historicoRecente
      };
      // Repassa anexo de mídia somente se for imagem (para visão computacional).
      // Se for áudio, o texto já foi integralmente transcrito, evitando eco e sobrecarga desnecessária.
      if (midia && midia.tipo === 'imagem') {
        payloadAi.midia = midia;
      }
      respostaAi = await aiServiceClient.enviarMensagem(payloadAi);
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
    historicoRecente,
    midia = null
  }) {
    try {
      const payloadAi = {
        tenant_id: usuario_id,
        tenant_token: tenantToken,
        mensagem: mensagemLimpa,
        historico: historicoRecente
      };
      if (midia && midia.tipo === 'imagem') {
        payloadAi.midia = midia;
      }
      const respostaAi = await aiServiceClient.enviarMensagem(payloadAi);

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

  async transcreverAudio(usuario_id, { audio_base64, mime_type = 'audio/ogg' }) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }
    if (!audio_base64) {
      const erro = new Error('Os dados de áudio em base64 são obrigatórios');
      erro.statusCode = 400;
      throw erro;
    }
    const mimeValidado = validarMimeType(mime_type || 'audio/ogg', 'audio');
    checkRateLimit(usuario_id);
    return await aiServiceClient.transcreverAudio({ audio_base64, mime_type: mimeValidado });
  },

  async analisarImagem(usuario_id, { imagem_base64, mime_type = 'image/jpeg', instrucao = null }) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }
    if (!imagem_base64) {
      const erro = new Error('Os dados da imagem em base64 são obrigatórios');
      erro.statusCode = 400;
      throw erro;
    }
    const mimeValidado = validarMimeType(mime_type || 'image/jpeg', 'imagem');
    checkRateLimit(usuario_id);
    return await aiServiceClient.analisarImagem({ imagem_base64, mime_type: mimeValidado, instrucao });
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
