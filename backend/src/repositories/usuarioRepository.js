const pool = require('../config/database');

/**
 * Repositório para operações de Usuários (MEIs) no banco de dados.
 */
const usuarioRepository = {
  /**
   * Insere um novo usuário na base de dados.
   * Suporta tanto o parâmetro senhaHash quanto senha.
   * @param {Object} dados
   * @param {string} dados.nome
   * @param {string} dados.email
   * @param {string} [dados.senhaHash]
   * @param {string} [dados.senha]
   * @returns {Promise<{ id: number, nome: string, email: string }>}
   */
  async criar({ nome, email, senhaHash, senha }) {
    const hash = senhaHash || senha;
    const [result] = await pool.execute(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      [nome, email, hash]
    );

    return {
      id: result.insertId,
      nome,
      email
    };
  },

  /**
   * Busca um usuário pelo endereço de e-mail.
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async buscarPorEmail(email) {
    const [rows] = await pool.execute(
      'SELECT id, nome, email, senha, senha AS senha_hash, criado_em, atualizado_em FROM usuarios WHERE email = ?',
      [email]
    );

    return rows[0] || null;
  },

  /**
   * Busca um usuário pelo ID.
   * @param {number|string} id
   * @returns {Promise<Object|null>}
   */
  async buscarPorId(id) {
    const [rows] = await pool.execute(
      'SELECT id, nome, email, criado_em, atualizado_em FROM usuarios WHERE id = ?',
      [id]
    );

    return rows[0] || null;
  }
};

module.exports = usuarioRepository;
