const jwt = require('jsonwebtoken');
const authMiddleware = require('../src/middlewares/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_chave_jwt_recode_2026';

describe('authMiddleware - Scoped Token Tests', () => {
  let req, res, next;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  test('deve liberar requisicao normal GET com token padrao (sem scope)', () => {
    const token = jwt.sign({ id: 1, nome: 'João', email: 'joao@teste.com' }, JWT_SECRET);
    req = {
      method: 'GET',
      baseUrl: '/api/clientes',
      path: '/',
      headers: { authorization: `Bearer ${token}` }
    };

    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.usuario.id).toBe(1);
    expect(req.usuario.scope).toBeNull();
  });

  test('deve liberar requisicao normal POST com token padrao (sem scope)', () => {
    const token = jwt.sign({ id: 1, nome: 'João', email: 'joao@teste.com' }, JWT_SECRET);
    req = {
      method: 'POST',
      baseUrl: '/api/clientes',
      path: '/',
      headers: { authorization: `Bearer ${token}` }
    };

    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('deve permitir GET em endpoints de leitura com scope assistente:read', () => {
    const token = jwt.sign({ id: 1, scope: 'assistente:read' }, JWT_SECRET);
    req = {
      method: 'GET',
      baseUrl: '/api/servicos',
      path: '/',
      headers: { authorization: `Bearer ${token}` }
    };

    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.usuario.scope).toBe('assistente:read');
  });

  test('deve bloquear POST com status 403 quando token tem scope assistente:read', () => {
    const token = jwt.sign({ id: 1, scope: 'assistente:read' }, JWT_SECRET);
    req = {
      method: 'POST',
      baseUrl: '/api/servicos',
      path: '/',
      headers: { authorization: `Bearer ${token}` }
    };

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      sucesso: false,
      mensagem: expect.stringMatching(/token de leitura restrito/i)
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('deve bloquear acesso a /api/assistente quando token tem scope assistente:read (evita loop)', () => {
    const token = jwt.sign({ id: 1, scope: 'assistente:read' }, JWT_SECRET);
    req = {
      method: 'GET',
      baseUrl: '/api/assistente',
      path: '/conversas',
      headers: { authorization: `Bearer ${token}` }
    };

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('deve permitir POST em rotas de negocio com scope assistente:operator (cadastro via MCP)', () => {
    const token = jwt.sign({ id: 1, scope: 'assistente:operator' }, JWT_SECRET);
    req = {
      method: 'POST',
      baseUrl: '/api/clientes',
      path: '/',
      headers: { authorization: `Bearer ${token}` }
    };

    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.usuario.scope).toBe('assistente:operator');
  });

  test('deve bloquear DELETE com status 403 quando token tem scope assistente:operator (protecao contra exclusao acidental)', () => {
    const token = jwt.sign({ id: 1, scope: 'assistente:operator' }, JWT_SECRET);
    req = {
      method: 'DELETE',
      baseUrl: '/api/clientes',
      path: '/10',
      headers: { authorization: `Bearer ${token}` }
    };

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      sucesso: false,
      mensagem: expect.stringMatching(/operador do assistente/i)
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('deve bloquear acesso a /api/assistente quando token tem scope assistente:operator (evita recursao)', () => {
    const token = jwt.sign({ id: 1, scope: 'assistente:operator' }, JWT_SECRET);
    req = {
      method: 'POST',
      baseUrl: '/api/assistente',
      path: '/mensagens',
      headers: { authorization: `Bearer ${token}` }
    };

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
