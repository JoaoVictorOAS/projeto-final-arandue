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
      'SELECT id, nome, email, whatsapp, whatsapp_verificado, criado_em, atualizado_em FROM usuarios WHERE id = ?',
      [id]
    );

    return rows[0] || null;
  },

  /**
   * Busca um usuário por variações de número de telefone (whatsapp ou telefone_comercial).
   * @param {string[]|string} variacoes - Lista de números candidatos (ex: com DDI, sem DDI, com 9, sem 9)
   * @returns {Promise<Object|null>}
   */
  async buscarPorTelefoneOuWhatsapp(variacoes) {
    const lista = Array.isArray(variacoes) ? variacoes.filter(Boolean) : [variacoes].filter(Boolean);
    if (lista.length === 0) return null;

    const placeholders = lista.map(() => '?').join(',');

    // 1. Busca direta na tabela usuarios pelo campo whatsapp
    const [rowsUsuarios] = await pool.query(
      `SELECT id, nome, email, whatsapp, whatsapp_verificado, criado_em, atualizado_em 
       FROM usuarios 
       WHERE whatsapp IN (${placeholders})
       LIMIT 1`,
      lista
    );

    if (rowsUsuarios && rowsUsuarios.length > 0) {
      return rowsUsuarios[0];
    }

    // 2. Busca de fallback na tabela mei_configuracoes (telefone_comercial)
    const [rowsConfig] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.whatsapp, u.whatsapp_verificado, u.criado_em, u.atualizado_em,
              c.telefone_comercial, c.razao_social, c.nome_fantasia
       FROM mei_configuracoes c
       INNER JOIN usuarios u ON u.id = c.usuario_id
       WHERE c.telefone_comercial IN (${placeholders})
       LIMIT 1`,
      lista
    );

    if (rowsConfig && rowsConfig.length > 0) {
      return rowsConfig[0];
    }

    return null;
  },

  /**
   * Atualiza o número de WhatsApp do usuário e o status de verificação.
   * @param {number|string} usuario_id 
   * @param {string} whatsapp 
   * @param {number|boolean} verificado 
   * @returns {Promise<boolean>}
   */
  async atualizarWhatsapp(usuario_id, whatsapp, verificado = 1) {
    const [result] = await pool.execute(
      'UPDATE usuarios SET whatsapp = ?, whatsapp_verificado = ? WHERE id = ?',
      [whatsapp, verificado ? 1 : 0, usuario_id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Busca um usuário pelo número exato de WhatsApp.
   * @param {string} whatsapp 
   * @returns {Promise<Object|null>}
   */
  async buscarPorWhatsapp(whatsapp) {
    const [rows] = await pool.execute(
      'SELECT id, nome, email, whatsapp, whatsapp_verificado, criado_em, atualizado_em FROM usuarios WHERE whatsapp = ?',
      [whatsapp]
    );
    return rows[0] || null;
  }
};

module.exports = usuarioRepository;
