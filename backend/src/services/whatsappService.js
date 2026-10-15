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
    this.authPath = process.env.WHATSAPP_AUTH_DIR || path.resolve(__dirname, '../../.wweb_auth_baileys');
    this.inicializado = false;
    this.filasPorJid = new Map();
    this.mensagensEnviadasPeloBot = new Set();
  }

  /**
   * Retorna o status atual da conexão do WhatsApp.
   */
  obterStatus() {
    return {
      status: this.status,
      conectado: this.status === 'conectado',
      numero: this.numeroBot,
      qrCode: this.qrCode
    };
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

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' })
      });

      this.sock.ev.on('creds.update', async () => {
        try {
          if (!fs.existsSync(this.authPath)) {
            fs.mkdirSync(this.authPath, { recursive: true });
          }
          await saveCreds();
        } catch (saveErr) {
          console.warn('[WhatsApp] Aviso ao salvar credenciais Baileys:', saveErr.message);
        }
      });

      this.sock.ev.on('connection.update', (update) => {
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
          if (deveReconectar) {
            this.inicializado = false;
            setTimeout(() => this.inicializar(), 3000);
          } else {
            console.warn('[WhatsApp] Desconectado por logout. Limpando credenciais antigas para novo pareamento...');
            this.inicializado = false;
            this.numeroBot = null;
            if (fs.existsSync(this.authPath)) {
              try {
                fs.rmSync(this.authPath, { recursive: true, force: true });
              } catch (e) {}
            }
          }
        } else if (connection === 'open') {
          this.status = 'conectado';
          this.qrCode = null;
          this.numeroBot = this.sock.user?.id?.replace(/[:@].*$/, '') || null;
          console.log(`[WhatsApp] ✅ Conectado com sucesso ao número oficial do Aranduê: ${this.numeroBot || ''}!`);
        }
      });

      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
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
   * aplicando proteção estrita contra loops infinitos.
   * @param {Object} msg - Mensagem recebida do Baileys
   * @returns {boolean} True se a mensagem foi aceita e enfileirada, False se descartada
   */
  tratarMensagemUpsert(msg) {
    if (!msg || !msg.message) return false;
    const jid = msg.key?.remoteJid;
    const msgId = msg.key?.id;

    // 1. Ignora mensagens enviadas pelo próprio bot como resposta (proteção anti-loop)
    if (msgId && this.mensagensEnviadasPeloBot.has(msgId)) {
      this.mensagensEnviadasPeloBot.delete(msgId);
      return false;
    }

    // 2. Ignora mensagens de grupos ou transmissões de status
    if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') return false;

    // 3. Suporte a "Conversar consigo mesmo" (self-message):
    // Quando o usuário envia mensagem para seu próprio número, msg.key.fromMe é true
    const telJid = normalizarNumeroWhatsApp(jid);
    const telBot = this.numeroBot ? normalizarNumeroWhatsApp(this.numeroBot) : null;
    const ehMensagemParaSiMesmo = Boolean(
      msg.key?.fromMe &&
      telBot &&
      telJid.variacoes.some(v => telBot.variacoes.includes(v))
    );

    // Se for mensagem enviada pelo usuário para OUTRA pessoa (fora do bot), ignora
    if (msg.key?.fromMe && !ehMensagemParaSiMesmo) return false;

    // 4. Extrai o texto da mensagem
    const texto = msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      '';

    if (!texto || !texto.trim()) return false;

    // 5. Enfileira para processamento sequencial e seguro
    this._enfileirarMensagem(jid, texto.trim());
    return true;
  }

  /**
   * Enfileira mensagens recebidas para garantir processamento sequencial e ordenado por remetente.
   */
  _enfileirarMensagem(jid, texto) {
    const filaAtual = this.filasPorJid.get(jid) || Promise.resolve();
    const proximaExecucao = filaAtual
      .then(() => this.processarMensagemRecebida(jid, texto))
      .catch((err) => {
        console.error(`[WhatsApp] Erro não tratado na fila de ${jid}:`, err);
      });

    this.filasPorJid.set(jid, proximaExecucao);
  }

  /**
   * Processa uma mensagem individual recebida no WhatsApp.
   * @param {string} jid - Remote JID do remetente
   * @param {string} texto - Conteúdo textual enviado
   */
  async processarMensagemRecebida(jid, texto) {
    try {
      const tel = normalizarNumeroWhatsApp(jid);

      // 1. Identifica o MEI a partir do número de telefone (com DDI, sem DDI, com 9 ou sem 9)
      const usuario = await usuarioRepository.buscarPorTelefoneOuWhatsapp(tel.variacoes);

      if (!usuario) {
        const responderNaoCadastrados = process.env.WHATSAPP_RESPONDER_NAO_CADASTRADOS === 'true';
        if (!responderNaoCadastrados) {
          // Modo padrão: responde somente a números previamente cadastrados no sistema
          return;
        }

        await this.sock.sendMessage(jid, {
          text: `Olá! Sou o *Assistente Aranduê*, seu parceiro inteligente para gestão do MEI. 👋\n\n⚠️ *Atenção:* Este número de telefone ainda não está vinculado a uma conta Aranduê.\n\nPara conversar comigo por aqui e gerenciar suas finanças, estoque e clientes:\n1. Acesse o sistema Aranduê.\n2. Em *Configurações*, informe seu número de WhatsApp com DDD.\n3. Volte aqui e envie uma mensagem!`
        });
        return;
      }

      // 2. Feedback visual imediato: indica "digitando..." no WhatsApp
      await this.sock.sendPresenceUpdate('composing', jid);

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

      // 4. Executa a mensagem no assistente via pipeline oficial (gera scoped token e chama ai-service com MCP)
      const resultado = await assistenteService.enviarMensagem(usuario.id, {
        conversa_id: conversaId,
        mensagem: texto,
        canal: 'whatsapp',
        assincrono: false
      });

      // 5. Converte o Markdown rico da IA para a formatação do WhatsApp
      const conteudoBruto = resultado?.mensagem?.conteudo || 'Solicitação processada com sucesso.';
      const respostaFormatada = converterMarkdownParaWhatsApp(conteudoBruto);

      // 6. Finaliza indicador de digitação e envia a resposta
      await this.sock.sendPresenceUpdate('paused', jid);
      const sent = await this.sock.sendMessage(jid, { text: respostaFormatada });
      if (sent?.key?.id) {
        this.mensagensEnviadasPeloBot.add(sent.key.id);
        if (this.mensagensEnviadasPeloBot.size > 500) {
          const primeiro = this.mensagensEnviadasPeloBot.values().next().value;
          this.mensagensEnviadasPeloBot.delete(primeiro);
        }
      }

    } catch (error) {
      console.error(`[WhatsApp] Erro ao responder mensagem para ${jid}:`, error.message);
      
      const mensagemErro = error.statusCode === 429
        ? `⚠️ *Aranduê:* ${error.message}`
        : `⚠️ *Aranduê:* Desculpe, não consegui processar sua mensagem agora. Por favor, tente novamente em instantes.`;

      try {
        await this.sock.sendPresenceUpdate('paused', jid);
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
      try {
        await this.sock.logout();
      } catch (e) {
        // Ignora erro no logout
      }
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
    this.qrCode = null;

    await this.inicializar();
    return this.obterStatus();
  }
}

module.exports = new WhatsAppService();
