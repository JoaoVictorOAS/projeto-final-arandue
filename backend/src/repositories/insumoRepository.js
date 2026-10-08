const pool = require('../config/database');

/**
 * Repositório para operações de Insumos (Matérias-Primas) no banco de dados
 * com isolamento multi-tenant por usuario_id.
 */
const insumoRepository = {
  /**
   * Insere um novo insumo.
   * @param {Object} dados
   * @param {number} dados.usuario_id
   * @param {string} dados.nome
   * @param {'g'|'ml'|'un'} dados.unidade_base
   * @param {number} [dados.quantidade_atual=0]
   * @param {number} [dados.estoque_minimo=0]
   * @param {number} [dados.custo_unitario=0]
   * @param {Object} [connection] Pool ou conexão de transação
   * @returns {Promise<Object>}
   */
  async criar(
    { usuario_id, nome, unidade_base, quantidade_atual = 0, estoque_minimo = 0, custo_unitario = 0 },
    connection = pool
  ) {
    const conn = connection || pool;
    const [result] = await conn.query(
      `INSERT INTO insumos (usuario_id, nome, unidade_base, quantidade_atual, estoque_minimo, custo_unitario) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuario_id, nome.trim(), unidade_base, quantidade_atual, estoque_minimo, custo_unitario]
    );
    return await this.buscarPorId(result.insertId, usuario_id, conn);
  },

  /**
   * Lista insumos ativos de um usuário com filtros opcionais.
   * @param {number} usuario_id
   * @param {Object} [filtros={}]
   * @param {string} [filtros.busca]
   * @param {boolean} [filtros.apenasAbaixoMinimo=false]
   * @param {Object} [connection]
   * @returns {Promise<Array>}
   */
  async listar(usuario_id, { busca, apenasAbaixoMinimo = false } = {}, connection = pool) {
    const conn = connection || pool;
    let sql = 'SELECT * FROM insumos WHERE usuario_id = ? AND ativo = 1 AND deletado_em IS NULL';
    const params = [usuario_id];

    if (busca && typeof busca === 'string' && busca.trim()) {
      sql += ' AND nome LIKE ?';
      params.push(`%${busca.trim()}%`);
    }

    if (apenasAbaixoMinimo) {
      sql += ' AND quantidade_atual <= estoque_minimo';
    }

    sql += ' ORDER BY nome ASC';
    const [rows] = await conn.query(sql, params);
    return rows;
  },

  /**
   * Busca um insumo ativo por ID e usuário.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {Object} [connection]
   * @returns {Promise<Object|null>}
   */
  async buscarPorId(id, usuario_id, connection = pool) {
    const conn = connection || pool;
    const [rows] = await conn.query(
      'SELECT * FROM insumos WHERE id = ? AND usuario_id = ? AND deletado_em IS NULL LIMIT 1',
      [id, usuario_id]
    );
    return rows[0] || null;
  },

  /**
   * Busca um insumo por nome exato (case insensitive) e usuário.
   * @param {string} nome
   * @param {number} usuario_id
   * @param {Object} [connection]
   * @returns {Promise<Object|null>}
   */
  async buscarPorNome(nome, usuario_id, connection = pool) {
    if (!nome || typeof nome !== 'string') return null;
    const conn = connection || pool;
    const [rows] = await conn.query(
      'SELECT * FROM insumos WHERE usuario_id = ? AND LOWER(nome) = LOWER(?) AND deletado_em IS NULL LIMIT 1',
      [usuario_id, nome.trim()]
    );
    return rows[0] || null;
  },

  /**
   * Atualiza informações cadastrais do insumo.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {Object} dados
   * @param {string} [dados.nome]
   * @param {number} [dados.estoque_minimo]
   * @param {number} [dados.ativo]
   * @param {Object} [connection]
   * @returns {Promise<Object|null>}
   */
  async atualizar(id, usuario_id, { nome, estoque_minimo, ativo }, connection = pool) {
    const conn = connection || pool;
    await conn.query(
      `UPDATE insumos 
       SET nome = COALESCE(?, nome), 
           estoque_minimo = COALESCE(?, estoque_minimo),
           ativo = COALESCE(?, ativo)
       WHERE id = ? AND usuario_id = ?`,
      [nome ? nome.trim() : null, estoque_minimo, ativo, id, usuario_id]
    );
    return await this.buscarPorId(id, usuario_id, conn);
  },

  /**
   * Atualiza quantidade atual e custo unitário médio ponderado do insumo.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {number} novaQuantidade
   * @param {number} novoCustoUnitario
   * @param {Object} [connection]
   * @returns {Promise<Object|null>}
   */
  async atualizarSaldoECusto(id, usuario_id, novaQuantidade, novoCustoUnitario, connection = pool) {
    const conn = connection || pool;
    await conn.query(
      `UPDATE insumos 
       SET quantidade_atual = ?, custo_unitario = ? 
       WHERE id = ? AND usuario_id = ?`,
      [novaQuantidade, novoCustoUnitario, id, usuario_id]
    );
    return await this.buscarPorId(id, usuario_id, conn);
  },

  /**
   * Debita saldo de estoque de um insumo.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {number} quantidadeDebito
   * @param {Object} [connection]
   * @returns {Promise<Object|null>}
   */
  async debitarSaldo(id, usuario_id, quantidadeDebito, connection = pool) {
    const conn = connection || pool;
    await conn.query(
      `UPDATE insumos 
       SET quantidade_atual = quantidade_atual - ? 
       WHERE id = ? AND usuario_id = ?`,
      [quantidadeDebito, id, usuario_id]
    );
    return await this.buscarPorId(id, usuario_id, conn);
  },

  /**
   * Credita saldo de estoque de um insumo.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {number} quantidadeCredito
   * @param {Object} [connection]
   * @returns {Promise<Object|null>}
   */
  async creditarSaldo(id, usuario_id, quantidadeCredito, connection = pool) {
    const conn = connection || pool;
    await conn.query(
      `UPDATE insumos 
       SET quantidade_atual = quantidade_atual + ? 
       WHERE id = ? AND usuario_id = ?`,
      [quantidadeCredito, id, usuario_id]
    );
    return await this.buscarPorId(id, usuario_id, conn);
  },

  /**
   * Realiza exclusão lógica (soft delete) do insumo.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {Object} [connection]
   * @returns {Promise<boolean>}
   */
  async remover(id, usuario_id, connection = pool) {
    const conn = connection || pool;
    const [res] = await conn.query(
      'UPDATE insumos SET deletado_em = NOW(), ativo = 0 WHERE id = ? AND usuario_id = ?',
      [id, usuario_id]
    );
    return res.affectedRows > 0;
  }
};

module.exports = insumoRepository;
