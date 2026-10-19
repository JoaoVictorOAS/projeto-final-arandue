const request = require('supertest');
const app = require('../../src/app');
const aiServiceClient = require('../../src/services/aiServiceClient');
const whatsappService = require('../../src/services/whatsappService');
const usuarioRepository = require('../../src/repositories/usuarioRepository');
const conversaRepository = require('../../src/repositories/conversaRepository');
const assistenteService = require('../../src/services/assistenteService');
const jwt = require('jsonwebtoken');

const pool = require('../../src/config/database');

jest.mock('../../src/services/aiServiceClient');

describe('Assistente IA - Capacidades Multimodais (Áudio e Imagem)', () => {
  let tokenValido;
  let usuarioId;

  const credenciais = {
    nome: 'MEI Multimodal Teste',
    email: 'multimodal.test@teste.com',
    senha: 'SenhaForte123@'
  };

  beforeAll(async () => {
    await pool.execute("DELETE FROM usuarios WHERE email = 'multimodal.test@teste.com'");
    const resReg = await request(app)
      .post('/api/auth/register')
      .send(credenciais);
    usuarioId = resReg.body.dados.id;
    tokenValido = resReg.body.dados.token;
  });

  afterAll(async () => {
    await pool.execute("DELETE FROM usuarios WHERE email = 'multimodal.test@teste.com'");
    await pool.end();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    if (aiServiceClient.sintetizarAudio) {
      aiServiceClient.sintetizarAudio.mockResolvedValue({
        sucesso: true,
        audio_base64: 'fake_tts_base64',
        mime_type: 'audio/mp3',
        duracao_estimada_s: 2
      });
    }
  });

  describe('POST /api/assistente/audio/transcrever', () => {
    it('deve rejeitar requisição sem dados de áudio (400)', async () => {
      const res = await request(app)
        .post('/api/assistente/audio/transcrever')
        .set('Authorization', `Bearer ${tokenValido}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/dados de áudio.*obrigatórios/i);
    });

    it('deve transcrever áudio com sucesso chamando aiServiceClient', async () => {
      aiServiceClient.transcreverAudio.mockResolvedValue({
        sucesso: true,
        transcricao: 'Registrar despesa de 60 reais de combustível.',
        duracao_estimada_s: 3.5
      });

      const res = await request(app)
        .post('/api/assistente/audio/transcrever')
        .set('Authorization', `Bearer ${tokenValido}`)
        .send({
          audio_base64: 'YXVkaW9fZmFrZQ==',
          mime_type: 'audio/ogg'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.transcricao).toBe('Registrar despesa de 60 reais de combustível.');
      expect(aiServiceClient.transcreverAudio).toHaveBeenCalledWith({
        audio_base64: 'YXVkaW9fZmFrZQ==',
        mime_type: 'audio/ogg'
      });
    });
  });

  describe('POST /api/assistente/imagem/analisar', () => {
    it('deve rejeitar requisição sem imagem (400)', async () => {
      const res = await request(app)
        .post('/api/assistente/imagem/analisar')
        .set('Authorization', `Bearer ${tokenValido}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/dados da imagem.*obrigatórios/i);
    });

    it('deve analisar imagem com sucesso chamando aiServiceClient', async () => {
      aiServiceClient.analisarImagem.mockResolvedValue({
        sucesso: true,
        tipo_detectado: 'comprovante_pix',
        descricao: 'Comprovante Pix recebido no valor de R$ 150,00',
        dados_estruturados: { valor: 150.0 },
        sugestao_acao: 'registrar_receita'
      });

      const res = await request(app)
        .post('/api/assistente/imagem/analisar')
        .set('Authorization', `Bearer ${tokenValido}`)
        .send({
          imagem_base64: 'aW1hZ2VfZmFrZQ==',
          mime_type: 'image/jpeg',
          instrucao: 'Verificar se é Pix'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.tipo_detectado).toBe('comprovante_pix');
      expect(res.body.dados.sugestao_acao).toBe('registrar_receita');
      expect(aiServiceClient.analisarImagem).toHaveBeenCalledWith({
        imagem_base64: 'aW1hZ2VfZmFrZQ==',
        mime_type: 'image/jpeg',
        instrucao: 'Verificar se é Pix'
      });
    });
  });

  describe('POST /api/assistente/mensagens com anexo multimodal', () => {
    it('deve processar mensagem com imagem e encaminhar payload multimodal ao ai-service', async () => {
      aiServiceClient.enviarMensagem.mockResolvedValue({
        resposta: 'Identifiquei o recibo da papelaria no valor de R$ 45,00. Deseja que eu registre a despesa?',
        fontes: [],
        tools_usadas: []
      });

      const res = await request(app)
        .post('/api/assistente/mensagens')
        .set('Authorization', `Bearer ${tokenValido}`)
        .send({
          mensagem: 'Lança esse recibo pra mim',
          tipo_midia: 'imagem',
          midia: {
            tipo: 'imagem',
            dados_base64: 'aW1hZ2VfZmFrZV9kYXRh',
            mime_type: 'image/jpeg'
          }
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.mensagem.conteudo).toContain('Identifiquei o recibo');
      expect(aiServiceClient.enviarMensagem).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: usuarioId,
          midia: {
            tipo: 'imagem',
            dados_base64: 'aW1hZ2VfZmFrZV9kYXRh',
            mime_type: 'image/jpeg'
          }
        })
      );
    });

    it('deve transcrever áudio automaticamente se mensagem de voz for enviada sem texto', async () => {
      aiServiceClient.transcreverAudio.mockResolvedValue({
        sucesso: true,
        transcricao: 'Quanto tenho a receber essa semana?'
      });

      aiServiceClient.enviarMensagem.mockResolvedValue({
        resposta: 'Você tem R$ 450,00 previstos para receber esta semana.',
        fontes: [],
        tools_usadas: ['obter_resumo_caixa']
      });

      const res = await request(app)
        .post('/api/assistente/mensagens')
        .set('Authorization', `Bearer ${tokenValido}`)
        .send({
          tipo_midia: 'audio',
          midia: {
            tipo: 'audio',
            dados_base64: 'YXVkaW9fZmFrZV92b2ljZQ==',
            mime_type: 'audio/ogg'
          }
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(aiServiceClient.transcreverAudio).toHaveBeenCalled();
      expect(aiServiceClient.enviarMensagem).toHaveBeenCalledWith(
        expect.objectContaining({
          mensagem: 'Quanto tenho a receber essa semana?'
        })
      );
    });

    it('deve rejeitar MIME type não suportado ou com mais de 50 caracteres (400)', async () => {
      const resInvalido = await request(app)
        .post('/api/assistente/mensagens')
        .set('Authorization', `Bearer ${tokenValido}`)
        .send({
          tipo_midia: 'audio',
          midia: {
            tipo: 'audio',
            dados_base64: 'YXVkaW9fZmFrZQ==',
            mime_type: 'video/mp4'
          }
        });

      expect(resInvalido.statusCode).toBe(400);
      expect(resInvalido.body.sucesso).toBe(false);
      expect(resInvalido.body.mensagem).toMatch(/Formato MIME não suportado/i);

      const resLongo = await request(app)
        .post('/api/assistente/mensagens')
        .set('Authorization', `Bearer ${tokenValido}`)
        .send({
          tipo_midia: 'audio',
          midia: {
            tipo: 'audio',
            dados_base64: 'YXVkaW9fZmFrZQ==',
            mime_type: 'audio/ogg; codecs=opus; parameter_very_very_long_exceeding_fifty_characters=true'
          }
        });

      expect(resLongo.statusCode).toBe(400);
      expect(resLongo.body.mensagem).toMatch(/não pode exceder 50 caracteres/i);
    });

    it('deve aceitar parâmetros válidos de MIME como audio/ogg; codecs=opus', async () => {
      aiServiceClient.transcreverAudio.mockResolvedValueOnce({
        sucesso: true,
        transcricao: 'Testando áudio opus'
      });
      aiServiceClient.enviarMensagem.mockResolvedValueOnce({
        resposta: 'Áudio opus processado com sucesso.',
        fontes: [],
        tools_usadas: []
      });

      const res = await request(app)
        .post('/api/assistente/mensagens')
        .set('Authorization', `Bearer ${tokenValido}`)
        .send({
          tipo_midia: 'audio',
          midia: {
            tipo: 'audio',
            dados_base64: 'YXVkaW9fZmFrZQ==',
            mime_type: 'audio/ogg; codecs=opus'
          }
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
    });

    it('deve retornar erro e interromper fluxo se a transcrição de voz falhar', async () => {
      const erroTranscricao = new Error('Falha de conexão com Gemini Speech');
      erroTranscricao.statusCode = 502;
      aiServiceClient.transcreverAudio.mockRejectedValueOnce(erroTranscricao);

      const res = await request(app)
        .post('/api/assistente/mensagens')
        .set('Authorization', `Bearer ${tokenValido}`)
        .send({
          tipo_midia: 'audio',
          midia: {
            tipo: 'audio',
            dados_base64: 'YXVkaW9fZmFrZQ==',
            mime_type: 'audio/ogg'
          }
        });

      expect(res.statusCode).toBe(502);
      expect(res.body.sucesso).toBe(false);
      expect(aiServiceClient.enviarMensagem).not.toHaveBeenCalled();
    });

    it('deve retornar 400 se a transcrição retornar conteúdo vazio', async () => {
      aiServiceClient.transcreverAudio.mockResolvedValueOnce({
        sucesso: true,
        transcricao: '   '
      });

      const res = await request(app)
        .post('/api/assistente/mensagens')
        .set('Authorization', `Bearer ${tokenValido}`)
        .send({
          tipo_midia: 'audio',
          midia: {
            tipo: 'audio',
            dados_base64: 'YXVkaW9fZmFrZQ==',
            mime_type: 'audio/ogg'
          }
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/Não foi possível identificar conteúdo de fala/i);
      expect(aiServiceClient.enviarMensagem).not.toHaveBeenCalled();
    });
  });

  describe('WhatsApp Service - Suporte a Áudio e Imagem', () => {
    let mockSock;

    beforeEach(() => {
      mockSock = {
        sendMessage: jest.fn().mockResolvedValue({ key: { id: 'sent_wa_1' } }),
        sendPresenceUpdate: jest.fn().mockResolvedValue({})
      };
      whatsappService.sock = mockSock;
      jest.spyOn(usuarioRepository, 'buscarPorTelefoneOuWhatsapp').mockResolvedValue({
        id: 1,
        nome: 'MEI Multimodal',
        whatsapp: '5511999990000'
      });
      jest.spyOn(conversaRepository, 'buscarConversaAtivaPorCanal').mockResolvedValue({
        id: 200,
        titulo: 'WhatsApp - Assistente Aranduê'
      });
    });

    it('deve identificar áudio, indicar presença recording e chamar assistenteService com payload multimodal', async () => {
      const mockBuffer = Buffer.from('fake_audio_bytes');
      whatsappService.baixarBufferMidia = jest.fn().mockResolvedValue(mockBuffer);

      const spyEnviar = jest.spyOn(assistenteService, 'enviarMensagem').mockResolvedValue({
        conversa_id: 200,
        mensagem: {
          conteudo: 'Despesa de R$ 50,00 registrada com sucesso no seu Livro Caixa.'
        }
      });

      const msgAudio = {
        key: { remoteJid: '5511999990000@s.whatsapp.net', id: 'audio_1' },
        message: {
          audioMessage: {
            mimetype: 'audio/ogg; codecs=opus'
          }
        }
      };

      const midiaInfo = whatsappService.extrairMidiaMensagem(msgAudio.message);
      expect(midiaInfo).toBeDefined();
      expect(midiaInfo.tipo).toBe('audio');

      await whatsappService.processarMensagemRecebida(
        '5511999990000@s.whatsapp.net',
        '',
        msgAudio.key,
        midiaInfo,
        msgAudio
      );

      expect(mockSock.sendPresenceUpdate).toHaveBeenCalledWith('recording', '5511999990000@s.whatsapp.net');
      expect(spyEnviar).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          tipo_midia: 'audio',
          midia: {
            tipo: 'audio',
            dados_base64: mockBuffer.toString('base64'),
            mime_type: 'audio/ogg; codecs=opus'
          }
        })
      );
      expect(mockSock.sendMessage).toHaveBeenCalledWith(
        '5511999990000@s.whatsapp.net',
        expect.objectContaining({
          text: expect.stringContaining('Despesa de R$ 50,00 registrada')
        })
      );
    });

    it('deve identificar imagem com legenda e processar via assistenteService', async () => {
      const mockBuffer = Buffer.from('fake_image_bytes');
      whatsappService.baixarBufferMidia = jest.fn().mockResolvedValue(mockBuffer);

      const spyEnviar = jest.spyOn(assistenteService, 'enviarMensagem').mockResolvedValue({
        conversa_id: 200,
        mensagem: {
          conteudo: 'Nota fiscal identificada: 10kg de Farinha registrados no estoque.'
        }
      });

      const msgImagem = {
        key: { remoteJid: '5511999990000@s.whatsapp.net', id: 'img_1' },
        message: {
          imageMessage: {
            mimetype: 'image/jpeg',
            caption: 'Cadastra os insumos dessa nota fiscal'
          }
        }
      };

      const midiaInfo = whatsappService.extrairMidiaMensagem(msgImagem.message);
      expect(midiaInfo).toBeDefined();
      expect(midiaInfo.tipo).toBe('imagem');

      await whatsappService.processarMensagemRecebida(
        '5511999990000@s.whatsapp.net',
        'Cadastra os insumos dessa nota fiscal',
        msgImagem.key,
        midiaInfo,
        msgImagem
      );

      expect(mockSock.sendPresenceUpdate).toHaveBeenCalledWith('composing', '5511999990000@s.whatsapp.net');
      expect(spyEnviar).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          tipo_midia: 'imagem',
          mensagem: 'Cadastra os insumos dessa nota fiscal',
          midia: {
            tipo: 'imagem',
            dados_base64: mockBuffer.toString('base64'),
            mime_type: 'image/jpeg'
          }
        })
      );
    });

    it('deve enviar mensagem orientando reenvio de áudio quando falhar o download de áudio sem texto', async () => {
      whatsappService.baixarBufferMidia = jest.fn().mockResolvedValue(null);
      const spyEnviar = jest.spyOn(assistenteService, 'enviarMensagem');

      const msgAudio = {
        key: { remoteJid: '5511999990000@s.whatsapp.net', id: 'audio_falha_1' },
        message: {
          audioMessage: {
            mimetype: 'audio/ogg; codecs=opus'
          }
        }
      };

      const midiaInfo = whatsappService.extrairMidiaMensagem(msgAudio.message);

      await whatsappService.processarMensagemRecebida(
        '5511999990000@s.whatsapp.net',
        '',
        msgAudio.key,
        midiaInfo,
        msgAudio
      );

      expect(mockSock.sendPresenceUpdate).toHaveBeenCalledWith('paused', '5511999990000@s.whatsapp.net');
      expect(mockSock.sendMessage).toHaveBeenCalledWith(
        '5511999990000@s.whatsapp.net',
        expect.objectContaining({
          text: expect.stringContaining('Não foi possível baixar seu áudio')
        })
      );
      expect(spyEnviar).not.toHaveBeenCalled();
    });
  });
});
