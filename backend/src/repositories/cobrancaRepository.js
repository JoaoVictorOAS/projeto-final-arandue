const pool = require('../config/database');

/**
 * Repositório para operações de Cobranças no banco de dados com isolamento multi-tenant.
 */
const cobrancaRepository = {
  /**
   * Cria uma nova cobrança no banco de dados.
   * @param {Object} dados
   * @param {number} dados.usuario_id
   * @param {number} dados.cliente_id
   * @param {number|null} [dados.orcamento_id]
   * @param {number} dados.valor
   * @param {string} dados.vencimento
   * @param {string} [dados.status]
   * @param {string|null} [dados.observacoes]
   * @param {Object|null} [connection]
   * @returns {Promise<Object>}
   */
  async criar(
    {
      usuario_id,
      cliente_id,
      orcamento_id = null,
      valor,
      vencimento,
      status = 'PENDENTE',
      observacoes = null
    },
    connection = null
  ) {
    const exec = connection || pool;
    const [result] = await exec.execute(
      `INSERT INTO cobrancas 
        (usuario_id, cliente_id, orcamento_id, valor, vencimento, status, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        usuario_id,
        cliente_id,
        orcamento_id || null,
        valor,
        vencimento,
        status || 'PENDENTE',
        observacoes || null
      ]
    );

    return await this.buscarPorId(result.insertId, usuario_id, connection);
  },

  /**
   * Lista cobranças do usuário com filtros opcionais por status e cliente.
   * @param {number} usuario_id
   * @param {Object} [filtros={}]
   * @param {string} [filtros.status]
   * @param {number|string} [filtros.cliente_id]
   * @returns {Promise<Array>}
   */
  async listar(usuario_id, { status, cliente_id } = {}) {
    let sql = `
      SELECT 
        c.id,
        c.usuario_id,
        c.cliente_id,
        c.orcamento_id,
        c.valor,
        DATE_FORMAT(c.vencimento, '%Y-%m-%d') AS vencimento,
        c.status,
        DATE_FORMAT(c.data_pagamento, '%Y-%m-%d') AS data_pagamento,
        c.observacoes,
        c.criado_em,
        c.atualizado_em,
        cl.nome AS cliente_nome,
        cl.telefone AS cliente_telefone,
        cl.email AS cliente_email
      FROM cobrancas c
      INNER JOIN clientes cl ON c.cliente_id = cl.id
      WHERE c.usuario_id = ?
    `;

    const params = [usuario_id];

    if (status && typeof status === 'string' && status.trim()) {
      sql += ' AND c.status = ?';
      params.push(status.trim().toUpperCase());
    }

    if (cliente_id !== undefined && cliente_id !== null && cliente_id !== '') {
      sql += ' AND c.cliente_id = ?';
      params.push(Number(cliente_id));
    }

    sql += ' ORDER BY c.vencimento ASC, c.id DESC';

    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  /**
   * Busca cobrança por ID e usuário trazendo dados do cliente.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {Object|null} [connection]
   * @returns {Promise<Object|null>}
   */
  async buscarPorId(id, usuario_id, connection = null) {
    const exec = connection || pool;
    const [rows] = await exec.execute(
      `SELECT 
        c.id,
        c.usuario_id,
        c.cliente_id,
        c.orcamento_id,
        c.valor,
        DATE_FORMAT(c.vencimento, '%Y-%m-%d') AS vencimento,
        c.status,
        DATE_FORMAT(c.data_pagamento, '%Y-%m-%d') AS data_pagamento,
        c.observacoes,
        c.criado_em,
        c.atualizado_em,
        cl.nome AS cliente_nome,
        cl.telefone AS cliente_telefone,
        cl.email AS cliente_email
      FROM cobrancas c
      INNER JOIN clientes cl ON c.cliente_id = cl.id
      WHERE c.id = ? AND c.usuario_id = ?`,
      [id, usuario_id]
    );

    return rows[0] || null;
  },

  /**
   * Atualiza dados de uma cobrança existente.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {Object} dados
   * @param {Object|null} [connection]
   * @returns {Promise<Object|null>}
   */
  async atualizar(id, usuario_id, dados, connection = null) {
    const exec = connection || pool;
    const campos = [];
    const valores = [];

    if (dados.cliente_id !== undefined) {
      campos.push('cliente_id = ?');
      valores.push(Number(dados.cliente_id));
    }
    if (dados.orcamento_id !== undefined) {
      campos.push('orcamento_id = ?');
      valores.push(dados.orcamento_id ? Number(dados.orcamento_id) : null);
    }
    if (dados.valor !== undefined) {
      campos.push('valor = ?');
      valores.push(Number(dados.valor));
    }
    if (dados.vencimento !== undefined) {
      campos.push('vencimento = ?');
      valores.push(dados.vencimento);
    }
    if (dados.status !== undefined) {
      campos.push('status = ?');
      valores.push(dados.status.trim().toUpperCase());
    }
    if (dados.data_pagamento !== undefined) {
      campos.push('data_pagamento = ?');
      valores.push(dados.data_pagamento || null);
    }
    if (dados.observacoes !== undefined) {
      campos.push('observacoes = ?');
      valores.push(dados.observacoes && dados.observacoes.trim() ? dados.observacoes.trim() : null);
    }

    if (campos.length === 0) {
      return await this.buscarPorId(id, usuario_id, connection);
    }

    valores.push(id, usuario_id);
    const sql = `UPDATE cobrancas SET ${campos.join(', ')} WHERE id = ? AND usuario_id = ?`;

    await exec.execute(sql, valores);
    return await this.buscarPorId(id, usuario_id, connection);
  },

  /**
   * Atualiza o status e a data de pagamento da cobrança.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {Object} param
   * @param {string} param.status
   * @param {string|null} [param.data_pagamento]
   * @param {Object|null} [connection]
   * @returns {Promise<Object|null>}
   */
  async atualizarStatus(id, usuario_id, { status, data_pagamento }, connection = null) {
    const exec = connection || pool;
    let sql = 'UPDATE cobrancas SET status = ?';
    const params = [status.trim().toUpperCase()];

    if (data_pagamento !== undefined) {
      sql += ', data_pagamento = ?';
      params.push(data_pagamento);
    }

    sql += ' WHERE id = ? AND usuario_id = ?';
    params.push(id, usuario_id);

    await exec.execute(sql, params);
    return await this.buscarPorId(id, usuario_id, connection);
  },

  /**
   * Exclui uma cobrança pertencente ao usuário.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {Object|null} [connection]
   * @returns {Promise<boolean>}
   */
  async excluir(id, usuario_id, connection = null) {
    const exec = connection || pool;
    const [result] = await exec.execute(
      'DELETE FROM cobrancas WHERE id = ? AND usuario_id = ?',
      [id, usuario_id]
    );

    return result.affectedRows > 0;
  }
};

module.exports = cobrancaRepository;
