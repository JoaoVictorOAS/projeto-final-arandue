const pool = require('../config/database');
const cobrancaRepository = require('../repositories/cobrancaRepository');
const financeiroService = require('./financeiroService');

/**
 * Serviço responsável pela gestão de Cobranças no fluxo integrado do MEI.
 * Garante que cobranças sejam emitidas estritamente a partir de atendimentos concluídos,
 * travando valores ao orçamento aprovado e liquidando receitas atomicamente no Livro Caixa.
 */
const cobrancaService = {
  /**
   * Cria uma nova cobrança vinculada a um agendamento concluído.
   * @param {Object} params
   * @param {number} params.usuario_id
   * @param {number} params.agendamento_id
   * @param {string} params.vencimento
   * @param {string} [params.observacoes]
   * @returns {Promise<Object>}
   */
  async criar({ usuario_id, agendamento_id, vencimento, observacoes }) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    if (!agendamento_id) {
      const erro = new Error('Toda cobrança deve ser vinculada a um atendimento concluído.');
      erro.statusCode = 400;
      throw erro;
    }

    // Valida se o agendamento existe e pertence ao usuário
    const [agRows] = await pool.execute(
      'SELECT id, cliente_id, orcamento_id, status FROM agendamentos WHERE id = ? AND usuario_id = ?',
      [agendamento_id, usuario_id]
    );

    if (agRows.length === 0) {
      const erro = new Error('Agendamento não encontrado.');
      erro.statusCode = 404;
      throw erro;
    }

    const agendamento = agRows[0];
    if (agendamento.status !== 'CONCLUIDO') {
      const erro = new Error('Cobranças só podem ser emitidas para atendimentos concluídos.');
      erro.statusCode = 400;
      throw erro;
    }

    // Prevenção de duplicidade: não permite emitir segunda cobrança para o mesmo atendimento
    const [cobExistente] = await pool.execute(
      'SELECT id FROM cobrancas WHERE agendamento_id = ? AND usuario_id = ? AND status != ?',
      [agendamento_id, usuario_id, 'CANCELADO']
    );

    if (cobExistente.length > 0) {
      const erro = new Error('Já existe uma cobrança emitida para este atendimento.');
      erro.statusCode = 409;
      throw erro;
    }

    // Puxa o total do orçamento aprovado
    const [orcRows] = await pool.execute(
      'SELECT id, total, cliente_id FROM orcamentos WHERE id = ? AND usuario_id = ?',
      [agendamento.orcamento_id, usuario_id]
    );

    if (orcRows.length === 0) {
      const erro = new Error('Orçamento vinculado não encontrado.');
      erro.statusCode = 404;
      throw erro;
    }

    const valorFinal = Number(orcRows[0].total);

    // Validação de vencimento
    if (!vencimento) {
      const erro = new Error('A data de vencimento é obrigatória');
      erro.statusCode = 400;
      throw erro;
    }

    const vencFormatado = String(vencimento).trim().slice(0, 10);

    return await cobrancaRepository.criar({
      usuario_id,
      cliente_id: agendamento.cliente_id,
      agendamento_id: agendamento.id,
      orcamento_id: agendamento.orcamento_id,
      valor: valorFinal,
      vencimento: vencFormatado,
      status: 'PENDENTE',
      observacoes: observacoes ? String(observacoes).trim() : null
    });
  },

  /**
   * Dá baixa em uma cobrança marcando como PAGO e gerando entrada no Livro Caixa.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {Object} dados
   * @returns {Promise<Object>}
   */
  async darBaixa(id, usuario_id, dados = {}) {
    return await financeiroService.darBaixaCobranca(id, usuario_id, dados);
  },

  /**
   * Busca cobrança por ID.
   * @param {number|string} id
   * @param {number} usuario_id
   * @returns {Promise<Object>}
   */
  async obterPorId(id, usuario_id) {
    return await financeiroService.buscarCobrancaPorId(id, usuario_id);
  },

  /**
   * Alias para obterPorId.
   */
  async buscarPorId(id, usuario_id) {
    return await financeiroService.buscarCobrancaPorId(id, usuario_id);
  },

  /**
   * Lista cobranças do usuário.
   */
  async listar(usuario_id, filtros = {}) {
    return await financeiroService.listarCobrancas(usuario_id, filtros);
  },

  /**
   * Atualiza dados de cobrança.
   */
  async atualizar(id, usuario_id, dados) {
    return await financeiroService.atualizarCobranca(id, usuario_id, dados);
  },

  /**
   * Exclui cobrança.
   */
  async excluir(id, usuario_id) {
    return await financeiroService.excluirCobranca(id, usuario_id);
  }
};

module.exports = cobrancaService;
