const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const aiServiceClient = require('../src/services/aiServiceClient');

// Mock do cliente do ai-service para testes unitários/integrados do backend Node.js
jest.mock('../src/services/aiServiceClient');

describe('Rotas do Assistente IA (/api/assistente)', () => {
  let tokenUsuario1;
  let usuario1Id;
  let tokenUsuario2;
  let usuario2Id;

  const credenciaisUser1 = {
    nome: 'MEI Assistente User 1',
    email: 'user1.assistente@teste.com',
    senha: 'SenhaForte123@'
  };

  const credenciaisUser2 = {
    nome: 'MEI Assistente User 2',
    email: 'user2.assistente@teste.com',
    senha: 'SenhaForte123@'
  };

  beforeAll(async () => {
    // Limpa usuários de teste
    await pool.execute("DELETE FROM usuarios WHERE email LIKE '%assistente@teste.com'");

    // Cria Usuário 1
    const resUser1 = await request(app)
      .post('/api/auth/register')
      .send(credenciaisUser1);
    usuario1Id = resUser1.body.dados.id;
    tokenUsuario1 = resUser1.body.dados.token;

    // Cria Usuário 2
    const resUser2 = await request(app)
      .post('/api/auth/register')
      .send(credenciaisUser2);
    usuario2Id = resUser2.body.dados.id;
    tokenUsuario2 = resUser2.body.dados.token;
  });

  afterAll(async () => {
    await pool.execute("DELETE FROM usuarios WHERE email LIKE '%assistente@teste.com'");
    await pool.end();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Autenticação e Permissões', () => {
    test('deve rejeitar requisição sem token (401)', async () => {
      const res = await request(app)
        .get('/api/assistente/conversas');

      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });

    test('deve rejeitar token com escopo restrito assistente:read nas rotas do assistente (403)', async () => {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_chave_jwt_recode_2026';
      const scopedToken = jwt.sign(
        { id: usuario1Id, scope: 'assistente:read' },
        JWT_SECRET,
        { expiresIn: '5m' }
      );

      const res = await request(app)
        .get('/api/assistente/conversas')
        .set('Authorization', `Bearer ${scopedToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.mensagem).toMatch(/token.*restrito/i);
    });
  });

  describe('POST /api/assistente/mensagens', () => {
    test('deve validar mensagem obrigatória e vazia (400)', async () => {
      const res = await request(app)
        .post('/api/assistente/mensagens')
        .set('Authorization', `Bearer ${tokenUsuario1}`)
        .send({ mensagem: '   ' });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/obrigatório/i);
    });

    test('deve validar tamanho máximo da mensagem (400)', async () => {
      const msgLonga = 'a'.repeat(2001);
      const res = await request(app)
        .post('/api/assistente/mensagens')
        .set('Authorization', `Bearer ${tokenUsuario1}`)
        .send({ mensagem: msgLonga });

      expect(res.statusCode).toBe(400);
      expect(res.body.mensagem).toMatch(/2000 caracteres/i);
    });

    test('deve criar uma nova conversa e responder com sucesso (200)', async () => {
      aiServiceClient.enviarMensagem.mockResolvedValueOnce({
        resposta: 'O limite anual de faturamento do MEI é de R$ 81.000,00.',
        fontes: [{ pagina: 14, arquivo: 'perguntaomei.pdf', trecho: 'Limite de faturamento anual' }],
        tools_usadas: [],
        rag_backend: 'chroma'
      });

      const res = await request(app)
        .post('/api/assistente/mensagens')
        .set('Authorization', `Bearer ${tokenUsuario1}`)
        .send({ mensagem: 'Qual o limite de faturamento anual do MEI?' });

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toHaveProperty('conversa_id');
      expect(res.body.dados.mensagem).toBeDefined();
      expect(res.body.dados.mensagem.papel).toBe('assistente');
      expect(res.body.dados.mensagem.conteudo).toContain('81.000,00');
      expect(res.body.dados.mensagem.fontes).toHaveLength(1);
      expect(res.body.dados.mensagem.fontes[0].pagina).toBe(14);

      // Verifica chamada ao microserviço
      expect(aiServiceClient.enviarMensagem).toHaveBeenCalledTimes(1);
      const chamada = aiServiceClient.enviarMensagem.mock.calls[0][0];
      expect(chamada.tenant_id).toBe(usuario1Id);
      expect(chamada.mensagem).toBe('Qual o limite de faturamento anual do MEI?');
      expect(chamada.tenant_token).toBeDefined();
    });

    test('deve retornar 503 quando o ai-service falhar', async () => {
      const err = new Error('Falha de conexão com o AI Service');
      err.statusCode = 503;
      aiServiceClient.enviarMensagem.mockRejectedValueOnce(err);

      const res = await request(app)
        .post('/api/assistente/mensagens')
        .set('Authorization', `Bearer ${tokenUsuario1}`)
        .send({ mensagem: 'Pergunta que vai falhar' });

      expect(res.statusCode).toBe(503);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/temporariamente indisponível|Falha de conexão/i);
    });
  });

  describe('GET e DELETE /api/assistente/conversas e mensagens', () => {
    let conversaIdUser1;

    beforeEach(async () => {
      // Cria uma conversa para o User 1
      aiServiceClient.enviarMensagem.mockResolvedValueOnce({
        resposta: 'Resposta de teste inicial',
        fontes: [],
        tools_usadas: [],
        rag_backend: 'chroma'
      });

      const res = await request(app)
        .post('/api/assistente/mensagens')
        .set('Authorization', `Bearer ${tokenUsuario1}`)
        .send({ mensagem: 'Pergunta de configuração inicial' });

      conversaIdUser1 = res.body.dados.conversa_id;
    });

    test('deve listar as conversas do usuário autenticado', async () => {
      const res = await request(app)
        .get('/api/assistente/conversas')
        .set('Authorization', `Bearer ${tokenUsuario1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(Array.isArray(res.body.dados)).toBe(true);
      expect(res.body.dados.length).toBeGreaterThanOrEqual(1);
      expect(res.body.dados[0].id).toBe(conversaIdUser1);
    });

    test('deve listar as mensagens da conversa com fontes e papéis', async () => {
      const res = await request(app)
        .get(`/api/assistente/conversas/${conversaIdUser1}/mensagens`)
        .set('Authorization', `Bearer ${tokenUsuario1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(Array.isArray(res.body.dados)).toBe(true);
      expect(res.body.dados.length).toBe(2); // Usuário + Assistente
      expect(res.body.dados[0].papel).toBe('usuario');
      expect(res.body.dados[1].papel).toBe('assistente');
    });

    test('ISOLAMENTO MULTI-TENANT: Usuário 2 NÃO pode ver mensagens da conversa do Usuário 1 (404)', async () => {
      const res = await request(app)
        .get(`/api/assistente/conversas/${conversaIdUser1}/mensagens`)
        .set('Authorization', `Bearer ${tokenUsuario2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });

    test('ISOLAMENTO MULTI-TENANT: Usuário 2 NÃO pode excluir a conversa do Usuário 1 (404)', async () => {
      const res = await request(app)
        .delete(`/api/assistente/conversas/${conversaIdUser1}`)
        .set('Authorization', `Bearer ${tokenUsuario2}`);

      expect(res.statusCode).toBe(404);
    });

    test('deve excluir a conversa com sucesso quando solicitada pelo proprietário (204)', async () => {
      const resDelete = await request(app)
        .delete(`/api/assistente/conversas/${conversaIdUser1}`)
        .set('Authorization', `Bearer ${tokenUsuario1}`);

      expect(resDelete.statusCode).toBe(204);

      // Verificação posterior: listar mensagens retorna 404
      const resGet = await request(app)
        .get(`/api/assistente/conversas/${conversaIdUser1}/mensagens`)
        .set('Authorization', `Bearer ${tokenUsuario1}`);

      expect(resGet.statusCode).toBe(404);
    });
  });

  describe('Modo Assíncrono e Short-Polling (/api/assistente/mensagens)', () => {
    test('deve aceitar mensagem assíncrona, retornar 202 Accepted imediatamente e permitir consultar status via short-polling', async () => {
      let resolverAi;
      const promessaAi = new Promise((resolve) => {
        resolverAi = resolve;
      });
      aiServiceClient.enviarMensagem.mockImplementationOnce(() => promessaAi);

      // 1. Envia mensagem assíncrona
      const resPost = await request(app)
        .post('/api/assistente/mensagens')
        .set('Authorization', `Bearer ${tokenUsuario1}`)
        .send({
          mensagem: 'Como parcelar o débito do DAS MEI?',
          assincrono: true
        });

      expect(resPost.statusCode).toBe(202);
      expect(resPost.body.sucesso).toBe(true);
      expect(resPost.body.dados).toHaveProperty('conversa_id');
      expect(resPost.body.dados.mensagem).toBeDefined();
      expect(resPost.body.dados.mensagem.status).toBe('processando');
      expect(resPost.body.dados.mensagem.papel).toBe('assistente');

      const msgId = resPost.body.dados.mensagem.id;
      const conversaId = resPost.body.dados.conversa_id;

      // 2. Short-polling inicial: mensagem ainda deve estar processando
      const resStatus1 = await request(app)
        .get(`/api/assistente/mensagens/${msgId}/status`)
        .set('Authorization', `Bearer ${tokenUsuario1}`);

      expect(resStatus1.statusCode).toBe(200);
      expect(resStatus1.body.dados.status).toBe('processando');
      expect(resStatus1.body.dados.conteudo).toBeNull();

      // 3. Rejeita envio simultâneo na mesma conversa enquanto processa (409 Conflict)
      const resConflito = await request(app)
        .post('/api/assistente/mensagens')
        .set('Authorization', `Bearer ${tokenUsuario1}`)
        .send({
          conversa_id: conversaId,
          mensagem: 'Outra pergunta enquanto a primeira roda',
          assincrono: true
        });

      expect(resConflito.statusCode).toBe(409);
      expect(resConflito.body.sucesso).toBe(false);

      // 4. Resolve a Promise do ai-service simulando término do processamento
      resolverAi({
        resposta: 'O parcelamento pode ser feito pelo Portal do Simples Nacional em até 60 vezes.',
        fontes: [{ pagina: 22, arquivo: 'perguntaomei.pdf', trecho: 'Parcelamento DAS' }],
        tools_usadas: [],
        rag_backend: 'chroma'
      });

      // Aguarda tick para a Promise de background concluir a gravação
      await new Promise((r) => setTimeout(r, 100));

      // 5. Short-polling posterior: mensagem agora deve estar concluída
      const resStatus2 = await request(app)
        .get(`/api/assistente/mensagens/${msgId}/status`)
        .set('Authorization', `Bearer ${tokenUsuario1}`);

      expect(resStatus2.statusCode).toBe(200);
      expect(resStatus2.body.dados.status).toBe('concluida');
      expect(resStatus2.body.dados.conteudo).toContain('Portal do Simples Nacional');
      expect(resStatus2.body.dados.fontes).toHaveLength(1);

      // 6. ISOLAMENTO MULTI-TENANT: Usuário 2 não pode ver o status da mensagem do Usuário 1 (404)
      const resStatusUser2 = await request(app)
        .get(`/api/assistente/mensagens/${msgId}/status`)
        .set('Authorization', `Bearer ${tokenUsuario2}`);

      expect(resStatusUser2.statusCode).toBe(404);
      expect(resStatusUser2.body.sucesso).toBe(false);
    });

    test('deve atualizar status para "erro" se o aiServiceClient falhar em background', async () => {
      let rejeitarAi;
      const promessaAi = new Promise((_, reject) => {
        rejeitarAi = reject;
      });
      aiServiceClient.enviarMensagem.mockImplementationOnce(() => promessaAi);

      const resPost = await request(app)
        .post('/api/assistente/mensagens')
        .set('Authorization', `Bearer ${tokenUsuario1}`)
        .send({
          mensagem: 'Pergunta que vai falhar em background',
          assincrono: true
        });

      expect(resPost.statusCode).toBe(202);
      const msgId = resPost.body.dados.mensagem.id;

      // Rejeita a Promise em background
      const erro = new Error('Falha de timeout com Gemini API');
      erro.statusCode = 504;
      rejeitarAi(erro);

      // Aguarda gravação do erro em background
      await new Promise((r) => setTimeout(r, 100));

      const resStatus = await request(app)
        .get(`/api/assistente/mensagens/${msgId}/status`)
        .set('Authorization', `Bearer ${tokenUsuario1}`);

      expect(resStatus.statusCode).toBe(200);
      expect(resStatus.body.dados.status).toBe('erro');
      expect(resStatus.body.dados.erro_mensagem).toMatch(/Falha de timeout/i);
    });

    test('deve sintetizar áudio via aiServiceClient e retornar audio_base64 quando preferencia_resposta for "audio"', async () => {
      // Configura usuário com preferência "audio" e voz Antonio
      await pool.execute(
        `INSERT INTO mei_configuracoes (usuario_id, razao_social, cnpj, cep, logradouro, bairro, municipio, uf, codigo_municipio_ibge, preferencia_resposta, voz_assistente)
         VALUES (?, 'MEI Audio Teste', '11222333000199', '01001000', 'Rua Teste', 'Bairro', 'São Paulo', 'SP', '3550308', 'audio', 'pt-BR-AntonioNeural')
         ON DUPLICATE KEY UPDATE preferencia_resposta = 'audio', voz_assistente = 'pt-BR-AntonioNeural'`,
        [usuario1Id]
      );

      aiServiceClient.enviarMensagem.mockResolvedValueOnce({
        resposta: 'Seu saldo consolidado é de R$ 3.200,00.',
        fontes: [],
        tools_usadas: [],
        rag_backend: 'none'
      });

      aiServiceClient.sintetizarAudio.mockResolvedValueOnce({
        sucesso: true,
        audio_base64: 'base64_audio_antonio_teste',
        mime_type: 'audio/mp3',
        duracao_estimada_s: 2.5,
        voz_utilizada: 'pt-BR-AntonioNeural'
      });

      const res = await request(app)
        .post('/api/assistente/mensagens')
        .set('Authorization', `Bearer ${tokenUsuario1}`)
        .send({ mensagem: 'Quanto tenho em caixa?' });

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.mensagem.tipo_midia).toBe('audio');
      expect(res.body.dados.mensagem.audio_base64).toBe('base64_audio_antonio_teste');
      expect(res.body.dados.mensagem.transcricao_audio).toBe('Seu saldo consolidado é de R$ 3.200,00.');
      expect(aiServiceClient.sintetizarAudio).toHaveBeenCalledWith({
        texto: 'Seu saldo consolidado é de R$ 3.200,00.',
        voz: 'pt-BR-AntonioNeural'
      });
    });

    test('deve sintetizar áudio via aiServiceClient e retornar audio_base64 e conteudo integral quando preferencia_resposta for "ambos"', async () => {
      await pool.execute(
        `UPDATE mei_configuracoes SET preferencia_resposta = 'ambos', voz_assistente = 'pt-BR-ThalitaNeural' WHERE usuario_id = ?`,
        [usuario1Id]
      );

      aiServiceClient.enviarMensagem.mockResolvedValueOnce({
        resposta: 'Você possui 3 agendamentos confirmados para hoje.',
        fontes: [],
        tools_usadas: [],
        rag_backend: 'none'
      });

      aiServiceClient.sintetizarAudio.mockResolvedValueOnce({
        sucesso: true,
        audio_base64: 'base64_audio_thalita_teste',
        mime_type: 'audio/mp3',
        duracao_estimada_s: 2.1,
        voz_utilizada: 'pt-BR-ThalitaNeural'
      });

      const res = await request(app)
        .post('/api/assistente/mensagens')
        .set('Authorization', `Bearer ${tokenUsuario1}`)
        .send({ mensagem: 'Quantos agendamentos tenho hoje?' });

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.mensagem.tipo_midia).toBe('texto');
      expect(res.body.dados.mensagem.audio_base64).toBe('base64_audio_thalita_teste');
      expect(res.body.dados.mensagem.conteudo).toBe('Você possui 3 agendamentos confirmados para hoje.');
      expect(aiServiceClient.sintetizarAudio).toHaveBeenCalledWith({
        texto: 'Você possui 3 agendamentos confirmados para hoje.',
        voz: 'pt-BR-ThalitaNeural'
      });
    });
  });
});

