const pool = require('../config/database');

/**
 * Repositório para operações de Orçamentos e Itens de Orçamento no banco de dados
 * com transações MySQL e isolamento multi-tenant.
 */
const orcamentoRepository = {
  /**
   * Cria um orçamento e seus itens em uma transação atômica MySQL.
   * @param {Object} dados
   * @param {number} dados.usuario_id
   * @param {number} dados.cliente_id
   * @param {string} dados.data_emissao
   * @param {string|null} [dados.validade]
   * @param {string} [dados.status]
   * @param {number} dados.subtotal
   * @param {number} dados.desconto
   * @param {number} dados.total
   * @param {string|null} [dados.observacoes]
   * @param {Array<Object>} dados.itens
   * @returns {Promise<Object>}
   */
  async criar({
    usuario_id,
    cliente_id,
    data_emissao,
    validade,
    status = 'RASCUNHO',
    subtotal,
    desconto = 0.00,
    total,
    observacoes = null,
    itens = []
  }) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [orcamentoResult] = await connection.execute(
        `INSERT INTO orcamentos 
          (usuario_id, cliente_id, data_emissao, validade, status, subtotal, desconto, total, observacoes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          usuario_id,
          cliente_id,
          data_emissao,
          validade || null,
          status || 'RASCUNHO',
          subtotal,
          desconto,
          total,
          observacoes || null
        ]
      );

      const orcamentoId = orcamentoResult.insertId;

      for (const item of itens) {
        await connection.execute(
          `INSERT INTO orcamento_itens 
            (orcamento_id, servico_id, quantidade, preco_unitario, subtotal) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            orcamentoId,
            item.servico_id || null,
            item.quantidade,
            item.preco_unitario,
            item.subtotal
          ]
        );
      }

      await connection.commit();

      return await this.buscarPorId(orcamentoId, usuario_id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Lista orçamentos pertencentes ao usuário com filtros opcionais.
   * @param {number} usuario_id
   * @param {Object} [filtros={}]
   * @param {string} [filtros.status]
   * @param {number|string} [filtros.cliente_id]
   * @returns {Promise<Array>}
   */
  async listar(usuario_id, { status, cliente_id } = {}) {
    let sql = `
      SELECT 
        o.id,
        o.usuario_id,
        o.cliente_id,
        c.nome AS cliente_nome,
        c.telefone AS cliente_telefone,
        c.email AS cliente_email,
        o.data_emissao,
        o.validade,
        o.status,
        o.subtotal,
        o.desconto,
        o.total,
        o.observacoes,
        o.criado_em,
        o.atualizado_em,
        (SELECT COUNT(*) FROM orcamento_itens oi WHERE oi.orcamento_id = o.id) AS total_itens
      FROM orcamentos o
      INNER JOIN clientes c ON o.cliente_id = c.id
      WHERE o.usuario_id = ?
    `;

    const params = [usuario_id];

    if (status && typeof status === 'string' && status.trim()) {
      sql += ' AND o.status = ?';
      params.push(status.trim().toUpperCase());
    }

    if (cliente_id !== undefined && cliente_id !== null && cliente_id !== '') {
      sql += ' AND o.cliente_id = ?';
      params.push(Number(cliente_id));
    }

    sql += ' ORDER BY o.criado_em DESC, o.id DESC';

    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  /**
   * Busca um orçamento por ID e usuário, incluindo cliente e lista de itens com serviço.
   * @param {number|string} id
   * @param {number} usuario_id
   * @returns {Promise<Object|null>}
   */
  async buscarPorId(id, usuario_id) {
    const [orcamentos] = await pool.execute(
      `SELECT 
        o.id,
        o.usuario_id,
        o.cliente_id,
        c.nome AS cliente_nome,
        c.telefone AS cliente_telefone,
        c.email AS cliente_email,
        o.data_emissao,
        o.validade,
        o.status,
        o.subtotal,
        o.desconto,
        o.total,
        o.observacoes,
        o.criado_em,
        o.atualizado_em
      FROM orcamentos o
      INNER JOIN clientes c ON o.cliente_id = c.id
      WHERE o.id = ? AND o.usuario_id = ?`,
      [id, usuario_id]
    );

    if (!orcamentos || orcamentos.length === 0) {
      return null;
    }

    const orcamento = orcamentos[0];

    const [itens] = await pool.execute(
      `SELECT 
        oi.id,
        oi.orcamento_id,
        oi.servico_id,
        s.nome AS servico_nome,
        oi.quantidade,
        oi.preco_unitario,
        oi.subtotal
      FROM orcamento_itens oi
      LEFT JOIN servicos s ON oi.servico_id = s.id
      WHERE oi.orcamento_id = ?
      ORDER BY oi.id ASC`,
      [id]
    );

    return {
      ...orcamento,
      itens
    };
  },

  /**
   * Atualiza o status de um orçamento de forma segura (multi-tenant).
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {string} status
   * @returns {Promise<Object|null>}
   */
  async atualizarStatus(id, usuario_id, status) {
    const [result] = await pool.execute(
      'UPDATE orcamentos SET status = ? WHERE id = ? AND usuario_id = ?',
      [status.trim().toUpperCase(), id, usuario_id]
    );

    if (result.affectedRows === 0) {
      const existe = await this.buscarPorId(id, usuario_id);
      if (!existe) return null;
    }

    return await this.buscarPorId(id, usuario_id);
  },

  /**
   * Exclui um orçamento e seus itens (ON DELETE CASCADE) de forma segura.
   * @param {number|string} id
   * @param {number} usuario_id
   * @returns {Promise<boolean>}
   */
  async excluir(id, usuario_id) {
    const [result] = await pool.execute(
      'DELETE FROM orcamentos WHERE id = ? AND usuario_id = ?',
      [id, usuario_id]
    );

    return result.affectedRows > 0;
  }
};

module.exports = orcamentoRepository;
