const pool = require('../config/database');

/**
 * Repositório para operações de Agendamentos no banco de dados com isolamento multi-tenant.
 */
const agendamentoRepository = {
  /**
   * Lista agendamentos do usuário com joins em clientes e serviços, ordenado por data_hora ASC.
   * @param {number} usuario_id
   * @param {Object} [filtros={}]
   * @param {string} [filtros.data] Formato YYYY-MM-DD
   * @param {string} [filtros.status]
   * @returns {Promise<Array>}
   */
  async listar(usuario_id, { data, status } = {}) {
    let sql = `
      SELECT 
        a.id,
        a.usuario_id,
        a.cliente_id,
        c.nome AS cliente_nome,
        c.telefone AS cliente_telefone,
        c.email AS cliente_email,
        a.servico_id,
        s.nome AS servico_nome,
        s.preco AS servico_preco,
        a.data_hora,
        a.status,
        a.observacoes,
        a.criado_em,
        a.atualizado_em
      FROM agendamentos a
      INNER JOIN clientes c ON a.cliente_id = c.id
      LEFT JOIN servicos s ON a.servico_id = s.id
      WHERE a.usuario_id = ?
    `;

    const params = [usuario_id];

    if (data && typeof data === 'string' && data.trim()) {
      sql += ' AND DATE(a.data_hora) = ?';
      params.push(data.trim().slice(0, 10));
    }

    if (status && typeof status === 'string' && status.trim()) {
      sql += ' AND a.status = ?';
      params.push(status.trim().toUpperCase());
    }

    sql += ' ORDER BY a.data_hora ASC, a.id ASC';

    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  /**
   * Busca um agendamento por ID e usuário trazendo dados completos (cliente e serviço).
   * @param {number|string} id
   * @param {number} usuario_id
   * @returns {Promise<Object|null>}
   */
  async buscarPorId(id, usuario_id) {
    const [rows] = await pool.execute(
      `SELECT 
        a.id,
        a.usuario_id,
        a.cliente_id,
        c.nome AS cliente_nome,
        c.telefone AS cliente_telefone,
        c.email AS cliente_email,
        a.servico_id,
        s.nome AS servico_nome,
        s.preco AS servico_preco,
        a.data_hora,
        a.status,
        a.observacoes,
        a.criado_em,
        a.atualizado_em
      FROM agendamentos a
      INNER JOIN clientes c ON a.cliente_id = c.id
      LEFT JOIN servicos s ON a.servico_id = s.id
      WHERE a.id = ? AND a.usuario_id = ?`,
      [id, usuario_id]
    );

    return rows[0] || null;
  },

  /**
   * Verifica se já existe agendamento ativo (status != 'CANCELADO') no mesmo horário para o mesmo MEI.
   * @param {number} usuario_id
   * @param {string} data_hora
   * @param {number|string|null} [ignorarId=null]
   * @returns {Promise<Object|null>}
   */
  async buscarConflito(usuario_id, data_hora, ignorarId = null) {
    let sql = `
      SELECT id, usuario_id, cliente_id, servico_id, data_hora, status
      FROM agendamentos
      WHERE usuario_id = ? 
        AND data_hora = ? 
        AND status != 'CANCELADO'
    `;
    const params = [usuario_id, data_hora];

    if (ignorarId) {
      sql += ' AND id != ?';
      params.push(ignorarId);
    }

    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  },

  /**
   * Cria um novo agendamento.
   * @param {Object} dados
   * @param {number} dados.usuario_id
   * @param {number} dados.cliente_id
   * @param {number|null} [dados.servico_id]
   * @param {string} dados.data_hora Formato YYYY-MM-DD HH:mm:ss
   * @param {string} [dados.status]
   * @param {string|null} [dados.observacoes]
   * @returns {Promise<Object>}
   */
  async criar({ usuario_id, cliente_id, servico_id, data_hora, status = 'PENDENTE', observacoes = null }) {
    const [result] = await pool.execute(
      `INSERT INTO agendamentos 
        (usuario_id, cliente_id, servico_id, data_hora, status, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        usuario_id,
        cliente_id,
        servico_id || null,
        data_hora,
        status || 'PENDENTE',
        observacoes || null
      ]
    );

    return await this.buscarPorId(result.insertId, usuario_id);
  },

  /**
   * Atualiza dados de um agendamento existente de forma segura.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {Object} dados
   * @returns {Promise<Object|null>}
   */
  async atualizar(id, usuario_id, dados) {
    const campos = [];
    const valores = [];

    if (dados.cliente_id !== undefined) {
      campos.push('cliente_id = ?');
      valores.push(Number(dados.cliente_id));
    }
    if (dados.servico_id !== undefined) {
      campos.push('servico_id = ?');
      valores.push(dados.servico_id ? Number(dados.servico_id) : null);
    }
    if (dados.data_hora !== undefined) {
      campos.push('data_hora = ?');
      valores.push(dados.data_hora);
    }
    if (dados.status !== undefined) {
      campos.push('status = ?');
      valores.push(dados.status.trim().toUpperCase());
    }
    if (dados.observacoes !== undefined) {
      campos.push('observacoes = ?');
      valores.push(dados.observacoes && dados.observacoes.trim() ? dados.observacoes.trim() : null);
    }

    if (campos.length === 0) {
      return await this.buscarPorId(id, usuario_id);
    }

    valores.push(id, usuario_id);

    const [result] = await pool.execute(
      `UPDATE agendamentos SET ${campos.join(', ')} WHERE id = ? AND usuario_id = ?`,
      valores
    );

    if (result.affectedRows === 0) {
      const existe = await this.buscarPorId(id, usuario_id);
      if (!existe) return null;
    }

    return await this.buscarPorId(id, usuario_id);
  },

  /**
   * Atualiza apenas o status do agendamento.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {string} status
   * @returns {Promise<Object|null>}
   */
  async atualizarStatus(id, usuario_id, status) {
    const [result] = await pool.execute(
      'UPDATE agendamentos SET status = ? WHERE id = ? AND usuario_id = ?',
      [status.trim().toUpperCase(), id, usuario_id]
    );

    if (result.affectedRows === 0) {
      const existe = await this.buscarPorId(id, usuario_id);
      if (!existe) return null;
    }

    return await this.buscarPorId(id, usuario_id);
  },

  /**
   * Exclui um agendamento do banco de dados.
   * @param {number|string} id
   * @param {number} usuario_id
   * @returns {Promise<boolean>}
   */
  async excluir(id, usuario_id) {
    const [result] = await pool.execute(
      'DELETE FROM agendamentos WHERE id = ? AND usuario_id = ?',
      [id, usuario_id]
    );

    return result.affectedRows > 0;
  }
};

module.exports = agendamentoRepository;
