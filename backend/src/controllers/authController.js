const authService = require('../services/authService');

/**
 * Controller responsável pelos fluxos de autenticação do MEI.
 */
const authController = {
  /**
   * POST /api/auth/register
   * Cadastra novo usuário e retorna token JWT e dados do usuário.
   */
  async registrar(req, res) {
    try {
      const { nome, email, senha } = req.body;
      const { usuario, token } = await authService.registrar({ nome, email, senha });

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Usuário registrado com sucesso',
        dados: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          token,
          usuario: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email
          }
        }
      });
    } catch (err) {
      const status = err.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: err.message || 'Erro interno do servidor'
      });
    }
  },

  /**
   * POST /api/auth/login
   * Valida credenciais e retorna token JWT e dados do usuário.
   */
  async login(req, res) {
    try {
      const { email, senha } = req.body;
      const { usuario, token } = await authService.login({ email, senha });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Autenticado com sucesso',
        dados: {
          token,
          usuario: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email
          }
        }
      });
    } catch (err) {
      const status = err.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: err.message || 'Erro ao realizar login'
      });
    }
  },

  /**
   * GET /api/auth/me
   * Retorna os dados do perfil do usuário autenticado via Bearer Token.
   */
  async me(req, res) {
    try {
      const usuario = await authService.obterPerfil(req.usuario.id);

      return res.status(200).json({
        sucesso: true,
        dados: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email
        }
      });
    } catch (err) {
      const status = err.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: err.message || 'Erro ao buscar perfil do usuário'
      });
    }
  }
};

module.exports = authController;
