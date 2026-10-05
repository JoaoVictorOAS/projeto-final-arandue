const pool = require('../config/database');
const orcamentoRepository = require('../repositories/orcamentoRepository');
const clienteRepository = require('../repositories/clienteRepository');
const servicoRepository = require('../repositories/servicoRepository');

const STATUS_PERMITIDOS = ['RASCUNHO', 'ENVIADO', 'APROVADO', 'RECUSADO', 'CANCELADO'];

/**
 * Normaliza e valida data no formato YYYY-MM-DD.
 * @param {string|Date} valor
 * @returns {string|null}
 */
function formatarData(valor) {
  if (!valor) return null;
  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null;
    return valor.toISOString().slice(0, 10);
  }
  if (typeof valor === 'string') {
    const limpo = valor.trim().slice(0, 10);
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (regex.test(limpo)) {
      const d = new Date(limpo);
      if (!isNaN(d.getTime())) return limpo;
    }
  }
  return null;
}

/**
 * Carrega a árvore de rastreabilidade do fluxo integrado:
 * Orçamento -> Agendamento -> Cobrança -> Caixa
 * @param {number} orcamentoId
 * @param {number} usuarioId
 * @returns {Promise<Object>}
 */
async function carregarFluxo(orcamentoId, usuarioId) {
  // Busca agendamento vinculado
  const [agRows] = await pool.execute(
    `SELECT id, data_hora, status, observacoes 
     FROM agendamentos 
     WHERE orcamento_id = ? AND usuario_id = ? 
     ORDER BY id DESC LIMIT 1`,
    [orcamentoId, usuarioId]
  );
  const agendamento = agRows[0] || null;

  let cobranca = null;
  let caixa = null;

  const paramsCob = [orcamentoId];
  let sqlCob = `SELECT id, agendamento_id, orcamento_id, valor, DATE_FORMAT(vencimento, '%Y-%m-%d') AS vencimento, status, DATE_FORMAT(data_pagamento, '%Y-%m-%d') AS data_pagamento FROM cobrancas WHERE (orcamento_id = ?`;
  if (agendamento) {
    sqlCob += ' OR agendamento_id = ?';
    paramsCob.push(agendamento.id);
  }
  sqlCob += ') AND usuario_id = ? ORDER BY id DESC LIMIT 1';
  paramsCob.push(usuarioId);

  const [cobRows] = await pool.execute(sqlCob, paramsCob);
  cobranca = cobRows[0] || null;

  if (cobranca) {
    const [caixaRows] = await pool.execute(
      `SELECT id, cobranca_id, tipo, valor, DATE_FORMAT(data_movimentacao, '%Y-%m-%d') AS data_movimentacao, descricao 
       FROM movimentacoes 
       WHERE cobranca_id = ? AND usuario_id = ? 
       LIMIT 1`,
      [cobranca.id, usuarioId]
    );
    if (caixaRows.length > 0) {
      caixa = {
        movimentacao_id: caixaRows[0].id,
        id: caixaRows[0].id,
        cobranca_id: caixaRows[0].cobranca_id,
        tipo: caixaRows[0].tipo,
        valor: Number(caixaRows[0].valor),
        data_movimentacao: caixaRows[0].data_movimentacao,
        descricao: caixaRows[0].descricao
      };
    }
  }

  return {
    agendamento: agendamento ? {
      id: agendamento.id,
      status: agendamento.status,
      data_hora: agendamento.data_hora,
      observacoes: agendamento.observacoes
    } : null,
    cobranca: cobranca ? {
      id: cobranca.id,
      agendamento_id: cobranca.agendamento_id,
      orcamento_id: cobranca.orcamento_id,
      valor: Number(cobranca.valor),
      status: cobranca.status,
      vencimento: cobranca.vencimento,
      data_pagamento: cobranca.data_pagamento
    } : null,
    caixa
  };
}

const orcamentoService = {
  /**
   * Cria um orçamento com cálculo obrigatório e validações rigorosas no backend.
   * @param {Object} dados
   * @returns {Promise<Object>}
   */
  async criar({
    usuario_id,
    cliente_id,
    data_emissao,
    validade,
    status = 'RASCUNHO',
    desconto = 0,
    observacoes,
    itens
  }) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    if (!cliente_id || isNaN(Number(cliente_id))) {
      const erro = new Error('O cliente é obrigatório para emissão do orçamento');
      erro.statusCode = 400;
      throw erro;
    }

    // Valida se o cliente existe e pertence ao usuário (multi-tenant)
    const cliente = await clienteRepository.buscarPorId(Number(cliente_id), usuario_id);
    if (!cliente) {
      const erro = new Error('Cliente não encontrado ou não pertence a este usuário');
      erro.statusCode = 404;
      throw erro;
    }

    // Valida lista de itens
    if (!Array.isArray(itens) || itens.length === 0) {
      const erro = new Error('O orçamento deve conter pelo menos um item');
      erro.statusCode = 400;
      throw erro;
    }

    // Processamento e cálculo de cada item
    const itensProcessados = [];
    let subtotalCalculado = 0;

    for (let i = 0; i < itens.length; i++) {
      const item = itens[i];
      if (!item || typeof item !== 'object') {
        const erro = new Error(`Item na posição ${i + 1} é inválido`);
        erro.statusCode = 400;
        throw erro;
      }

      const quantidade = Number(item.quantidade);
      if (isNaN(quantidade) || quantidade < 1) {
        const erro = new Error(`A quantidade do item ${i + 1} deve ser maior ou igual a 1`);
        erro.statusCode = 400;
        throw erro;
      }

      let precoUnitario = item.preco_unitario !== undefined && item.preco_unitario !== null
        ? Number(item.preco_unitario)
        : null;

      // Se não enviou preço mas enviou servico_id, tenta buscar do catálogo do usuário
      if (precoUnitario === null && item.servico_id) {
        const servico = await servicoRepository.buscarPorId(item.servico_id, usuario_id);
        if (servico) {
          precoUnitario = Number(servico.preco);
        }
      }

      if (precoUnitario === null || isNaN(precoUnitario) || precoUnitario < 0) {
        const erro = new Error(`O preço unitário do item ${i + 1} deve ser maior ou igual a zero`);
        erro.statusCode = 400;
        throw erro;
      }

      // Validação opcional de serviço pertencente ao usuário
      let servicoId = null;
      if (item.servico_id) {
        const servico = await servicoRepository.buscarPorId(item.servico_id, usuario_id);
        if (servico) {
          servicoId = servico.id;
        }
      }

      const subtotalItem = Number((quantidade * precoUnitario).toFixed(2));
      subtotalCalculado += subtotalItem;

      itensProcessados.push({
        servico_id: servicoId,
        quantidade,
        preco_unitario: Number(precoUnitario.toFixed(2)),
        subtotal: subtotalItem
      });
    }

    const subtotalFinal = Number(subtotalCalculado.toFixed(2));

    // Validação de desconto
    const descontoNumerico = desconto !== undefined && desconto !== null && desconto !== ''
      ? Number(desconto)
      : 0;

    if (isNaN(descontoNumerico) || descontoNumerico < 0) {
      const erro = new Error('O desconto não pode ser negativo');
      erro.statusCode = 400;
      throw erro;
    }

    if (descontoNumerico > subtotalFinal) {
      const erro = new Error('O desconto não pode ser superior ao subtotal do orçamento');
      erro.statusCode = 400;
      throw erro;
    }

    const descontoFinal = Number(descontoNumerico.toFixed(2));
    const totalFinal = Number((subtotalFinal - descontoFinal).toFixed(2));

    // Validação de status
    const statusLimpo = status ? status.trim().toUpperCase() : 'RASCUNHO';
    if (!STATUS_PERMITIDOS.includes(statusLimpo)) {
      const erro = new Error(`Status inválido. Permitidos: ${STATUS_PERMITIDOS.join(', ')}`);
      erro.statusCode = 400;
      throw erro;
    }

    // Datas
    const dataEmissaoFormatada = formatarData(data_emissao) || new Date().toISOString().slice(0, 10);
    const validadeFormatada = formatarData(validade);

    return await orcamentoRepository.criar({
      usuario_id,
      cliente_id: Number(cliente_id),
      data_emissao: dataEmissaoFormatada,
      validade: validadeFormatada,
      status: statusLimpo,
      subtotal: subtotalFinal,
      desconto: descontoFinal,
      total: totalFinal,
      observacoes: observacoes && typeof observacoes === 'string' && observacoes.trim() ? observacoes.trim() : null,
      itens: itensProcessados
    });
  },

  /**
   * Lista orçamentos do usuário com filtros opcionais e rastreabilidade de fluxo.
   * @param {number} usuario_id
   * @param {Object} filtros
   * @returns {Promise<Array>}
   */
  async listar(usuario_id, filtros = {}) {
    const orcamentos = await orcamentoRepository.listar(usuario_id, filtros);
    return await Promise.all(
      orcamentos.map(async (orc) => {
        const fluxo = await carregarFluxo(orc.id, usuario_id);
        return { ...orc, fluxo };
      })
    );
  },

  /**
   * Busca um orçamento específico com seus itens e rastreabilidade de fluxo.
   * @param {number|string} id
   * @param {number} usuario_id
   * @returns {Promise<Object>}
   */
  async buscarPorId(id, usuario_id) {
    const orcamento = await orcamentoRepository.buscarPorId(id, usuario_id);
    if (!orcamento) {
      const erro = new Error('Orçamento não encontrado');
      erro.statusCode = 404;
      throw erro;
    }
    const fluxo = await carregarFluxo(orcamento.id, usuario_id);
    return { ...orcamento, fluxo };
  },

  /**
   * Alias de compatibilidade para buscarPorId.
   * @param {number|string} id
   * @param {number} usuario_id
   * @returns {Promise<Object>}
   */
  async obterPorId(id, usuario_id) {
    return await this.buscarPorId(id, usuario_id);
  },

  /**
   * Atualiza o status do orçamento.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {string} status
   * @returns {Promise<Object>}
   */
  async atualizarStatus(id, usuario_id, status) {
    if (!status || typeof status !== 'string') {
      const erro = new Error('O status é obrigatório');
      erro.statusCode = 400;
      throw erro;
    }

    const statusLimpo = status.trim().toUpperCase();
    if (!STATUS_PERMITIDOS.includes(statusLimpo)) {
      const erro = new Error(`Status inválido. Permitidos: ${STATUS_PERMITIDOS.join(', ')}`);
      erro.statusCode = 400;
      throw erro;
    }

    const existente = await orcamentoRepository.buscarPorId(id, usuario_id);
    if (!existente) {
      const erro = new Error('Orçamento não encontrado');
      erro.statusCode = 404;
      throw erro;
    }

    return await orcamentoRepository.atualizarStatus(id, usuario_id, statusLimpo);
  },

  /**
   * Exclui um orçamento existente, bloqueando se houver agendamentos ou cobranças associados.
   * @param {number|string} id
   * @param {number} usuario_id
   * @returns {Promise<boolean>}
   */
  async excluir(id, usuario_id) {
    const existente = await orcamentoRepository.buscarPorId(id, usuario_id);
    if (!existente) {
      const erro = new Error('Orçamento não encontrado');
      erro.statusCode = 404;
      throw erro;
    }

    // Impede exclusão se houver agendamentos ou cobranças associados
    const [agRows] = await pool.execute(
      'SELECT id FROM agendamentos WHERE orcamento_id = ? AND usuario_id = ? LIMIT 1',
      [id, usuario_id]
    );
    const [cobRows] = await pool.execute(
      'SELECT id FROM cobrancas WHERE orcamento_id = ? AND usuario_id = ? LIMIT 1',
      [id, usuario_id]
    );

    if (agRows.length > 0 || cobRows.length > 0) {
      const erro = new Error('Não é possível excluir orçamento com agendamentos ou cobranças associados.');
      erro.statusCode = 400;
      throw erro;
    }

    return await orcamentoRepository.excluir(id, usuario_id);
  }
};

module.exports = orcamentoService;
