const whatsappService = require('../../src/services/whatsappService');
const usuarioRepository = require('../../src/repositories/usuarioRepository');
const conversaRepository = require('../../src/repositories/conversaRepository');
const assistenteService = require('../../src/services/assistenteService');

jest.mock('../../src/repositories/usuarioRepository');
jest.mock('../../src/repositories/conversaRepository');
jest.mock('../../src/services/assistenteService');

describe('WhatsAppService - Gateway do WhatsApp com Assistente IA', () => {
  let mockSock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSock = {
      sendMessage: jest.fn().mockResolvedValue({}),
      sendPresenceUpdate: jest.fn().mockResolvedValue({})
    };

    whatsappService.sock = mockSock;
    whatsappService.status = 'conectado';
    whatsappService.numeroBot = '5511999990000';
  });

  describe('obterStatus', () => {
    it('deve retornar status, indicador de conexao e número do bot omitindo qrCode para tenants', () => {
      whatsappService.qrCode = 'codigo_qr_secreto';
      const status = whatsappService.obterStatus(false);

      expect(status.status).toBe('conectado');
      expect(status.conectado).toBe(true);
      expect(status.numero).toBe('5511999990000');
      expect(status.qrCode).toBeUndefined();
    });

    it('deve expor qrCode apenas quando chamado com privilégio administrativo', () => {
      whatsappService.qrCode = 'codigo_qr_secreto';
      const status = whatsappService.obterStatus(true);

      expect(status.qrCode).toBe('codigo_qr_secreto');
      expect(whatsappService.obterStatusAdmin().qrCode).toBe('codigo_qr_secreto');
    });
  });

  describe('processarMensagemRecebida', () => {
    it('deve ignorar silenciosamente mensagens de números não cadastrados por padrão (WHATSAPP_RESPONDER_NAO_CADASTRADOS=false)', async () => {
      delete process.env.WHATSAPP_RESPONDER_NAO_CADASTRADOS;
      usuarioRepository.buscarPorTelefoneOuWhatsapp.mockResolvedValue(null);

      await whatsappService.processarMensagemRecebida('5511911112222@s.whatsapp.net', 'Olá, tudo bem?');

      expect(usuarioRepository.buscarPorTelefoneOuWhatsapp).toHaveBeenCalled();
      expect(mockSock.sendMessage).not.toHaveBeenCalled();
      expect(assistenteService.enviarMensagem).not.toHaveBeenCalled();
    });

    it('deve enviar mensagem de orientação caso o número não seja cadastrado e WHATSAPP_RESPONDER_NAO_CADASTRADOS=true', async () => {
      process.env.WHATSAPP_RESPONDER_NAO_CADASTRADOS = 'true';
      usuarioRepository.buscarPorTelefoneOuWhatsapp.mockResolvedValue(null);

      await whatsappService.processarMensagemRecebida('5511911112222@s.whatsapp.net', 'Olá, tudo bem?');

      expect(usuarioRepository.buscarPorTelefoneOuWhatsapp).toHaveBeenCalled();
      expect(mockSock.sendMessage).toHaveBeenCalledWith(
        '5511911112222@s.whatsapp.net',
        expect.objectContaining({
          text: expect.stringContaining('Este número de telefone ainda não está vinculado a uma conta Aranduê')
        })
      );
      expect(assistenteService.enviarMensagem).not.toHaveBeenCalled();
      delete process.env.WHATSAPP_RESPONDER_NAO_CADASTRADOS;
    });

    it('deve acionar o assistenteService e responder ao MEI identificado com a resposta formatada', async () => {
      const mockUsuario = {
        id: 42,
        nome: 'João da Silva',
        email: 'joao@mei.com',
        whatsapp: '5511988887777'
      };

      usuarioRepository.buscarPorTelefoneOuWhatsapp.mockResolvedValue(mockUsuario);
      conversaRepository.buscarConversaAtivaPorCanal.mockResolvedValue({ id: 101, titulo: 'WhatsApp' });
      assistenteService.enviarMensagem.mockResolvedValue({
        conversa_id: 101,
        mensagem: {
          conteudo: 'Olá João! Seu saldo atual em caixa é **R$ 2.450,00**.'
        }
      });

      await whatsappService.processarMensagemRecebida('5511988887777@s.whatsapp.net', 'Qual meu saldo?');

      // Verifica envio de estado "digitando..."
      expect(mockSock.sendPresenceUpdate).toHaveBeenCalledWith('composing', '5511988887777@s.whatsapp.net');

      // Verifica chamada ao assistenteService com o ID do MEI e canal whatsapp
      expect(assistenteService.enviarMensagem).toHaveBeenCalledWith(42, {
        conversa_id: 101,
        mensagem: 'Qual meu saldo?',
        canal: 'whatsapp',
        assincrono: false
      });

      // Verifica pausa no status "digitando..."
      expect(mockSock.sendPresenceUpdate).toHaveBeenCalledWith('paused', '5511988887777@s.whatsapp.net');

      // Verifica envio da resposta formatada para WhatsApp (*negrito*)
      expect(mockSock.sendMessage).toHaveBeenCalledWith('5511988887777@s.whatsapp.net', {
        text: 'Olá João! Seu saldo atual em caixa é *R$ 2.450,00*.'
      });
    });

    it('deve criar uma nova conversa do canal whatsapp se nenhuma conversa ativa existir', async () => {
      const mockUsuario = { id: 7, nome: 'Maria Lima', email: 'maria@mei.com' };

      usuarioRepository.buscarPorTelefoneOuWhatsapp.mockResolvedValue(mockUsuario);
      conversaRepository.buscarConversaAtivaPorCanal.mockResolvedValue(null);
      conversaRepository.criarConversa.mockResolvedValue(205);
      assistenteService.enviarMensagem.mockResolvedValue({
        conversa_id: 205,
        mensagem: { conteudo: 'Como posso te ajudar hoje?' }
      });

      await whatsappService.processarMensagemRecebida('5511977776666@s.whatsapp.net', 'Oi');

      expect(conversaRepository.criarConversa).toHaveBeenCalledWith(7, 'WhatsApp - Assistente Aranduê', 'whatsapp');
      expect(assistenteService.enviarMensagem).toHaveBeenCalledWith(7, expect.objectContaining({
        conversa_id: 205
      }));
    });

    it('deve enviar aviso amigável quando ocorrer erro 429 de taxa limite', async () => {
      const mockUsuario = { id: 7, nome: 'Maria Lima' };
      usuarioRepository.buscarPorTelefoneOuWhatsapp.mockResolvedValue(mockUsuario);
      conversaRepository.buscarConversaAtivaPorCanal.mockResolvedValue({ id: 205 });

      const erroRateLimit = new Error('Limite de mensagens atingido (máximo de 20 mensagens por 10 minutos).');
      erroRateLimit.statusCode = 429;
      assistenteService.enviarMensagem.mockRejectedValue(erroRateLimit);

      await whatsappService.processarMensagemRecebida('5511977776666@s.whatsapp.net', 'Mensagem rápida');

      expect(mockSock.sendMessage).toHaveBeenCalledWith('5511977776666@s.whatsapp.net', {
        text: expect.stringContaining('Limite de mensagens atingido')
      });
    });
  });

  describe('tratarMensagemUpsert - Mensagens para o próprio número (Self-Messaging) e Anti-Loop', () => {
    beforeEach(() => {
      whatsappService.numeroBot = '5511999990000';
      whatsappService.lidBot = '136361000607750';
      whatsappService.mensagensEnviadasPeloBot.clear();
      whatsappService.textosEnviadosPeloBot.clear();
      whatsappService.mensagensProcessadas.clear();
      jest.spyOn(whatsappService, '_enfileirarMensagem').mockImplementation(() => {});
    });

    afterEach(() => {
      whatsappService._enfileirarMensagem.mockRestore();
    });

    it('deve aceitar e enfileirar mensagem enviada para si mesmo ("Conversar consigo mesmo")', () => {
      const msgSelf = {
        key: {
          id: 'msg_self_1',
          remoteJid: '5511999990000@s.whatsapp.net',
          fromMe: true
        },
        message: {
          conversation: 'Qual é o meu saldo de hoje?'
        }
      };

      const aceito = whatsappService.tratarMensagemUpsert(msgSelf);

      expect(aceito).toBe(true);
      expect(whatsappService._enfileirarMensagem).toHaveBeenCalledWith(
        '5511999990000@s.whatsapp.net',
        'Qual é o meu saldo de hoje?',
        msgSelf.key
      );
    });

    it('deve aceitar mensagem enviada para si mesmo quando o WhatsApp Multi-Device usar JID no formato @lid', () => {
      const msgSelfLid = {
        key: {
          id: 'msg_self_lid_1',
          remoteJid: '136361000607750@lid',
          fromMe: true
        },
        message: {
          extendedTextMessage: {
            text: 'Teste'
          }
        }
      };

      const aceito = whatsappService.tratarMensagemUpsert(msgSelfLid);

      expect(aceito).toBe(true);
      expect(whatsappService._enfileirarMensagem).toHaveBeenCalledWith(
        '136361000607750@lid',
        'Teste',
        msgSelfLid.key
      );
      expect(whatsappService.resolverIdentificadorTelefone('136361000607750@lid', msgSelfLid.key)).toBe('5511999990000');
    });

    it('deve descartar mensagens enviadas pelo próprio bot (anti-loop) registradas no Set', () => {
      whatsappService.mensagensEnviadasPeloBot.add('msg_resposta_bot_1');

      const msgLoop = {
        key: {
          id: 'msg_resposta_bot_1',
          remoteJid: '5511999990000@s.whatsapp.net',
          fromMe: true
        },
        message: {
          conversation: 'Resposta gerada pela IA'
        }
      };

      const aceito = whatsappService.tratarMensagemUpsert(msgLoop);

      expect(aceito).toBe(false);
      expect(whatsappService._enfileirarMensagem).not.toHaveBeenCalled();
      // O ID foi consumido e removido do Set
      expect(whatsappService.mensagensEnviadasPeloBot.has('msg_resposta_bot_1')).toBe(false);
    });

    it('deve descartar mensagens enviadas pelo usuário (fromMe=true) para outro número qualquer', () => {
      const msgExterna = {
        key: {
          id: 'msg_para_cliente',
          remoteJid: '5511988887777@s.whatsapp.net', // Destinatário diferente do bot
          fromMe: true
        },
        message: {
          conversation: 'Olá cliente, seu orçamento está pronto.'
        }
      };

      const aceito = whatsappService.tratarMensagemUpsert(msgExterna);

      expect(aceito).toBe(false);
      expect(whatsappService._enfileirarMensagem).not.toHaveBeenCalled();
    });

    it('deve ignorar mensagens de grupos (@g.us) e transmissões de status', () => {
      const msgGrupo = {
        key: {
          id: 'msg_grp_1',
          remoteJid: '120363025@g.us',
          fromMe: false
        },
        message: {
          conversation: 'Bom dia grupo'
        }
      };

      const aceito = whatsappService.tratarMensagemUpsert(msgGrupo);

      expect(aceito).toBe(false);
      expect(whatsappService._enfileirarMensagem).not.toHaveBeenCalled();
    });
  });

  describe('desconectar', () => {
    it('deve fazer logout, remover event listeners e encerrar o socket', async () => {
      const mockEv = { removeAllListeners: jest.fn() };
      const activeSock = {
        logout: jest.fn().mockResolvedValue(true),
        end: jest.fn(),
        ev: mockEv
      };
      whatsappService.sock = activeSock;

      await whatsappService.desconectar();

      expect(activeSock.logout).toHaveBeenCalled();
      expect(mockEv.removeAllListeners).toHaveBeenCalled();
      expect(activeSock.end).toHaveBeenCalled();
      expect(whatsappService.sock).toBeNull();
      expect(whatsappService.status).toBe('desconectado');
    });
  });
});
