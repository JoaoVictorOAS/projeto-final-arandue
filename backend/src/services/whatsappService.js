const fs = require('fs');
const qrcode = require('qrcode-terminal');
const path = require('path');
const pino = require('pino');
const usuarioRepository = require('../repositories/usuarioRepository');
const conversaRepository = require('../repositories/conversaRepository');
const assistenteService = require('./assistenteService');
const { normalizarNumeroWhatsApp } = require('../utils/phoneUtils');
const { converterMarkdownParaWhatsApp } = require('../utils/formatadorWhatsApp');

let baileysPkg = null;
function carregarBaileys() {
  if (!baileysPkg) {
    try {
      baileysPkg = require('@whiskeysockets/baileys');
    } catch (e) {
      baileysPkg = {};
    }
  }
  return baileysPkg;
}

/**
 * Serviço Gateway de integração com WhatsApp Web (Multi-Device via Baileys).
 * Transforma o número corporativo da plataforma Aranduê no copiloto de IA do MEI.
 */
class WhatsAppService {
  constructor() {
    this.sock = null;
    this.status = 'desconectado'; // 'desconectado' | 'aguardando_qr' | 'conectando' | 'conectado' | 'erro'
    this.qrCode = null;
    this.numeroBot = null;
    this.lidBot = null;
    this.authPath = process.env.WHATSAPP_AUTH_DIR || path.resolve(__dirname, '../../.wweb_auth_baileys');
    this.inicializado = false;
    this.filasPorJid = new Map();
    this.mensagensEnviadasPeloBot = new Set();
    this.textosEnviadosPeloBot = new Set();
    this.mensagensProcessadas = new Set();
  }

  /**
   * Retorna o status atual da conexão do WhatsApp.
   * O qrCode é omitido por padrão para proteger o gateway compartilhado, sendo exposto apenas via admin.
   * @param {boolean} [isAdmin=false]
   */
  obterStatus(isAdmin = false) {
    const statusObj = {
      status: this.status,
      conectado: this.status === 'conectado',
      numero: this.numeroBot
    };
    if (isAdmin) {
      statusObj.qrCode = this.qrCode;
    }
    return statusObj;
  }

  /**
   * Retorna o status administrativo completo da conexão do WhatsApp (com qrCode).
   */
  obterStatusAdmin() {
    return this.obterStatus(true);
  }

  /**
   * Resolve um JID (incluindo o formato Multi-Device @lid do WhatsApp) para o número de telefone real.
   * @param {string} jid - JID original (ex: 136361000607750@lid ou 556699001680@s.whatsapp.net)
   * @param {Object|null} [msgKey=null] - Chave completa da mensagem (pode conter remoteJidAlt / participantAlt)
   * @returns {string} Identificador contendo os dígitos do telefone
   */
  resolverIdentificadorTelefone(jid, msgKey = null) {
    if (!jid || typeof jid !== 'string') return '';

    // 1. Verifica campos alternativos de PN fornecidos pelo Baileys v7
    const altJid = msgKey?.remoteJidAlt || msgKey?.participantAlt;
    if (altJid && typeof altJid === 'string' && !altJid.endsWith('@lid')) {
      return altJid;
    }

    // 2. Se for um JID no formato @lid (Linked Identity do WhatsApp Multi-Device)
    if (jid.includes('@lid')) {
      const lidLimpo = jid.replace(/[:@].*$/, '').trim();
      const lidBotAtual =
        this.lidBot ||
        this.sock?.user?.lid?.replace(/[:@].*$/, '') ||
        this.sock?.authState?.creds?.me?.lid?.replace(/[:@].*$/, '') ||
        null;
      const numeroBotAtual =
        this.numeroBot ||
        this.sock?.user?.id?.replace(/[:@].*$/, '') ||
        this.sock?.authState?.creds?.me?.id?.replace(/[:@].*$/, '') ||
        null;

      // Se o LID for o do próprio número conectado no bot (mensagem para si mesmo)
      if (lidBotAtual && lidLimpo === lidBotAtual && numeroBotAtual) {
        return numeroBotAtual;
      }

      // Consulta o mapeamento reverso salvo pelo Baileys na pasta de autenticação
      if (lidLimpo && this.authPath) {
        try {
          const reversePath = path.join(this.authPath, `lid-mapping-${lidLimpo}_reverse.json`);
          if (fs.existsSync(reversePath)) {
            const raw = fs.readFileSync(reversePath, 'utf8');
            const mappedPn = JSON.parse(raw);
            if (mappedPn && typeof mappedPn === 'string') {
              return mappedPn;
            }
          }
        } catch (err) {
          // Ignora erro de leitura de mapeamento e segue fallback
        }
      }
    }

    return jid;
  }

  /**
   * Extrai o texto de dentro do objeto de mensagem do WhatsApp,
   * desenvelopando mensagens temporárias (ephemeral), viewOnce ou enviadas por dispositivos vinculados.
   * @param {Object} messageObj
   * @returns {string}
   */
  extrairTextoMensagem(messageObj) {
    if (!messageObj || typeof messageObj !== 'object') return '';

    const inner =
      messageObj.ephemeralMessage?.message ||
      messageObj.viewOnceMessage?.message ||
      messageObj.viewOnceMessageV2?.message ||
      messageObj.deviceSentMessage?.message ||
      messageObj.documentWithCaptionMessage?.message ||
      messageObj.editedMessage?.message?.protocolMessage?.editedMessage ||
      messageObj;

    return (
      inner.conversation ||
      inner.extendedTextMessage?.text ||
      inner.imageMessage?.caption ||
      inner.videoMessage?.caption ||
      ''
    );
  }

  /**
   * Identifica se a mensagem contém anexo de áudio ou imagem.
   * @param {Object} messageObj
   * @returns {Object|null} Metadados da mídia { tipo, mimeType, caption } ou null
   */
  extrairMidiaMensagem(messageObj) {
    if (!messageObj || typeof messageObj !== 'object') return null;

    const inner =
      messageObj.ephemeralMessage?.message ||
      messageObj.viewOnceMessage?.message ||
      messageObj.viewOnceMessageV2?.message ||
      messageObj.deviceSentMessage?.message ||
      messageObj.documentWithCaptionMessage?.message ||
      messageObj.editedMessage?.message?.protocolMessage?.editedMessage ||
      messageObj;

    if (inner.audioMessage) {
      return {
        tipo: 'audio',
        mimeType: inner.audioMessage.mimetype || 'audio/ogg; codecs=opus'
      };
    }

    if (inner.imageMessage) {
      return {
        tipo: 'imagem',
        caption: inner.imageMessage.caption || '',
        mimeType: inner.imageMessage.mimetype || 'image/jpeg'
      };
    }

    return null;
  }

  /**
   * Baixa os dados binários (buffer) de uma mídia do WhatsApp utilizando o Baileys.
   * @param {Object} msg - Mensagem completa do Baileys contendo a mídia
   * @returns {Promise<Buffer|null>}
   */
  async baixarBufferMidia(msg) {
    try {
      const baileys = carregarBaileys();
      const downloadMedia = baileys.downloadMediaMessage;
      if (!downloadMedia || typeof downloadMedia !== 'function') {
        return null;
      }
      return await downloadMedia(
        msg,
        'buffer',
        {},
        {
          reuploadRequest: this.sock?.updateMediaMessage
        }
      );
    } catch (err) {
      console.warn('[WhatsApp] Falha ao baixar mídia da mensagem:', err.message);
      return null;
    }
  }

  /**
   * Inicializa o cliente WhatsApp e escuta os eventos de conexão e mensagens.
   */
  async inicializar() {
    if (this.inicializado && this.sock) {
      return;
    }

    this.status = 'conectando';
    this.inicializado = true;

    try {
      const baileys = carregarBaileys();
      const makeWASocket = baileys.default || baileys.makeWASocket;
      const useMultiFileAuthState = baileys.useMultiFileAuthState;
      const DisconnectReason = baileys.DisconnectReason || { loggedOut: 401 };

      if (!makeWASocket || !useMultiFileAuthState) {
        if (process.env.NODE_ENV === 'test') {
          this.status = 'aguardando_qr';
          this.qrCode = 'mock_qr_code_teste';
          return;
        }
        throw new Error('Módulo @whiskeysockets/baileys não pôde ser carregado');
      }

      // Garante que o diretório de autenticação existe antes de ler/gravar credenciais
      if (!fs.existsSync(this.authPath)) {
        fs.mkdirSync(this.authPath, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.authPath);

      if (this.sock) {
        try {
          this.sock.ev?.removeAllListeners?.();
        } catch (e) {}
        try {
          this.sock.end?.();
        } catch (e) {}
        this.sock = null;
      }

      const socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' })
      });
      this.sock = socket;

      socket.ev.on('creds.update', async () => {
        try {
          if (!fs.existsSync(this.authPath)) {
            fs.mkdirSync(this.authPath, { recursive: true });
          }
          await saveCreds();
        } catch (saveErr) {
          console.warn('[WhatsApp] Aviso ao salvar credenciais Baileys:', saveErr.message);
        }
      });

      socket.ev.on('connection.update', (update) => {
        if (this.sock !== socket) {
          return;
        }

        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.status = 'aguardando_qr';
          this.qrCode = qr;

          console.log('\n===============================================================');
          console.log('📱 ESCANEIE O QR CODE ABAIXO NO SEU WHATSAPP OFICIAL DO ARANDUÊ:');
          console.log('===============================================================\n');
          qrcode.generate(qr, { small: true });
          console.log('\n===============================================================\n');
        }

        if (connection === 'close') {
          this.status = 'desconectado';
          this.qrCode = null;
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const deveReconectar = statusCode !== DisconnectReason.loggedOut;

          console.log(`[WhatsApp] Conexão encerrada (Status: ${statusCode || 'desconhecido'}). Reconectando: ${deveReconectar}`);

          try {
            socket.ev?.removeAllListeners?.();
          } catch (e) {}
          try {
            socket.end?.();
          } catch (e) {}
          if (this.sock === socket) {
            this.sock = null;
          }

          if (deveReconectar) {
            this.inicializado = false;
            setTimeout(() => this.inicializar(), 3000);
          } else {
            console.warn('[WhatsApp] Desconectado por logout. Limpando credenciais antigas para novo pareamento...');
            this.inicializado = false;
            this.numeroBot = null;
            this.lidBot = null;
            if (fs.existsSync(this.authPath)) {
              try {
                fs.rmSync(this.authPath, { recursive: true, force: true });
              } catch (e) {}
            }
          }
        } else if (connection === 'open') {
          this.status = 'conectado';
          this.qrCode = null;
          this.numeroBot = socket.user?.id?.replace(/[:@].*$/, '') || null;
          this.lidBot = socket.user?.lid?.replace(/[:@].*$/, '') || null;
          console.log(`[WhatsApp] ✅ Conectado com sucesso ao número oficial do Aranduê: ${this.numeroBot || ''}!`);
        }
      });

      socket.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify' && type !== 'append') return;

        for (const msg of messages) {
          if (type === 'append') {
            // Ignora sincronização de histórico antigo; aceita apenas mensagens recentes (últimos 30s)
            const ts = Number(msg?.messageTimestamp || 0);
            const agoraSegundos = Math.floor(Date.now() / 1000);
            if (!ts || Math.abs(agoraSegundos - ts) > 30) continue;
          }
          this.tratarMensagemUpsert(msg);
        }
      });
    } catch (err) {
      this.status = 'erro';
      this.inicializado = false;
      console.error('[WhatsApp] Falha ao inicializar socket Baileys:', err);
    }
  }

  /**
   * Avalia uma mensagem recebida no evento messages.upsert.
   * Suporta mensagens de terceiros e mensagens para o próprio número ("conversar consigo mesmo"),
   * inclusive quando endereçadas via LID (@lid) no WhatsApp Multi-Device,
   * aplicando proteção estrita contra loops infinitos.
   * @param {Object} msg - Mensagem recebida do Baileys
   * @returns {boolean} True se a mensagem foi aceita e enfileirada, False se descartada
   */
  tratarMensagemUpsert(msg) {
    if (!msg || !msg.message) return false;
    const jid = msg.key?.remoteJid;
    const msgId = msg.key?.id;

    // 1. Ignora mensagens enviadas pelo próprio bot como resposta (proteção anti-loop por ID)
    if (msgId && this.mensagensEnviadasPeloBot.has(msgId)) {
      this.mensagensEnviadasPeloBot.delete(msgId);
      return false;
    }

    // 2. Evita processar a mesma mensagem duas vezes (caso chegue em notify e append)
    if (msgId && this.mensagensProcessadas.has(msgId)) {
      return false;
    }

    // 3. Ignora mensagens de grupos ou transmissões de status
    if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') return false;

    // 4. Extrai o texto e/ou mídia da mensagem
    const midiaInfo = this.extrairMidiaMensagem(msg.message);
    const texto = this.extrairTextoMensagem(msg.message);
    const textoLimpo = (texto && typeof texto === 'string') ? texto.trim() : '';

    if (!textoLimpo && !midiaInfo) return false;

    // Proteção adicional anti-loop por conteúdo exato recém-enviado pelo bot
    if (msg.key?.fromMe && textoLimpo && this.textosEnviadosPeloBot.has(textoLimpo)) {
      this.textosEnviadosPeloBot.delete(textoLimpo);
      return false;
    }

    // 5. Suporte a "Conversar consigo mesmo" (self-message):
    // Resolve o telefone mesmo que o WhatsApp tenha enviado o JID no formato @lid
    const identificadorResolvido = this.resolverIdentificadorTelefone(jid, msg.key);
    const telJid = normalizarNumeroWhatsApp(identificadorResolvido);
    const numeroBotAtual =
      this.numeroBot ||
      this.sock?.user?.id?.replace(/[:@].*$/, '') ||
      null;
    const lidBotAtual =
      this.lidBot ||
      this.sock?.user?.lid?.replace(/[:@].*$/, '') ||
      null;
    const telBot = numeroBotAtual ? normalizarNumeroWhatsApp(numeroBotAtual) : null;
    const jidLimpo = jid.replace(/[:@].*$/, '');

    const ehMensagemParaSiMesmo = Boolean(
      msg.key?.fromMe &&
      (
        (lidBotAtual && jid.includes('@lid') && jidLimpo === lidBotAtual) ||
        (telBot && telJid.variacoes.some(v => telBot.variacoes.includes(v)))
      )
    );

    // Se for mensagem enviada pelo usuário para OUTRA pessoa (fora do bot), ignora
    if (msg.key?.fromMe && !ehMensagemParaSiMesmo) return false;

    if (msgId) {
      this.mensagensProcessadas.add(msgId);
      if (this.mensagensProcessadas.size > 500) {
        const primeiro = this.mensagensProcessadas.values().next().value;
        this.mensagensProcessadas.delete(primeiro);
      }
    }

    // 6. Enfileira para processamento sequencial e seguro
    if (midiaInfo) {
      this._enfileirarMensagem(jid, textoLimpo, msg.key, midiaInfo, msg);
    } else {
      this._enfileirarMensagem(jid, textoLimpo, msg.key);
    }
    return true;
  }

  /**
   * Enfileira mensagens recebidas para garantir processamento sequencial e ordenado por remetente.
   */
  _enfileirarMensagem(jid, texto, msgKey = null, midiaInfo = null, fullMsg = null) {
    const filaAtual = this.filasPorJid.get(jid) || Promise.resolve();
    const proximaExecucao = filaAtual
      .then(() => this.processarMensagemRecebida(jid, texto, msgKey, midiaInfo, fullMsg))
      .catch((err) => {
        console.error(`[WhatsApp] Erro não tratado na fila de ${jid}:`, err);
      });

    this.filasPorJid.set(jid, proximaExecucao);
  }

  /**
   * Processa uma mensagem individual recebida no WhatsApp.
   * @param {string} jid - Remote JID do remetente
   * @param {string} texto - Conteúdo textual enviado
   * @param {Object|null} [msgKey=null] - Metadados da chave da mensagem
   * @param {Object|null} [midiaInfo=null] - Informações de tipo e mime type da mídia
   * @param {Object|null} [fullMsg=null] - Mensagem completa do Baileys para download
   */
  async processarMensagemRecebida(jid, texto, msgKey = null, midiaInfo = null, fullMsg = null) {
    try {
      const identificadorTelefone = this.resolverIdentificadorTelefone(jid, msgKey);
      const tel = normalizarNumeroWhatsApp(identificadorTelefone);

      // 1. Identifica o MEI a partir do número de telefone (com DDI, sem DDI, com 9 ou sem 9)
      const usuario = await usuarioRepository.buscarPorTelefoneOuWhatsapp(tel.variacoes);

      if (!usuario) {
        const responderNaoCadastrados = process.env.WHATSAPP_RESPONDER_NAO_CADASTRADOS === 'true';
        if (!responderNaoCadastrados) {
          // Modo padrão: responde somente a números previamente cadastrados no sistema
          return;
        }

        const msgOrientacao = `Olá! Sou o *Assistente Aranduê*, seu parceiro inteligente para gestão do MEI. 👋\n\n⚠️ *Atenção:* Este número de telefone ainda não está vinculado a uma conta Aranduê.\n\nPara conversar comigo por aqui e gerenciar suas finanças, estoque e clientes:\n1. Acesse o sistema Aranduê.\n2. Em *Configurações*, informe seu número de WhatsApp com DDD.\n3. Volte aqui e envie uma mensagem!`;
        this.textosEnviadosPeloBot.add(msgOrientacao.trim());
        const sentNaoCad = await this.sock.sendMessage(jid, { text: msgOrientacao });
        if (sentNaoCad?.key?.id) {
          this.mensagensEnviadasPeloBot.add(sentNaoCad.key.id);
        }
        return;
      }

      if (process.env.NODE_ENV !== 'test') {
        console.log(`[WhatsApp] 📩 Mensagem recebida para usuário ${usuario.id} (texto: ${texto?.length || 0}, midia: ${midiaInfo?.tipo || 'nenhuma'})`);
      }

      // 2. Feedback visual imediato: indica "digitando..." ou "gravando..." no WhatsApp
      const presenca = midiaInfo?.tipo === 'audio' ? 'recording' : 'composing';
      await this.sock.sendPresenceUpdate(presenca, jid);

      // 3. Localiza ou cria a conversa do canal WhatsApp para este usuário
      let conversa = await conversaRepository.buscarConversaAtivaPorCanal(usuario.id, 'whatsapp');
      let conversaId = conversa?.id;

      if (!conversaId) {
        conversaId = await conversaRepository.criarConversa(
          usuario.id,
          'WhatsApp - Assistente Aranduê',
          'whatsapp'
        );
      }

      // 4. Prepara payload multimodal se houver mídia
      let midiaPayload = null;
      let tipoMidia = 'texto';
      let textoParaEnvio = texto;

      if (midiaInfo && fullMsg) {
        tipoMidia = midiaInfo.tipo;
        const buffer = await this.baixarBufferMidia(fullMsg);
        if (buffer) {
          midiaPayload = {
            tipo: midiaInfo.tipo,
            dados_base64: buffer.toString('base64'),
            mime_type: midiaInfo.mimeType
          };
          if (tipoMidia === 'imagem' && !textoParaEnvio) {
            textoParaEnvio = midiaInfo.caption || 'Analise a imagem enviada pelo MEI e sugira ou execute as ações cabíveis.';
          }
        } else {
          console.warn(`[WhatsApp] Não foi possível baixar buffer de mídia (${tipoMidia}) da mensagem ${msgKey?.id}`);
        }
      }

      // 5. Executa a mensagem no assistente via pipeline oficial (gera scoped token e chama ai-service com MCP)
      const payloadEnvio = {
        conversa_id: conversaId,
        mensagem: textoParaEnvio,
        canal: 'whatsapp',
        assincrono: false
      };
      if (midiaPayload) {
        payloadEnvio.midia = midiaPayload;
        payloadEnvio.tipo_midia = tipoMidia;
      }
      const resultado = await assistenteService.enviarMensagem(usuario.id, payloadEnvio);

      // 6. Converte o Markdown rico da IA para a formatação do WhatsApp
      const conteudoBruto = resultado?.mensagem?.conteudo || 'Solicitação processada com sucesso.';
      const respostaFormatada = converterMarkdownParaWhatsApp(conteudoBruto);

      // 7. Finaliza indicador de digitação e envia a resposta com proteção anti-loop prévia
      await this.sock.sendPresenceUpdate('paused', jid);
      this.textosEnviadosPeloBot.add(respostaFormatada.trim());
      if (this.textosEnviadosPeloBot.size > 200) {
        const primeiroTexto = this.textosEnviadosPeloBot.values().next().value;
        this.textosEnviadosPeloBot.delete(primeiroTexto);
      }

      const sent = await this.sock.sendMessage(jid, { text: respostaFormatada });
      if (sent?.key?.id) {
        this.mensagensEnviadasPeloBot.add(sent.key.id);
        if (this.mensagensEnviadasPeloBot.size > 500) {
          const primeiro = this.mensagensEnviadasPeloBot.values().next().value;
          this.mensagensEnviadasPeloBot.delete(primeiro);
        }
      }

      if (process.env.NODE_ENV !== 'test') {
        const preview = respostaFormatada.length > 120 ? respostaFormatada.slice(0, 117) + '...' : respostaFormatada;
        console.log(`[WhatsApp] ✅ Resposta enviada para usuário ${usuario.id} (${tipoMidia}) -> «${preview.replace(/\n/g, ' ')}»`);
      }

    } catch (error) {
      console.error(`[WhatsApp] Erro ao responder mensagem para ${jid}:`, error.message);
      
      const mensagemErro = error.statusCode === 429
        ? `⚠️ *Aranduê:* ${error.message}`
        : `⚠️ *Aranduê:* Desculpe, não consegui processar sua mensagem agora. Por favor, tente novamente em instantes.`;

      try {
        await this.sock.sendPresenceUpdate('paused', jid);
        this.textosEnviadosPeloBot.add(mensagemErro.trim());
        const sentErr = await this.sock.sendMessage(jid, { text: mensagemErro });
        if (sentErr?.key?.id) {
          this.mensagensEnviadasPeloBot.add(sentErr.key.id);
        }
      } catch (sendErr) {
        console.error('[WhatsApp] Falha ao enviar mensagem de erro:', sendErr.message);
      }
    }
  }

  /**
   * Encerra a conexão do cliente WhatsApp.
   */
  async desconectar() {
    if (this.sock) {
      const activeSock = this.sock;
      try {
        await activeSock.logout();
      } catch (e) {
        // Ignora erro no logout
      }
      try {
        activeSock.ev?.removeAllListeners?.();
      } catch (e) {}
      try {
        activeSock.end?.();
      } catch (e) {}
      this.sock = null;
    }
    this.status = 'desconectado';
    this.inicializado = false;
    this.qrCode = null;
  }

  /**
   * Força o encerramento da sessão atual, remove as credenciais locais e reinicializa gerando um novo QR Code.
   */
  async gerarNovoQrCode() {
    await this.desconectar();

    if (fs.existsSync(this.authPath)) {
      try {
        fs.rmSync(this.authPath, { recursive: true, force: true });
      } catch (err) {
        console.warn('[WhatsApp] Erro ao limpar pasta de auth:', err.message);
      }
    }

    fs.mkdirSync(this.authPath, { recursive: true });

    this.status = 'conectando';
    this.numeroBot = null;
    this.lidBot = null;
    this.qrCode = null;

    await this.inicializar();
    return this.obterStatusAdmin();
  }
}

module.exports = new WhatsAppService();
