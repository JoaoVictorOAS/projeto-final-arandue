const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');
const whatsappService = require('../../src/services/whatsappService');
const aiServiceClient = require('../../src/services/aiServiceClient');
const conversaRepository = require('../../src/repositories/conversaRepository');

jest.mock('../../src/services/aiServiceClient');

describe('E2E Integration - Mensagens para o próprio número (Self-Messaging)', () => {
  let token;
  let usuarioId;
  const numeroProprio = '5511999997777';
  let mockSock;

  beforeAll(async () => {
    await pool.execute("DELETE FROM usuarios WHERE email LIKE '%selfmsg@teste.com'");

    // Cria o MEI
    const resAuth = await request(app)
      .post('/api/auth/register')
      .send({
        nome: 'MEI Dono do Bot',
        email: 'dono.selfmsg@teste.com',
        senha: 'SenhaForte123@'
      });

    usuarioId = resAuth.body.dados.id;
    token = resAuth.body.dados.token;

    // Vincula o número do bot à conta deste MEI
    await request(app)
      .post('/api/assistente/whatsapp/vincular')
      .set('Authorization', `Bearer ${token}`)
      .send({ telefone: '(11) 99999-7777' });
  });

  afterAll(async () => {
    await pool.execute("DELETE FROM usuarios WHERE email LIKE '%selfmsg@teste.com'");
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockSock = {
      sendMessage: jest.fn().mockImplementation((jid, content) => {
        return Promise.resolve({
          key: { id: `bot_sent_${Date.now()}` }
        });
      }),
      sendPresenceUpdate: jest.fn().mockResolvedValue({})
    };

    whatsappService.sock = mockSock;
    whatsappService.status = 'conectado';
    whatsappService.numeroBot = numeroProprio;
    whatsappService.lidBot = '136361000607750';
    whatsappService.mensagensEnviadasPeloBot.clear();
    whatsappService.textosEnviadosPeloBot.clear();
    whatsappService.mensagensProcessadas.clear();
  });

  it('deve processar mensagem enviada pelo MEI para si mesmo, gerar token de escopo, chamar IA e evitar loop', async () => {
    // Mock do ai-service simulando resposta da IA com formatação rica
    aiServiceClient.enviarMensagem.mockResolvedValue({
      resposta: 'Olá! Seu faturamento neste mês é **R$ 3.800,00** e você tem **2 orçamentos** aprovados.',
      fontes: [],
      tools_usadas: ['consultar_resumo_financeiro']
    });

    const jidProprio = `${numeroProprio}@s.whatsapp.net`;

    // 1. O MEI envia uma mensagem no chat consigo mesmo no WhatsApp
    const msgSelf = {
      key: {
        id: 'user_sent_note_to_self_1',
        remoteJid: jidProprio,
        fromMe: true
      },
      message: {
        conversation: 'Quanto faturei este mês?'
      }
    };

    // 2. O evento chega ao gateway do WhatsApp
    const aceito = whatsappService.tratarMensagemUpsert(msgSelf);
    expect(aceito).toBe(true);

    // Aguarda a fila de execução ser concluída
    await whatsappService.filasPorJid.get(jidProprio);

    // 3. Verifica se o assistente gerou conversa com o canal whatsapp
    const conversa = await conversaRepository.buscarConversaAtivaPorCanal(usuarioId, 'whatsapp');
    expect(conversa).not.toBeNull();
    expect(conversa.canal).toBe('whatsapp');

    // 4. Verifica se o bot enviou a resposta para o próprio número formatada para WhatsApp (*negrito*)
    expect(mockSock.sendMessage).toHaveBeenCalledWith(jidProprio, {
      text: 'Olá! Seu faturamento neste mês é *R$ 3.800,00* e você tem *2 orçamentos* aprovados.'
    });

    // 5. Verifica se o ID da mensagem enviada pelo bot foi armazenado para prevenção de loop
    expect(whatsappService.mensagensEnviadasPeloBot.size).toBe(1);
    const idMensagemBot = Array.from(whatsappService.mensagensEnviadasPeloBot)[0];

    // 6. Simula o evento de eco do WhatsApp quando a mensagem enviada pelo bot chega
    const msgEchoBot = {
      key: {
        id: idMensagemBot,
        remoteJid: jidProprio,
        fromMe: true
      },
      message: {
        conversation: 'Olá! Seu faturamento neste mês é *R$ 3.800,00* e você tem *2 orçamentos* aprovados.'
      }
    };

    // 7. O gateway DEVE descartar o eco do bot, evitando loop infinito
    const aceitoEco = whatsappService.tratarMensagemUpsert(msgEchoBot);
    expect(aceitoEco).toBe(false);
    expect(whatsappService.mensagensEnviadasPeloBot.has(idMensagemBot)).toBe(false);
  });

  it('deve processar mensagem para si mesmo quando o WhatsApp Multi-Device envia remoteJid no formato @lid', async () => {
    aiServiceClient.enviarMensagem.mockResolvedValue({
      resposta: 'Estou online! Seu número vinculado está funcionando perfeitamente.',
      fontes: [],
      tools_usadas: []
    });

    const jidLidProprio = '136361000607750@lid';

    const msgSelfLid = {
      key: {
        id: 'user_sent_lid_self_1',
        remoteJid: jidLidProprio,
        fromMe: true
      },
      message: {
        ephemeralMessage: {
          message: {
            extendedTextMessage: {
              text: 'Teste'
            }
          }
        }
      }
    };

    const aceito = whatsappService.tratarMensagemUpsert(msgSelfLid);
    expect(aceito).toBe(true);

    await whatsappService.filasPorJid.get(jidLidProprio);

    expect(mockSock.sendMessage).toHaveBeenCalledWith(jidLidProprio, {
      text: 'Estou online! Seu número vinculado está funcionando perfeitamente.'
    });
  });
});
