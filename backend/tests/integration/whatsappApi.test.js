const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');
const usuarioRepository = require('../../src/repositories/usuarioRepository');
const whatsappService = require('../../src/services/whatsappService');

describe('Rotas de WhatsApp do Assistente (/api/assistente/whatsapp)', () => {
  let tokenUser1;
  let user1Id;
  let tokenUser2;
  let user2Id;

  const credenciaisUser1 = {
    nome: 'MEI WhatsApp User 1',
    email: 'user1.whatsapp@teste.com',
    senha: 'SenhaForte123@'
  };

  const credenciaisUser2 = {
    nome: 'MEI WhatsApp User 2',
    email: 'user2.whatsapp@teste.com',
    senha: 'SenhaForte123@'
  };

  beforeAll(async () => {
    // Limpa dados de teste prévios
    await pool.execute("DELETE FROM usuarios WHERE email LIKE '%whatsapp@teste.com'");

    // Cria Usuário 1
    const resUser1 = await request(app)
      .post('/api/auth/register')
      .send(credenciaisUser1);
    user1Id = resUser1.body.dados.id;
    tokenUser1 = resUser1.body.dados.token;

    // Cria Usuário 2
    const resUser2 = await request(app)
      .post('/api/auth/register')
      .send(credenciaisUser2);
    user2Id = resUser2.body.dados.id;
    tokenUser2 = resUser2.body.dados.token;
  });

  afterAll(async () => {
    await pool.execute("DELETE FROM usuarios WHERE email LIKE '%whatsapp@teste.com'");
  });

  describe('GET /api/assistente/whatsapp/status', () => {
    it('deve retornar 401 se a rota for acessada sem autenticação', async () => {
      const res = await request(app).get('/api/assistente/whatsapp/status');
      expect(res.status).toBe(401);
    });

    it('deve retornar o status do bot e o status do WhatsApp do MEI autenticado', async () => {
      const res = await request(app)
        .get('/api/assistente/whatsapp/status')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toHaveProperty('bot');
      expect(res.body.dados).toHaveProperty('usuario_whatsapp');
      expect(res.body.dados.usuario_whatsapp).toBeNull();
      expect(res.body.dados.usuario_whatsapp_verificado).toBe(false);
      // Garante que o qrCode NUNCA vaza para o MEI comum
      expect(res.body.dados.bot.qrCode).toBeUndefined();
    });

    it('nunca deve expor o qrCode na rota comum, mesmo com cabeçalhos arbitrários', async () => {
      whatsappService.qrCode = 'qr_code_teste_secreto';
      const res = await request(app)
        .get('/api/assistente/whatsapp/status')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .set('x-platform-admin', 'true');

      expect(res.status).toBe(200);
      expect(res.body.dados.bot.qrCode).toBeUndefined();
      whatsappService.qrCode = null;
    });
  });

  describe('POST /api/assistente/whatsapp/vincular', () => {
    it('deve rejeitar com 400 se o número de telefone for inválido', async () => {
      const res = await request(app)
        .post('/api/assistente/whatsapp/vincular')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ telefone: '123' });

      expect(res.status).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toContain('inválido');
    });

    it('deve vincular o número de WhatsApp com sucesso para o Usuário 1', async () => {
      const res = await request(app)
        .post('/api/assistente/whatsapp/vincular')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ telefone: '(11) 98765-4321' });

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.whatsapp).toBe('5511987654321');
      expect(res.body.dados.formatado).toBe('+55 (11) 98765-4321');
      expect(res.body.dados.whatsapp_verificado).toBe(true);

      // Valida busca no banco
      const usuarioDb = await usuarioRepository.buscarPorId(user1Id);
      expect(usuarioDb.whatsapp).toBe('5511987654321');
      expect(usuarioDb.whatsapp_verificado).toBe(1);

      // Valida busca por variações de telefone
      const encontrado = await usuarioRepository.buscarPorTelefoneOuWhatsapp([
        '5511987654321',
        '11987654321'
      ]);
      expect(encontrado).not.toBeNull();
      expect(encontrado.id).toBe(user1Id);
    });

    it('deve retornar 409 se o Usuário 2 tentar vincular o mesmo número já em uso pelo Usuário 1', async () => {
      const res = await request(app)
        .post('/api/assistente/whatsapp/vincular')
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ telefone: '11987654321' });

      expect(res.status).toBe(409);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toContain('já está vinculado a outra conta MEI');
    });

    it('deve permitir que o Usuário 2 vincule seu próprio número distinto', async () => {
      const res = await request(app)
        .post('/api/assistente/whatsapp/vincular')
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ telefone: '(21) 99999-8888' });

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.whatsapp).toBe('5521999998888');

      // Verifica status atualizado no endpoint GET
      const resStatus = await request(app)
        .get('/api/assistente/whatsapp/status')
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(resStatus.status).toBe(200);
      expect(resStatus.body.dados.usuario_whatsapp).toBe('5521999998888');
      expect(resStatus.body.dados.usuario_whatsapp_verificado).toBe(true);
    });
  });

  describe('POST /api/assistente/whatsapp/resetar (Rota Oculta & Restrita a Devs)', () => {
    it('deve rejeitar se não autenticado', async () => {
      const res = await request(app).post('/api/assistente/whatsapp/resetar');
      expect(res.status).toBe(401);
    });

    it('deve responder 404 (oculta) se acessada por usuário comum sem o token de dev', async () => {
      const res = await request(app)
        .post('/api/assistente/whatsapp/resetar')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(404);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toBe('Rota não encontrada');
    });

    it('deve responder 404 (oculta) se token de desenvolvedor for inválido', async () => {
      const res = await request(app)
        .post('/api/assistente/whatsapp/resetar')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .set('X-Dev-Token', 'token_incorreto');

      expect(res.status).toBe(404);
      expect(res.body.mensagem).toBe('Rota não encontrada');
    });

    it('deve permitir resetar a sessão se o token de dev válido for fornecido', async () => {
      const spyGerarNovoQrCode = jest.spyOn(whatsappService, 'gerarNovoQrCode').mockResolvedValue({
        status: 'aguardando_qr',
        conectado: false,
        numero: null
      });

      const res = await request(app)
        .post('/api/assistente/whatsapp/resetar')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .set('X-Dev-Token', 'chave_mestra_secreta_whatsapp_dev_2026');

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toHaveProperty('status');

      expect(spyGerarNovoQrCode).toHaveBeenCalled();
      spyGerarNovoQrCode.mockRestore();
    });
  });

  describe('Rotas Administrativas Exclusivas de Dev (/api/dev/whatsapp)', () => {
    const devTokenValido = 'chave_mestra_secreta_whatsapp_dev_2026';

    it('deve responder 404 (oculto) em todas as rotas de dev quando acessadas sem token', async () => {
      const resStatus = await request(app).get('/api/dev/whatsapp/status');
      expect(resStatus.status).toBe(404);

      const resQr = await request(app).get('/api/dev/whatsapp/qrcode');
      expect(resQr.status).toBe(404);

      const resReset = await request(app).post('/api/dev/whatsapp/resetar');
      expect(resReset.status).toBe(404);
    });

    it('deve retornar status e dados administrativos com X-Dev-Token válido', async () => {
      whatsappService.status = 'aguardando_qr';
      whatsappService.qrCode = '2@teste_qr_string';

      const res = await request(app)
        .get('/api/dev/whatsapp/status')
        .set('X-Dev-Token', devTokenValido);

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.qrCode).toBe('2@teste_qr_string');
      expect(res.body.dados.qrCodeUrl).toContain('teste_qr_string');
    });

    it('deve suportar token via query string ?dev_token=... e responder HTML para browser', async () => {
      whatsappService.status = 'aguardando_qr';
      whatsappService.qrCode = '2@teste_qr_string';

      const res = await request(app)
        .get(`/api/dev/whatsapp/qrcode?dev_token=${devTokenValido}&format=html`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('Aranduê — Gateway WhatsApp (Dev)');
      expect(res.text).toContain('Conectar WhatsApp do Aranduê');
    });

    it('deve permitir resetar a sessão do gateway via POST /api/dev/whatsapp/resetar', async () => {
      const spyGerar = jest.spyOn(whatsappService, 'gerarNovoQrCode').mockResolvedValue({
        status: 'aguardando_qr',
        conectado: false,
        numero: null,
        qrCode: 'novo_qr_apos_reset'
      });

      const res = await request(app)
        .post('/api/dev/whatsapp/resetar')
        .set('X-Dev-Token', devTokenValido);

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.qrCode).toBe('novo_qr_apos_reset');
      expect(spyGerar).toHaveBeenCalled();
      spyGerar.mockRestore();
    });
  });
});
