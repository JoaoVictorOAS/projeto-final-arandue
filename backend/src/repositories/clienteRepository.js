const pool = require('../config/database');

/**
 * Repositório para operações de Clientes no banco de dados com isolamento multi-tenant.
 */
const clienteRepository = {
  /**
   * Lista todos os clientes ativos pertencentes ao usuário (MEI).
   * Suporta busca opcional por nome, email ou telefone.
   * @param {number} usuario_id
   * @param {string} [busca]
   * @returns {Promise<Array>}
   */
  async listar(usuario_id, busca) {
    let sql = 'SELECT id, usuario_id, nome, telefone, email, endereco, observacoes, ativo, criado_em, atualizado_em, deletado_em FROM clientes WHERE usuario_id = ? AND ativo = 1';
    const params = [usuario_id];

    if (busca && typeof busca === 'string' && busca.trim()) {
      sql += ' AND (nome LIKE ? OR email LIKE ? OR telefone LIKE ?)';
      const termo = `%${busca.trim()}%`;
      params.push(termo, termo, termo);
    }

    sql += ' ORDER BY nome ASC';

    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  /**
   * Busca um cliente ativo por ID e usuário.
   * @param {number|string} id
   * @param {number} usuario_id
   * @returns {Promise<Object|null>}
   */
  async buscarPorId(id, usuario_id) {
    const [rows] = await pool.execute(
      'SELECT id, usuario_id, nome, telefone, email, endereco, observacoes, ativo, criado_em, atualizado_em, deletado_em FROM clientes WHERE id = ? AND usuario_id = ? AND ativo = 1',
      [id, usuario_id]
    );

    return rows[0] || null;
  },

  /**
   * Insere um novo cliente associado ao usuário.
   * @param {Object} dados
   * @param {number} dados.usuario_id
   * @param {string} dados.nome
   * @param {string} [dados.telefone]
   * @param {string} [dados.email]
   * @param {string} [dados.endereco]
   * @param {string} [dados.observacoes]
   * @returns {Promise<Object>}
   */
  async criar({ usuario_id, nome, telefone, email, endereco, observacoes }) {
    const tel = telefone && telefone.trim() ? telefone.trim() : null;
    const mail = email && email.trim() ? email.trim() : null;
    const end = endereco && endereco.trim() ? endereco.trim() : null;
    const obs = observacoes && observacoes.trim() ? observacoes.trim() : null;

    const [result] = await pool.execute(
      'INSERT INTO clientes (usuario_id, nome, telefone, email, endereco, observacoes) VALUES (?, ?, ?, ?, ?, ?)',
      [usuario_id, nome.trim(), tel, mail, end, obs]
    );

    return {
      id: result.insertId,
      usuario_id,
      nome: nome.trim(),
      telefone: tel,
      email: mail,
      endereco: end,
      observacoes: obs
    };
  },

  /**
   * Atualiza dados de um cliente existente de forma segura (multi-tenant).
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {Object} dados
   * @returns {Promise<Object|null>}
   */
  async atualizar(id, usuario_id, dados) {
    const campos = [];
    const valores = [];

    if (dados.nome !== undefined) {
      campos.push('nome = ?');
      valores.push(dados.nome.trim());
    }
    if (dados.telefone !== undefined) {
      campos.push('telefone = ?');
      valores.push(dados.telefone && dados.telefone.trim() ? dados.telefone.trim() : null);
    }
    if (dados.email !== undefined) {
      campos.push('email = ?');
      valores.push(dados.email && dados.email.trim() ? dados.email.trim() : null);
    }
    if (dados.endereco !== undefined) {
      campos.push('endereco = ?');
      valores.push(dados.endereco && dados.endereco.trim() ? dados.endereco.trim() : null);
    }
    if (dados.observacoes !== undefined) {
      campos.push('observacoes = ?');
      valores.push(dados.observacoes && dados.observacoes.trim() ? dados.observacoes.trim() : null);
    }

    if (campos.length === 0) {
      return this.buscarPorId(id, usuario_id);
    }

    valores.push(id, usuario_id);

    const [result] = await pool.execute(
      `UPDATE clientes SET ${campos.join(', ')} WHERE id = ? AND usuario_id = ? AND ativo = 1`,
      valores
    );

    if (result.affectedRows === 0) {
      const existe = await this.buscarPorId(id, usuario_id);
      if (!existe) return null;
    }

    return this.buscarPorId(id, usuario_id);
  },

  /**
   * Realiza soft delete de um cliente desativando seu registro.
   * @param {number|string} id
   * @param {number} usuario_id
   * @returns {Promise<boolean>}
   */
  async excluir(id, usuario_id) {
    const [result] = await pool.execute(
      'UPDATE clientes SET ativo = 0, deletado_em = NOW() WHERE id = ? AND usuario_id = ? AND ativo = 1',
      [id, usuario_id]
    );

    return result.affectedRows > 0;
  }
};

module.exports = clienteRepository;
