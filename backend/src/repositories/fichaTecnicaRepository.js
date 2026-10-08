const pool = require('../config/database');

/**
 * Repositório para operações de Ficha Técnica (composição de receitas/serviços)
 * no banco de dados com isolamento multi-tenant por usuario_id.
 */
const fichaTecnicaRepository = {
  /**
   * Substitui atomicamente todos os itens da ficha técnica de um serviço.
   * @param {number} usuario_id
   * @param {number} servico_id
   * @param {Array<{insumo_id: number, quantidade_necessaria: number}>} ingredientes
   * @param {Object} [connection] Pool ou conexão de transação
   * @returns {Promise<Array>} Lista atualizada de ingredientes da ficha
   */
  async substituirFicha(usuario_id, servico_id, ingredientes, connection = pool) {
    const conn = connection || pool;
    await conn.query(
      'DELETE FROM fichas_tecnicas WHERE usuario_id = ? AND servico_id = ?',
      [usuario_id, servico_id]
    );

    if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
      return [];
    }

    const values = ingredientes.map(item => [
      usuario_id,
      servico_id,
      item.insumo_id,
      item.quantidade_necessaria
    ]);

    await conn.query(
      `INSERT INTO fichas_tecnicas (usuario_id, servico_id, insumo_id, quantidade_necessaria) 
       VALUES ?`,
      [values]
    );

    return await this.obterFichaPorServico(usuario_id, servico_id, conn);
  },

  /**
   * Obtém a ficha técnica completa de um serviço específico.
   * @param {number} usuario_id
   * @param {number} servico_id
   * @param {Object} [connection]
   * @returns {Promise<Array>}
   */
  async obterFichaPorServico(usuario_id, servico_id, connection = pool) {
    const conn = connection || pool;
    const [rows] = await conn.query(
      `SELECT ft.id, ft.servico_id, ft.insumo_id, ft.quantidade_necessaria,
              i.nome AS nome_insumo, i.unidade_base, i.custo_unitario, i.quantidade_atual AS saldo_insumo
       FROM fichas_tecnicas ft
       JOIN insumos i ON ft.insumo_id = i.id
       WHERE ft.usuario_id = ? AND ft.servico_id = ?
       ORDER BY i.nome ASC`,
      [usuario_id, servico_id]
    );
    return rows;
  },

  /**
   * Obtém as fichas técnicas de múltiplos serviços em lote.
   * @param {number} usuario_id
   * @param {Array<number>} servicoIds
   * @param {Object} [connection]
   * @returns {Promise<Array>}
   */
  async obterInsumosPorServicos(usuario_id, servicoIds, connection = pool) {
    if (!servicoIds || servicoIds.length === 0) return [];
    const conn = connection || pool;
    const [rows] = await conn.query(
      `SELECT ft.servico_id, ft.insumo_id, ft.quantidade_necessaria,
              i.nome AS nome_insumo, i.unidade_base, i.custo_unitario, i.quantidade_atual AS saldo_insumo
       FROM fichas_tecnicas ft
       JOIN insumos i ON ft.insumo_id = i.id
       WHERE ft.usuario_id = ? AND ft.servico_id IN (?)`,
      [usuario_id, servicoIds]
    );
    return rows;
  }
};

module.exports = fichaTecnicaRepository;
