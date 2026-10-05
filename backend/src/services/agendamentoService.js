const pool = require('../config/database');
const agendamentoRepository = require('../repositories/agendamentoRepository');
const orcamentoRepository = require('../repositories/orcamentoRepository');
const clienteRepository = require('../repositories/clienteRepository');
const servicoRepository = require('../repositories/servicoRepository');

const STATUS_PERMITIDOS = ['PENDENTE', 'CONFIRMADO', 'CONCLUIDO', 'CANCELADO'];

/**
 * Normaliza e valida data e hora no formato YYYY-MM-DD HH:mm:ss.
 * @param {string|Date} valor
 * @returns {string|null}
 */
function normalizarDataHora(valor) {
  if (!valor) return null;

  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null;
    return valor.toISOString().slice(0, 19).replace('T', ' ');
  }

  if (typeof valor === 'string') {
    const limpo = valor.trim().replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '');
    const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;
    if (regex.test(limpo)) {
      return limpo.length === 16 ? `${limpo}:00` : limpo;
    }

    const d = new Date(valor);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 19).replace('T', ' ');
    }
  }

  return null;
}

const agendamentoService = {
  /**
   * Cria um novo agendamento com validação de multi-tenant e anti-choque de horários.
   * Exige vínculo obrigatório com um orçamento aprovado (fluxo integrado).
   * @param {Object} dados
   * @returns {Promise<Object>}
   */
  async criar({
    usuario_id,
    cliente_id,
    orcamento_id,
    servico_id,
    data_hora,
    status = 'PENDENTE',
    observacoes
  }) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    // Regra Estrita: Todo agendamento deve ser vinculado a um orçamento aprovado
    if (!orcamento_id) {
      const erro = new Error('Todo agendamento deve ser vinculado a um orçamento aprovado.');
      erro.statusCode = 400;
      throw erro;
    }

    // Valida se o orçamento existe e pertence ao usuário (multi-tenant)
    const orcamento = await orcamentoRepository.buscarPorId(Number(orcamento_id), usuario_id);
    if (!orcamento) {
      const erro = new Error('Orçamento não encontrado.');
      erro.statusCode = 404;
      throw erro;
    }

    // Valida se status é APROVADO
    if (orcamento.status !== 'APROVADO') {
      const erro = new Error('Apenas orçamentos com status APROVADO podem ser agendados.');
      erro.statusCode = 400;
      throw erro;
    }

    // Prevenção de duplicidade: não permite múltiplos agendamentos ativos para o mesmo orçamento
    const [agExistente] = await pool.execute(
      'SELECT id FROM agendamentos WHERE orcamento_id = ? AND usuario_id = ? AND status != ?',
      [Number(orcamento_id), usuario_id, 'CANCELADO']
    );
    if (agExistente.length > 0) {
      const erro = new Error('Já existe um agendamento ativo para este orçamento.');
      erro.statusCode = 409;
      throw erro;
    }

    // Herança automática do cliente do orçamento se não fornecido
    const clienteIdFinal = cliente_id ? Number(cliente_id) : orcamento.cliente_id;
    if (!clienteIdFinal || isNaN(Number(clienteIdFinal))) {
      const erro = new Error('O cliente é obrigatório para agendamento');
      erro.statusCode = 400;
      throw erro;
    }

    // Valida se cliente pertence ao usuário
    const cliente = await clienteRepository.buscarPorId(Number(clienteIdFinal), usuario_id);
    if (!cliente) {
      const erro = new Error('Cliente não encontrado ou não pertence a este usuário');
      erro.statusCode = 404;
      throw erro;
    }

    // Herança automática do primeiro serviço do orçamento se não fornecido
    let servicoIdFinal = servico_id;
    if (!servicoIdFinal && orcamento.itens && orcamento.itens.length > 0) {
      const itemServico = orcamento.itens.find(i => i.servico_id);
      if (itemServico) {
        servicoIdFinal = itemServico.servico_id;
      }
    }

    // Se fornecido serviço, valida se pertence ao usuário
    let servicoIdValido = null;
    if (servicoIdFinal !== undefined && servicoIdFinal !== null && servicoIdFinal !== '') {
      const servico = await servicoRepository.buscarPorId(Number(servicoIdFinal), usuario_id);
      if (!servico) {
        const erro = new Error('Serviço não encontrado ou não pertence a este usuário');
        erro.statusCode = 404;
        throw erro;
      }
      servicoIdValido = servico.id;
    }

    // Validação de formato da data e hora
    const dataHoraFormatada = normalizarDataHora(data_hora);
    if (!dataHoraFormatada) {
      const erro = new Error('Data e hora do agendamento inválidas ou não informadas');
      erro.statusCode = 400;
      throw erro;
    }

    // Prevenção de conflito de horários (mesmo MEI)
    const conflito = await agendamentoRepository.buscarConflito(usuario_id, dataHoraFormatada);
    if (conflito) {
      const erro = new Error('Conflito de horário: já existe um atendimento agendado para este momento');
      erro.statusCode = 409;
      throw erro;
    }

    // Validação de status
    const statusLimpo = status ? status.trim().toUpperCase() : 'PENDENTE';
    if (!STATUS_PERMITIDOS.includes(statusLimpo)) {
      const erro = new Error(`Status inválido. Permitidos: ${STATUS_PERMITIDOS.join(', ')}`);
      erro.statusCode = 400;
      throw erro;
    }

    return await agendamentoRepository.criar({
      usuario_id,
      cliente_id: clienteIdFinal,
      orcamento_id: Number(orcamento_id),
      servico_id: servicoIdValido,
      data_hora: dataHoraFormatada,
      status: statusLimpo,
      observacoes: observacoes && typeof observacoes === 'string' && observacoes.trim() ? observacoes.trim() : null
    });
  },

  /**
   * Lista agendamentos do usuário.
   * @param {number} usuario_id
   * @param {Object} filtros
   * @returns {Promise<Array>}
   */
  async listar(usuario_id, filtros = {}) {
    return await agendamentoRepository.listar(usuario_id, filtros);
  },

  /**
   * Busca um agendamento por ID.
   * @param {number|string} id
   * @param {number} usuario_id
   * @returns {Promise<Object>}
   */
  async buscarPorId(id, usuario_id) {
    const agendamento = await agendamentoRepository.buscarPorId(id, usuario_id);
    if (!agendamento) {
      const erro = new Error('Agendamento não encontrado');
      erro.statusCode = 404;
      throw erro;
    }
    return agendamento;
  },

  /**
   * Atualiza os dados de um agendamento.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {Object} dados
   * @returns {Promise<Object>}
   */
  async atualizar(id, usuario_id, dados) {
    const agendamentoAtual = await agendamentoRepository.buscarPorId(id, usuario_id);
    if (!agendamentoAtual) {
      const erro = new Error('Agendamento não encontrado');
      erro.statusCode = 404;
      throw erro;
    }

    const dadosAtualizar = {};

    if (dados.cliente_id !== undefined) {
      const cliente = await clienteRepository.buscarPorId(Number(dados.cliente_id), usuario_id);
      if (!cliente) {
        const erro = new Error('Cliente não encontrado ou não pertence a este usuário');
        erro.statusCode = 404;
        throw erro;
      }
      dadosAtualizar.cliente_id = Number(dados.cliente_id);
    }

    if (dados.servico_id !== undefined) {
      if (dados.servico_id === null || dados.servico_id === '') {
        dadosAtualizar.servico_id = null;
      } else {
        const servico = await servicoRepository.buscarPorId(Number(dados.servico_id), usuario_id);
        if (!servico) {
          const erro = new Error('Serviço não encontrado ou não pertence a este usuário');
          erro.statusCode = 404;
          throw erro;
        }
        dadosAtualizar.servico_id = servico.id;
      }
    }

    if (dados.data_hora !== undefined) {
      const novaDataHora = normalizarDataHora(dados.data_hora);
      if (!novaDataHora) {
        const erro = new Error('Data e hora do agendamento inválidas');
        erro.statusCode = 400;
        throw erro;
      }

      // Verifica se houve alteração de horário e checa conflito ignorando o próprio agendamento
      const conflito = await agendamentoRepository.buscarConflito(usuario_id, novaDataHora, id);
      if (conflito) {
        const erro = new Error('Conflito de horário: já existe um atendimento agendado para este momento');
        erro.statusCode = 409;
        throw erro;
      }

      dadosAtualizar.data_hora = novaDataHora;
    }

    if (dados.status !== undefined) {
      const statusLimpo = dados.status.trim().toUpperCase();
      if (!STATUS_PERMITIDOS.includes(statusLimpo)) {
        const erro = new Error(`Status inválido. Permitidos: ${STATUS_PERMITIDOS.join(', ')}`);
        erro.statusCode = 400;
        throw erro;
      }
      dadosAtualizar.status = statusLimpo;
    }

    if (dados.observacoes !== undefined) {
      dadosAtualizar.observacoes = dados.observacoes && typeof dados.observacoes === 'string' && dados.observacoes.trim()
        ? dados.observacoes.trim()
        : null;
    }

    return await agendamentoRepository.atualizar(id, usuario_id, dadosAtualizar);
  },

  /**
   * Atualiza o status do agendamento.
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

    const agendamento = await agendamentoRepository.buscarPorId(id, usuario_id);
    if (!agendamento) {
      const erro = new Error('Agendamento não encontrado');
      erro.statusCode = 404;
      throw erro;
    }

    return await agendamentoRepository.atualizarStatus(id, usuario_id, statusLimpo);
  },

  /**
   * Exclui um agendamento do usuário.
   * @param {number|string} id
   * @param {number} usuario_id
   * @returns {Promise<boolean>}
   */
  async excluir(id, usuario_id) {
    const agendamento = await agendamentoRepository.buscarPorId(id, usuario_id);
    if (!agendamento) {
      const erro = new Error('Agendamento não encontrado');
      erro.statusCode = 404;
      throw erro;
    }

    return await agendamentoRepository.excluir(id, usuario_id);
  }
};

module.exports = agendamentoService;
