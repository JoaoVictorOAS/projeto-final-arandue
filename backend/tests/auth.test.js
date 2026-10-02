const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Autenticação API (/api/auth)', () => {
  const usuarioTeste = {
    nome: 'MEI Empreendedor Teste',
    email: 'teste.auth@mei.com',
    senha: 'SenhaForte123@'
  };

  beforeAll(async () => {
    await pool.execute("DELETE FROM usuarios WHERE email LIKE '%teste%'");
  });

  afterAll(async () => {
    await pool.execute("DELETE FROM usuarios WHERE email LIKE '%teste%'");
    await pool.end();
  });

  describe('POST /api/auth/register', () => {
    test('deve criar um novo usuário com sucesso (201)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(usuarioTeste);

      expect(res.statusCode).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.mensagem).toBe('Usuário registrado com sucesso');
      expect(res.body.dados).toBeDefined();
      expect(res.body.dados.id).toBeDefined();
      expect(res.body.dados.nome).toBe(usuarioTeste.nome);
      expect(res.body.dados.email).toBe(usuarioTeste.email);
      expect(res.body.dados.token).toBeDefined();
      expect(res.body.dados.usuario).toBeDefined();
      expect(res.body.dados.usuario.email).toBe(usuarioTeste.email);
    });

    test('deve rejeitar e-mail duplicado (400)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(usuarioTeste);

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/já cadastrado|em uso|já existe/i);
    });

    test('deve rejeitar requisição com campos obrigatórios ausentes (400)', async () => {
      const resSemNome = await request(app)
        .post('/api/auth/register')
        .send({ email: 'outro.teste@mei.com', senha: 'SenhaForte123@' });
      expect(resSemNome.statusCode).toBe(400);
      expect(resSemNome.body.sucesso).toBe(false);

      const resSemEmail = await request(app)
        .post('/api/auth/register')
        .send({ nome: 'Nome Teste', senha: 'SenhaForte123@' });
      expect(resSemEmail.statusCode).toBe(400);
      expect(resSemEmail.body.sucesso).toBe(false);

      const resSemSenha = await request(app)
        .post('/api/auth/register')
        .send({ nome: 'Nome Teste', email: 'outro.teste@mei.com' });
      expect(resSemSenha.statusCode).toBe(400);
      expect(resSemSenha.body.sucesso).toBe(false);
    });

    test('deve rejeitar senha com menos de 6 caracteres (400)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          nome: 'Nome Teste',
          email: 'senha.curta.teste@mei.com',
          senha: '123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/6 caracteres/i);
    });

    test('deve rejeitar e-mail com formato inválido (400)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          nome: 'Nome Teste',
          email: 'emailinvalido',
          senha: 'SenhaForte123@'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/formato de e-mail inválido|e-mail inválido/i);
    });
  });

  describe('POST /api/auth/login', () => {
    test('deve autenticar usuário com credenciais corretas (200)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: usuarioTeste.email,
          senha: usuarioTeste.senha
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.mensagem).toBe('Autenticado com sucesso');
      expect(res.body.dados.token).toBeDefined();
      expect(res.body.dados.usuario).toBeDefined();
      expect(res.body.dados.usuario.email).toBe(usuarioTeste.email);
      expect(res.body.dados.usuario.nome).toBe(usuarioTeste.nome);
    });

    test('deve rejeitar login com senha incorreta (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: usuarioTeste.email,
          senha: 'SenhaTotalmenteErrada123'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/inválid|incorret/i);
    });

    test('deve rejeitar login com usuário inexistente (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'naoexiste.teste@mei.com',
          senha: 'SenhaForte123@'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/inválid|não encontrado|incorret/i);
    });

    test('deve rejeitar login com campos ausentes (400)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: usuarioTeste.email });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let tokenValido = '';

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: usuarioTeste.email,
          senha: usuarioTeste.senha
        });
      tokenValido = loginRes.body.dados?.token;
    });

    test('deve retornar dados do perfil com token Bearer válido (200)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenValido}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toBeDefined();
      expect(res.body.dados.email).toBe(usuarioTeste.email);
      expect(res.body.dados.nome).toBe(usuarioTeste.nome);
      expect(res.body.dados.id).toBeDefined();
    });

    test('deve rejeitar requisição sem token (401)', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/token/i);
    });

    test('deve rejeitar requisição com token inválido (401)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token_completamente_invalido_123');

      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/token/i);
    });
  });
});
