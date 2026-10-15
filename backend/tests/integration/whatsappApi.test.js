const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');
const usuarioRepository = require('../../src/repositories/usuarioRepository');

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

  describe('POST /api/assistente/whatsapp/resetar', () => {
    it('deve rejeitar se não autenticado', async () => {
      const res = await request(app).post('/api/assistente/whatsapp/resetar');
      expect(res.status).toBe(401);
    });

    it('deve permitir resetar a sessão do WhatsApp e retornar status de reconexão', async () => {
      const res = await request(app)
        .post('/api/assistente/whatsapp/resetar')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toHaveProperty('status');
    });
  });
});
