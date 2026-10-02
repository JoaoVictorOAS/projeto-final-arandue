const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarioRepository = require('../repositories/usuarioRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_chave_jwt_recode_2026';
const JWT_EXPIRES_IN = '7d';

const authService = {
  /**
   * Registra um novo MEI no sistema.
   * @param {Object} param0
   * @param {string} param0.nome
   * @param {string} param0.email
   * @param {string} param0.senha
   * @returns {Promise<{ usuario: { id: number, nome: string, email: string }, token: string }>}
   */
  async registrar({ nome, email, senha }) {
    if (!nome || typeof nome !== 'string' || !nome.trim()) {
      const erro = new Error('Nome é obrigatório');
      erro.statusCode = 400;
      throw erro;
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      const erro = new Error('E-mail é obrigatório');
      erro.statusCode = 400;
      throw erro;
    }

    const emailLimpo = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLimpo)) {
      const erro = new Error('Formato de e-mail inválido');
      erro.statusCode = 400;
      throw erro;
    }

    if (!senha || typeof senha !== 'string') {
      const erro = new Error('Senha é obrigatória');
      erro.statusCode = 400;
      throw erro;
    }

    if (senha.length < 6) {
      const erro = new Error('A senha deve possuir pelo menos 6 caracteres');
      erro.statusCode = 400;
      throw erro;
    }

    const usuarioExistente = await usuarioRepository.buscarPorEmail(emailLimpo);
    if (usuarioExistente) {
      const erro = new Error('E-mail já cadastrado');
      erro.statusCode = 400;
      throw erro;
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const novoUsuario = await usuarioRepository.criar({
      nome: nome.trim(),
      email: emailLimpo,
      senhaHash
    });

    const token = jwt.sign(
      {
        id: novoUsuario.id,
        nome: novoUsuario.nome,
        email: novoUsuario.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      usuario: novoUsuario,
      token
    };
  },

  /**
   * Autentica um usuário existente.
   * @param {Object} param0
   * @param {string} param0.email
   * @param {string} param0.senha
   * @returns {Promise<{ usuario: { id: number, nome: string, email: string }, token: string }>}
   */
  async login({ email, senha }) {
    if (!email || typeof email !== 'string' || !email.trim()) {
      const erro = new Error('E-mail é obrigatório');
      erro.statusCode = 400;
      throw erro;
    }

    if (!senha || typeof senha !== 'string') {
      const erro = new Error('Senha é obrigatória');
      erro.statusCode = 400;
      throw erro;
    }

    const emailLimpo = email.trim().toLowerCase();
    const usuario = await usuarioRepository.buscarPorEmail(emailLimpo);
    if (!usuario) {
      const erro = new Error('Credenciais inválidas');
      erro.statusCode = 401;
      throw erro;
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash || usuario.senha);
    if (!senhaValida) {
      const erro = new Error('Credenciais inválidas');
      erro.statusCode = 401;
      throw erro;
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      },
      token
    };
  },

  /**
   * Obtém o perfil de um usuário autenticado pelo seu ID.
   * @param {number|string} id
   * @returns {Promise<{ id: number, nome: string, email: string }>}
   */
  async obterPerfil(id) {
    const usuario = await usuarioRepository.buscarPorId(id);
    if (!usuario) {
      const erro = new Error('Usuário não encontrado');
      erro.statusCode = 404;
      throw erro;
    }

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      criado_em: usuario.criado_em
    };
  }
};

module.exports = authService;
