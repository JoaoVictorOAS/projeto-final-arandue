const pool = require('../config/database');
const cobrancaRepository = require('../repositories/cobrancaRepository');
const movimentacaoRepository = require('../repositories/movimentacaoRepository');
const clienteRepository = require('../repositories/clienteRepository');
const orcamentoRepository = require('../repositories/orcamentoRepository');

const STATUS_COBRANCA_PERMITIDOS = ['PENDENTE', 'PAGO', 'CANCELADO', 'ATRASADO'];
const TIPOS_MOVIMENTACAO_PERMITIDOS = ['ENTRADA', 'SAIDA'];

/**
 * Normaliza e valida data no formato YYYY-MM-DD.
 * @param {string|Date} valor
 * @returns {string|null}
 */
function normalizarData(valor) {
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
      if (!isNaN(d.getTime())) {
        return limpo;
      }
    }
  }

  return null;
}

const financeiroService = {
  // ==========================================
  // COBRANÇAS
  // ==========================================

  /**
   * Cria uma nova cobrança com validações de regra de negócio.
   * @param {Object} dados
   * @returns {Promise<Object>}
   */
  async criarCobranca({
    usuario_id,
    cliente_id,
    orcamento_id,
    valor,
    vencimento,
    status = 'PENDENTE',
    observacoes
  }) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    if (!cliente_id || isNaN(Number(cliente_id))) {
      const erro = new Error('O cliente é obrigatório para cadastrar a cobrança');
      erro.statusCode = 400;
      throw erro;
    }

    const cliente = await clienteRepository.buscarPorId(Number(cliente_id), usuario_id);
    if (!cliente) {
      const erro = new Error('Cliente não encontrado ou não pertence a este usuário');
      erro.statusCode = 404;
      throw erro;
    }

    if (valor === undefined || valor === null || isNaN(Number(valor)) || Number(valor) <= 0) {
      const erro = new Error('O valor da cobrança deve ser um número maior que zero');
      erro.statusCode = 400;
      throw erro;
    }

    const vencimentoFormatado = normalizarData(vencimento);
    if (!vencimentoFormatado) {
      const erro = new Error('Data de vencimento inválida ou não informada');
      erro.statusCode = 400;
      throw erro;
    }

    let orcamentoIdValido = null;
    if (orcamento_id !== undefined && orcamento_id !== null && orcamento_id !== '') {
      const orcamento = await orcamentoRepository.buscarPorId(Number(orcamento_id), usuario_id);
      if (!orcamento) {
        const erro = new Error('Orçamento não encontrado ou não pertence a este usuário');
        erro.statusCode = 404;
        throw erro;
      }
      orcamentoIdValido = orcamento.id;
    }

    const statusFinal = status ? status.trim().toUpperCase() : 'PENDENTE';
    if (!STATUS_COBRANCA_PERMITIDOS.includes(statusFinal)) {
      const erro = new Error(`Status de cobrança inválido. Permitidos: ${STATUS_COBRANCA_PERMITIDOS.join(', ')}`);
      erro.statusCode = 400;
      throw erro;
    }

    return await cobrancaRepository.criar({
      usuario_id,
      cliente_id: cliente.id,
      orcamento_id: orcamentoIdValido,
      valor: Number(valor),
      vencimento: vencimentoFormatado,
      status: statusFinal,
      observacoes: observacoes && typeof observacoes === 'string' ? observacoes.trim() : null
    });
  },

  /**
   * Lista cobranças do usuário autenticado.
   * @param {number} usuario_id
   * @param {Object} [filtros={}]
   * @returns {Promise<Array>}
   */
  async listarCobrancas(usuario_id, filtros = {}) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    return await cobrancaRepository.listar(usuario_id, filtros);
  },

  /**
   * Busca cobrança por ID validando isolamento por usuário.
   * @param {number|string} id
   * @param {number} usuario_id
   * @returns {Promise<Object>}
   */
  async buscarCobrancaPorId(id, usuario_id) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    const cobranca = await cobrancaRepository.buscarPorId(id, usuario_id);
    if (!cobranca) {
      const erro = new Error('Cobrança não encontrada ou não pertence a este usuário');
      erro.statusCode = 404;
      throw erro;
    }

    return cobranca;
  },

  /**
   * Atualiza dados de uma cobrança existente.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {Object} dados
   * @returns {Promise<Object>}
   */
  async atualizarCobranca(id, usuario_id, dados) {
    await this.buscarCobrancaPorId(id, usuario_id);

    const dadosAtualizar = {};

    if (dados.cliente_id !== undefined) {
      const cliente = await clienteRepository.buscarPorId(Number(dados.cliente_id), usuario_id);
      if (!cliente) {
        const erro = new Error('Cliente não encontrado ou não pertence a este usuário');
        erro.statusCode = 404;
        throw erro;
      }
      dadosAtualizar.cliente_id = cliente.id;
    }

    if (dados.orcamento_id !== undefined) {
      if (dados.orcamento_id !== null && dados.orcamento_id !== '') {
        const orcamento = await orcamentoRepository.buscarPorId(Number(dados.orcamento_id), usuario_id);
        if (!orcamento) {
          const erro = new Error('Orçamento não encontrado ou não pertence a este usuário');
          erro.statusCode = 404;
          throw erro;
        }
        dadosAtualizar.orcamento_id = orcamento.id;
      } else {
        dadosAtualizar.orcamento_id = null;
      }
    }

    if (dados.valor !== undefined) {
      if (isNaN(Number(dados.valor)) || Number(dados.valor) <= 0) {
        const erro = new Error('O valor da cobrança deve ser maior que zero');
        erro.statusCode = 400;
        throw erro;
      }
      dadosAtualizar.valor = Number(dados.valor);
    }

    if (dados.vencimento !== undefined) {
      const vencFormatado = normalizarData(dados.vencimento);
      if (!vencFormatado) {
        const erro = new Error('Data de vencimento inválida');
        erro.statusCode = 400;
        throw erro;
      }
      dadosAtualizar.vencimento = vencFormatado;
    }

    if (dados.status !== undefined) {
      const st = dados.status.trim().toUpperCase();
      if (!STATUS_COBRANCA_PERMITIDOS.includes(st)) {
        const erro = new Error(`Status de cobrança inválido. Permitidos: ${STATUS_COBRANCA_PERMITIDOS.join(', ')}`);
        erro.statusCode = 400;
        throw erro;
      }
      dadosAtualizar.status = st;
    }

    if (dados.data_pagamento !== undefined) {
      if (dados.data_pagamento) {
        const dp = normalizarData(dados.data_pagamento);
        if (!dp) {
          const erro = new Error('Data de pagamento inválida');
          erro.statusCode = 400;
          throw erro;
        }
        dadosAtualizar.data_pagamento = dp;
      } else {
        dadosAtualizar.data_pagamento = null;
      }
    }

    if (dados.observacoes !== undefined) {
      dadosAtualizar.observacoes = dados.observacoes && typeof dados.observacoes === 'string'
        ? dados.observacoes.trim()
        : null;
    }

    return await cobrancaRepository.atualizar(id, usuario_id, dadosAtualizar);
  },

  /**
   * Dá baixa em uma cobrança, marcando como PAGO e opcionalmente registrando
   * movimentação de ENTRADA no Livro Caixa atomicamente.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {Object} [param]
   * @param {string} [param.data_pagamento]
   * @param {boolean} [param.gerar_movimentacao_caixa=true]
   * @returns {Promise<Object>}
   */
  async darBaixaCobranca(id, usuario_id, { data_pagamento, gerar_movimentacao_caixa = true } = {}) {
    const cobranca = await this.buscarCobrancaPorId(id, usuario_id);

    let dataPag = data_pagamento;
    if (dataPag) {
      dataPag = normalizarData(dataPag);
      if (!dataPag) {
        const erro = new Error('Data de pagamento inválida');
        erro.statusCode = 400;
        throw erro;
      }
    } else {
      dataPag = new Date().toISOString().split('T')[0];
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await cobrancaRepository.atualizarStatus(
        id,
        usuario_id,
        {
          status: 'PAGO',
          data_pagamento: dataPag
        },
        connection
      );

      let movimentacaoCriada = null;
      if (gerar_movimentacao_caixa) {
        const clienteNome = cobranca.cliente_nome || 'Cliente';
        movimentacaoCriada = await movimentacaoRepository.criar(
          {
            usuario_id,
            cobranca_id: Number(id),
            tipo: 'ENTRADA',
            categoria: 'Recebimento de Cobrança',
            valor: Number(cobranca.valor),
            data_movimentacao: dataPag,
            descricao: `Recebimento referente à Cobrança #${id} (${clienteNome})`
          },
          connection
        );
      }

      await connection.commit();

      const cobrancaAtualizada = await cobrancaRepository.buscarPorId(id, usuario_id);
      return {
        ...cobrancaAtualizada,
        movimentacao_caixa: movimentacaoCriada
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Exclui uma cobrança pertencente ao usuário.
   * @param {number|string} id
   * @param {number} usuario_id
   * @returns {Promise<boolean>}
   */
  async excluirCobranca(id, usuario_id) {
    await this.buscarCobrancaPorId(id, usuario_id);
    return await cobrancaRepository.excluir(id, usuario_id);
  },

  // ==========================================
  // LIVRO CAIXA / MOVIMENTAÇÕES
  // ==========================================

  /**
   * Registra manualmente ou via sistema uma movimentação no Livro Caixa.
   * @param {Object} dados
   * @returns {Promise<Object>}
   */
  async registrarMovimentacao({
    usuario_id,
    cobranca_id = null,
    tipo,
    categoria = 'Geral',
    valor,
    data_movimentacao,
    descricao
  }) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    const tipoFinal = tipo ? tipo.toString().trim().toUpperCase() : '';
    if (!TIPOS_MOVIMENTACAO_PERMITIDOS.includes(tipoFinal)) {
      const erro = new Error(`Tipo de movimentação inválido. Permitidos: ${TIPOS_MOVIMENTACAO_PERMITIDOS.join(', ')}`);
      erro.statusCode = 400;
      throw erro;
    }

    if (valor === undefined || valor === null || isNaN(Number(valor)) || Number(valor) <= 0) {
      const erro = new Error('O valor da movimentação deve ser maior que zero');
      erro.statusCode = 400;
      throw erro;
    }

    if (!descricao || typeof descricao !== 'string' || !descricao.trim()) {
      const erro = new Error('Descrição da movimentação é obrigatória');
      erro.statusCode = 400;
      throw erro;
    }

    let dataFinal = data_movimentacao ? normalizarData(data_movimentacao) : new Date().toISOString().split('T')[0];
    if (!dataFinal) {
      const erro = new Error('Data da movimentação inválida');
      erro.statusCode = 400;
      throw erro;
    }

    let cobrancaIdValido = null;
    if (cobranca_id !== undefined && cobranca_id !== null && cobranca_id !== '') {
      const cobranca = await cobrancaRepository.buscarPorId(Number(cobranca_id), usuario_id);
      if (!cobranca) {
        const erro = new Error('Cobrança não encontrada ou não pertence a este usuário');
        erro.statusCode = 404;
        throw erro;
      }
      cobrancaIdValido = cobranca.id;
    }

    const categoriaFinal = categoria && typeof categoria === 'string' && categoria.trim()
      ? categoria.trim()
      : 'Geral';

    return await movimentacaoRepository.criar({
      usuario_id,
      cobranca_id: cobrancaIdValido,
      tipo: tipoFinal,
      categoria: categoriaFinal,
      valor: Number(valor),
      data_movimentacao: dataFinal,
      descricao: descricao.trim()
    });
  },

  /**
   * Lista movimentações com filtros.
   * @param {number} usuario_id
   * @param {Object} [filtros={}]
   * @returns {Promise<Array>}
   */
  async listarMovimentacoes(usuario_id, filtros = {}) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    if (filtros.tipo) {
      const tipoUpper = filtros.tipo.trim().toUpperCase();
      if (!TIPOS_MOVIMENTACAO_PERMITIDOS.includes(tipoUpper)) {
        const erro = new Error(`Filtro de tipo inválido. Permitidos: ${TIPOS_MOVIMENTACAO_PERMITIDOS.join(', ')}`);
        erro.statusCode = 400;
        throw erro;
      }
    }

    return await movimentacaoRepository.listar(usuario_id, filtros);
  },

  /**
   * Busca movimentação por ID validando isolamento por usuário.
   * @param {number|string} id
   * @param {number} usuario_id
   * @returns {Promise<Object>}
   */
  async buscarMovimentacaoPorId(id, usuario_id) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    const movimentacao = await movimentacaoRepository.buscarPorId(id, usuario_id);
    if (!movimentacao) {
      const erro = new Error('Movimentação não encontrada ou não pertence a este usuário');
      erro.statusCode = 404;
      throw erro;
    }

    return movimentacao;
  },

  /**
   * Exclui movimentação do Livro Caixa.
   * @param {number|string} id
   * @param {number} usuario_id
   * @returns {Promise<boolean>}
   */
  async excluirMovimentacao(id, usuario_id) {
    await this.buscarMovimentacaoPorId(id, usuario_id);
    return await movimentacaoRepository.excluir(id, usuario_id);
  },

  /**
   * Obtém totais consolidados do Livro Caixa.
   * @param {number} usuario_id
   * @param {number|string|null} [ano]
   * @param {number|string|null} [mes]
   * @returns {Promise<Object>}
   */
  async obterResumoCaixa(usuario_id, ano = null, mes = null) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    return await movimentacaoRepository.obterTotais(usuario_id, ano, mes);
  },

  /**
   * Obtém extrato completo com lista e totais.
   * @param {number} usuario_id
   * @param {Object} [filtros={}]
   * @returns {Promise<Object>}
   */
  async obterExtrato(usuario_id, filtros = {}) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    const { ano, mes, tipo, categoria, data_inicio, data_fim } = filtros;
    const totais = await movimentacaoRepository.obterTotais(usuario_id, ano, mes);
    const movimentacoes = await movimentacaoRepository.listar(usuario_id, {
      tipo,
      categoria,
      data_inicio,
      data_fim
    });

    return {
      totais,
      movimentacoes
    };
  }
};

module.exports = financeiroService;
