const pool = require('../config/database');

/**
 * Repositório para operações de Movimentações Financeiras (Livro Caixa)
 * no banco de dados com isolamento multi-tenant.
 */
const movimentacaoRepository = {
  /**
   * Registra uma nova movimentação financeira no livro caixa.
   * @param {Object} dados
   * @param {number} dados.usuario_id
   * @param {number|null} [dados.cobranca_id]
   * @param {string} dados.tipo 'ENTRADA' ou 'SAIDA'
   * @param {string} [dados.categoria]
   * @param {number} dados.valor
   * @param {string} dados.data_movimentacao Formato YYYY-MM-DD
   * @param {string} dados.descricao
   * @param {Object|null} [connection]
   * @returns {Promise<Object>}
   */
  async criar(
    {
      usuario_id,
      cobranca_id = null,
      tipo,
      categoria = 'Geral',
      valor,
      data_movimentacao,
      descricao
    },
    connection = null
  ) {
    const exec = connection || pool;
    const [result] = await exec.execute(
      `INSERT INTO movimentacoes 
        (usuario_id, cobranca_id, tipo, categoria, valor, data_movimentacao, descricao) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        usuario_id,
        cobranca_id || null,
        tipo,
        categoria || 'Geral',
        valor,
        data_movimentacao,
        descricao
      ]
    );

    return await this.buscarPorId(result.insertId, usuario_id, connection);
  },

  /**
   * Lista movimentações do usuário com filtros opcionais.
   * @param {number} usuario_id
   * @param {Object} [filtros={}]
   * @param {string} [filtros.tipo]
   * @param {string} [filtros.categoria]
   * @param {string} [filtros.data_inicio]
   * @param {string} [filtros.data_fim]
   * @returns {Promise<Array>}
   */
  async listar(usuario_id, { tipo, categoria, data_inicio, data_fim } = {}) {
    let sql = `
      SELECT 
        m.id,
        m.usuario_id,
        m.cobranca_id,
        m.tipo,
        m.categoria,
        m.valor,
        DATE_FORMAT(m.data_movimentacao, '%Y-%m-%d') AS data_movimentacao,
        m.descricao,
        m.criado_em,
        c.cliente_id,
        cl.nome AS cliente_nome,
        c.agendamento_id,
        c.orcamento_id
      FROM movimentacoes m
      LEFT JOIN cobrancas c ON m.cobranca_id = c.id
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      WHERE m.usuario_id = ?
    `;

    const params = [usuario_id];

    if (tipo && typeof tipo === 'string' && tipo.trim()) {
      sql += ' AND m.tipo = ?';
      params.push(tipo.trim().toUpperCase());
    }

    if (categoria && typeof categoria === 'string' && categoria.trim()) {
      sql += ' AND m.categoria = ?';
      params.push(categoria.trim());
    }

    if (data_inicio && typeof data_inicio === 'string' && data_inicio.trim()) {
      sql += ' AND m.data_movimentacao >= ?';
      params.push(data_inicio.trim().slice(0, 10));
    }

    if (data_fim && typeof data_fim === 'string' && data_fim.trim()) {
      sql += ' AND m.data_movimentacao <= ?';
      params.push(data_fim.trim().slice(0, 10));
    }

    sql += ' ORDER BY m.data_movimentacao DESC, m.criado_em DESC, m.id DESC';

    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  /**
   * Busca movimentação por ID e usuário.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {Object|null} [connection]
   * @returns {Promise<Object|null>}
   */
  async buscarPorId(id, usuario_id, connection = null) {
    const exec = connection || pool;
    const [rows] = await exec.execute(
      `SELECT 
        m.id,
        m.usuario_id,
        m.cobranca_id,
        m.tipo,
        m.categoria,
        m.valor,
        DATE_FORMAT(m.data_movimentacao, '%Y-%m-%d') AS data_movimentacao,
        m.descricao,
        m.criado_em,
        c.cliente_id,
        cl.nome AS cliente_nome,
        c.agendamento_id,
        c.orcamento_id
      FROM movimentacoes m
      LEFT JOIN cobrancas c ON m.cobranca_id = c.id
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      WHERE m.id = ? AND m.usuario_id = ?`,
      [id, usuario_id]
    );

    return rows[0] || null;
  },

  /**
   * Exclui uma movimentação pertencente ao usuário.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {Object|null} [connection]
   * @returns {Promise<boolean>}
   */
  async excluir(id, usuario_id, connection = null) {
    const exec = connection || pool;
    const [result] = await exec.execute(
      'DELETE FROM movimentacoes WHERE id = ? AND usuario_id = ?',
      [id, usuario_id]
    );

    return result.affectedRows > 0;
  },

  /**
   * Obtém totais consolidados de entradas, saídas e saldo para um período.
   * @param {number} usuario_id
   * @param {number|string|null} [ano]
   * @param {number|string|null} [mes]
   * @returns {Promise<{ entradas: number, saidas: number, saldo: number }>}
   */
  async obterTotais(usuario_id, ano = null, mes = null) {
    let sql = `
      SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'ENTRADA' THEN valor ELSE 0 END), 0) AS entradas,
        COALESCE(SUM(CASE WHEN tipo = 'SAIDA' THEN valor ELSE 0 END), 0) AS saidas
      FROM movimentacoes
      WHERE usuario_id = ?
    `;

    const params = [usuario_id];

    if (ano !== undefined && ano !== null && ano !== '') {
      sql += ' AND YEAR(data_movimentacao) = ?';
      params.push(Number(ano));
    }

    if (mes !== undefined && mes !== null && mes !== '') {
      sql += ' AND MONTH(data_movimentacao) = ?';
      params.push(Number(mes));
    }

    const [rows] = await pool.execute(sql, params);
    const entradas = Number(rows[0]?.entradas || 0);
    const saidas = Number(rows[0]?.saidas || 0);
    const saldo = Number((entradas - saidas).toFixed(2));

    return {
      entradas,
      saidas,
      saldo
    };
  }
};

module.exports = movimentacaoRepository;
