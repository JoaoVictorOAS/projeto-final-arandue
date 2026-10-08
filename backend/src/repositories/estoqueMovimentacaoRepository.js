const pool = require('../config/database');

/**
 * Repositório para registro e consulta do ledger auditável de movimentações de estoque
 * (kardex de insumos e produtos prontos).
 * Garante isolamento multi-tenant por usuario_id e suporte a transações.
 */
const estoqueMovimentacaoRepository = {
  /**
   * Registra uma nova movimentação auditável no ledger de estoque.
   * @param {Object} dados
   * @param {number} dados.usuario_id ID do MEI proprietário
   * @param {number} [dados.insumo_id=null] ID do insumo (opcional)
   * @param {number} [dados.servico_id=null] ID do serviço/produto (opcional)
   * @param {'ENTRADA_COMPRA'|'SAIDA_PRODUCAO'|'ENTRADA_PRODUCAO'|'SAIDA_VENDA'|'AJUSTE_PERDA'|'AJUSTE_INVENTARIO'} dados.tipo Tipo da movimentação
   * @param {number} dados.quantidade Quantidade movimentada (positiva)
   * @param {number} [dados.custo_total=null] Custo financeiro total da movimentação
   * @param {number} [dados.movimentacao_financeira_id=null] Vínculo opcional com o Livro Caixa
   * @param {number} [dados.orcamento_id=null] Vínculo opcional com Orçamento de venda
   * @param {string} [dados.motivo=null] Justificativa ou descrição do evento
   * @param {Object} [connection] Pool ou conexão com transação ativa
   * @returns {Promise<Object>} Registro da movimentação inserida
   */
  async registrarMovimentacao(
    {
      usuario_id,
      insumo_id = null,
      servico_id = null,
      tipo,
      quantidade,
      custo_total = null,
      movimentacao_financeira_id = null,
      orcamento_id = null,
      motivo = null
    },
    connection = pool
  ) {
    const conn = connection || pool;
    const [res] = await conn.query(
      `INSERT INTO estoque_movimentacoes 
       (usuario_id, insumo_id, servico_id, tipo, quantidade, custo_total, movimentacao_financeira_id, orcamento_id, motivo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuario_id,
        insumo_id,
        servico_id,
        tipo,
        quantidade,
        custo_total,
        movimentacao_financeira_id,
        orcamento_id,
        motivo
      ]
    );

    const [rows] = await conn.query(
      'SELECT * FROM estoque_movimentacoes WHERE id = ? LIMIT 1',
      [res.insertId]
    );
    return rows[0];
  },

  /**
   * Consulta o histórico de movimentações de estoque com dados enriquecidos de insumos e serviços.
   * @param {number} usuario_id ID do MEI autenticado
   * @param {Object} [filtros={}] Filtros opcionais
   * @param {string} [filtros.tipo] Filtrar por tipo de movimentação
   * @param {number} [filtros.insumo_id] Filtrar por insumo específico
   * @param {number} [filtros.servico_id] Filtrar por serviço/produto específico
   * @param {number} [filtros.limite=50] Limite de registros (1 a 100)
   * @param {Object} [connection] Pool ou conexão com transação ativa
   * @returns {Promise<Array>} Lista de movimentações ordenadas da mais recente para a mais antiga
   */
  async listarMovimentacoes(
    usuario_id,
    { tipo, insumo_id, servico_id, limite = 50 } = {},
    connection = pool
  ) {
    const conn = connection || pool;
    let sql = `
      SELECT em.*, 
             i.nome AS nome_insumo, i.unidade_base,
             s.nome AS nome_servico
      FROM estoque_movimentacoes em
      LEFT JOIN insumos i ON em.insumo_id = i.id
      LEFT JOIN servicos s ON em.servico_id = s.id
      WHERE em.usuario_id = ?
    `;
    const params = [usuario_id];

    if (tipo) {
      sql += ' AND em.tipo = ?';
      params.push(tipo);
    }
    if (insumo_id) {
      sql += ' AND em.insumo_id = ?';
      params.push(insumo_id);
    }
    if (servico_id) {
      sql += ' AND em.servico_id = ?';
      params.push(servico_id);
    }

    sql += ' ORDER BY em.data_movimentacao DESC, em.id DESC LIMIT ?';
    params.push(Math.min(Math.max(1, Number(limite) || 50), 100));

    const [rows] = await conn.query(sql, params);
    return rows;
  }
};

module.exports = estoqueMovimentacaoRepository;
