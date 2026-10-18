const pool = require('../config/database');

/**
 * Repositório para operações de Serviços e Produtos no banco de dados com isolamento multi-tenant.
 */
const servicoRepository = {
  /**
   * Lista serviços ativos de um usuário com filtros opcionais por busca, categoria e recorrência.
   * @param {number} usuario_id
   * @param {Object} [filtros={}]
   * @param {string} [filtros.busca]
   * @param {string} [filtros.categoria]
   * @param {boolean|string|number} [filtros.recorrente]
   * @returns {Promise<Array>}
   */
  async listar(usuario_id, { busca, categoria, recorrente } = {}) {
    let sql = `SELECT id, usuario_id, nome, descricao, preco, categoria, ativo, 
                      recorrente, periodicidade, dia_vencimento_padrao,
                      controla_estoque_pronto, estoque_pronto_atual, estoque_pronto_minimo, 
                      criado_em, atualizado_em, deletado_em 
               FROM servicos 
               WHERE usuario_id = ? AND ativo = 1`;
    const params = [usuario_id];

    if (busca && typeof busca === 'string' && busca.trim()) {
      sql += ' AND (nome LIKE ? OR descricao LIKE ?)';
      const termo = `%${busca.trim()}%`;
      params.push(termo, termo);
    }

    if (categoria && typeof categoria === 'string' && categoria.trim() && categoria.trim().toLowerCase() !== 'todas') {
      sql += ' AND categoria = ?';
      params.push(categoria.trim());
    }

    if (recorrente !== undefined && recorrente !== null && recorrente !== '') {
      const isRec = recorrente === true || recorrente === 'true' || recorrente === 1 || recorrente === '1';
      sql += ' AND recorrente = ?';
      params.push(isRec ? 1 : 0);
    }

    sql += ' ORDER BY nome ASC';

    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  /**
   * Busca um serviço ativo por ID e usuário.
   * @param {number|string} id
   * @param {number} usuario_id
   * @returns {Promise<Object|null>}
   */
  async buscarPorId(id, usuario_id) {
    const [rows] = await pool.execute(
      `SELECT id, usuario_id, nome, descricao, preco, categoria, ativo, 
              recorrente, periodicidade, dia_vencimento_padrao,
              controla_estoque_pronto, estoque_pronto_atual, estoque_pronto_minimo, 
              criado_em, atualizado_em, deletado_em 
       FROM servicos 
       WHERE id = ? AND usuario_id = ? AND ativo = 1`,
      [id, usuario_id]
    );

    return rows[0] || null;
  },

  /**
   * Insere um novo serviço associado ao usuário.
   * @param {Object} dados
   * @param {number} dados.usuario_id
   * @param {string} dados.nome
   * @param {string} [dados.descricao]
   * @param {number|string} dados.preco
   * @param {string} [dados.categoria]
   * @param {boolean|number} [dados.recorrente]
   * @param {string|null} [dados.periodicidade]
   * @param {number|null} [dados.dia_vencimento_padrao]
   * @returns {Promise<Object>}
   */
  async criar({ usuario_id, nome, descricao, preco, categoria, recorrente, periodicidade, dia_vencimento_padrao }) {
    const valorPreco = preco !== undefined && preco !== null ? Number(preco) : 0.00;
    const cat = categoria && categoria.trim() ? categoria.trim() : 'Geral';
    const desc = descricao && descricao.trim() ? descricao.trim() : null;
    const rec = recorrente ? 1 : 0;
    const per = rec && periodicidade && periodicidade.trim() ? periodicidade.trim().toUpperCase() : (rec ? 'MENSAL' : null);
    const diaVenc = rec && dia_vencimento_padrao !== undefined && dia_vencimento_padrao !== null && dia_vencimento_padrao !== '' 
      ? Number(dia_vencimento_padrao) 
      : (rec ? 10 : null);

    const [result] = await pool.execute(
      `INSERT INTO servicos 
        (usuario_id, nome, descricao, preco, categoria, recorrente, periodicidade, dia_vencimento_padrao) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuario_id, nome.trim(), desc, valorPreco, cat, rec, per, diaVenc]
    );

    return await this.buscarPorId(result.insertId, usuario_id);
  },

  /**
   * Atualiza dados de um serviço existente de forma segura (multi-tenant).
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
    if (dados.descricao !== undefined) {
      campos.push('descricao = ?');
      valores.push(dados.descricao && dados.descricao.trim() ? dados.descricao.trim() : null);
    }
    if (dados.preco !== undefined) {
      campos.push('preco = ?');
      valores.push(Number(dados.preco));
    }
    if (dados.categoria !== undefined) {
      campos.push('categoria = ?');
      valores.push(dados.categoria && dados.categoria.trim() ? dados.categoria.trim() : 'Geral');
    }
    if (dados.recorrente !== undefined) {
      const rec = dados.recorrente ? 1 : 0;
      campos.push('recorrente = ?');
      valores.push(rec);
      if (!rec) {
        campos.push('periodicidade = NULL');
        campos.push('dia_vencimento_padrao = NULL');
      }
    }
    if (dados.periodicidade !== undefined && (dados.recorrente === undefined || dados.recorrente)) {
      campos.push('periodicidade = ?');
      valores.push(dados.periodicidade ? dados.periodicidade.trim().toUpperCase() : null);
    }
    if (dados.dia_vencimento_padrao !== undefined && (dados.recorrente === undefined || dados.recorrente)) {
      campos.push('dia_vencimento_padrao = ?');
      valores.push(dados.dia_vencimento_padrao !== null && dados.dia_vencimento_padrao !== '' ? Number(dados.dia_vencimento_padrao) : null);
    }

    if (campos.length === 0) {
      return this.buscarPorId(id, usuario_id);
    }

    valores.push(id, usuario_id);

    const [result] = await pool.execute(
      `UPDATE servicos SET ${campos.join(', ')} WHERE id = ? AND usuario_id = ? AND ativo = 1`,
      valores
    );

    if (result.affectedRows === 0) {
      const existe = await this.buscarPorId(id, usuario_id);
      if (!existe) return null;
    }

    return this.buscarPorId(id, usuario_id);
  },

  /**
   * Realiza soft delete de um serviço desativando seu registro.
   * @param {number|string} id
   * @param {number} usuario_id
   * @returns {Promise<boolean>}
   */
  async excluir(id, usuario_id) {
    const [result] = await pool.execute(
      'UPDATE servicos SET ativo = 0, deletado_em = NOW() WHERE id = ? AND usuario_id = ? AND ativo = 1',
      [id, usuario_id]
    );

    return result.affectedRows > 0;
  }
};

module.exports = servicoRepository;
