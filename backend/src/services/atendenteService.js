const atendenteRepository = require('../repositories/atendenteRepository');
const clienteRepository = require('../repositories/clienteRepository');
const servicoRepository = require('../repositories/servicoRepository');
const agendamentoRepository = require('../repositories/agendamentoRepository');
const orcamentoService = require('./orcamentoService');
const agendamentoService = require('./agendamentoService');

const TONS_PERMITIDOS = ['FORMAL', 'AMIGAVEL', 'DESCONTRAIDO', 'CONSULTIVO', 'DIRETO'];

function normalizarBooleano(val, fallback) {
  if (val === undefined || val === null) return Boolean(fallback);
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') {
    const v = val.trim().toLowerCase();
    if (['true', '1', 'sim', 'yes', 'ativo'].includes(v)) return true;
    if (['false', '0', 'nao', 'não', 'no', 'inativo'].includes(v)) return false;
  }
  return Boolean(val);
}

function normalizarListaAlcadasPorServico(raw) {
  let lista = raw;
  if (typeof raw === 'string') {
    try {
      lista = JSON.parse(raw);
    } catch (_) {
      lista = [];
    }
  }
  if (!Array.isArray(lista)) return [];

  const mapa = new Map();
  for (const item of lista) {
    if (!item || item.servico_id === undefined || item.servico_id === null || item.servico_id === '') {
      continue;
    }
    const sid = Number(item.servico_id);
    if (isNaN(sid) || sid <= 0) continue;

    const minV = Number(item.orcamento_min_valor ?? item.min_valor ?? 0);
    const maxV = Number(item.orcamento_max_valor ?? item.max_valor ?? 500);
    const descP = Number(item.desconto_max_percentual ?? 0);

    if (isNaN(minV) || minV < 0 || isNaN(maxV) || maxV < 0) {
      const erro = new Error(`Valores de alçada inválidos para o serviço #${sid}`);
      erro.statusCode = 400;
      throw erro;
    }
    if (minV > maxV) {
      const erro = new Error(`No serviço #${sid}, o valor mínimo (R$ ${minV}) não pode ser maior que o valor máximo (R$ ${maxV})`);
      erro.statusCode = 400;
      throw erro;
    }
    if (isNaN(descP) || descP < 0 || descP > 100) {
      const erro = new Error(`No serviço #${sid}, o desconto máximo deve estar entre 0% e 100%`);
      erro.statusCode = 400;
      throw erro;
    }

    mapa.set(sid, {
      servico_id: sid,
      nome_servico: item.nome_servico ? String(item.nome_servico).trim() : '',
      permite_fechar_orcamento: normalizarBooleano(item.permite_fechar_orcamento, true),
      orcamento_min_valor: Number(minV.toFixed(2)),
      orcamento_max_valor: Number(maxV.toFixed(2)),
      desconto_max_percentual: Number(descP.toFixed(2))
    });
  }

  return Array.from(mapa.values());
}

function calcularDiferencaDiasCalendario(dataIsoStr) {
  const hojeStr = new Date().toISOString().slice(0, 10);
  const [yH, mH, dH] = hojeStr.split('-').map(Number);
  const [yA, mA, dA] = String(dataIsoStr).slice(0, 10).split('-').map(Number);

  const utcHoje = Date.UTC(yH, mH - 1, dH);
  const utcAlvo = Date.UTC(yA, mA - 1, dA);
  return Math.round((utcAlvo - utcHoje) / 86400000);
}

const atendenteService = {
  /**
   * Obtém a configuração atual do Agente Pessoal de Atendimento do MEI.
   */
  async obterConfiguracao(usuario_id) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }
    const config = await atendenteRepository.obterOuCriarConfig(usuario_id);
    return {
      ...config,
      ativo: normalizarBooleano(config.ativo, true),
      permite_agendar: normalizarBooleano(config.permite_agendar, true),
      permite_consultar_catalogo: normalizarBooleano(config.permite_consultar_catalogo, true),
      permite_gerar_orcamento: normalizarBooleano(config.permite_gerar_orcamento, true),
      permite_fechar_orcamento: normalizarBooleano(config.permite_fechar_orcamento, false),
      permite_gerar_cobranca_pix: normalizarBooleano(config.permite_gerar_cobranca_pix, false),
      orcamento_min_valor: Number(config.orcamento_min_valor ?? 0),
      orcamento_max_valor: Number(config.orcamento_max_valor ?? 500),
      desconto_max_percentual: Number(config.desconto_max_percentual ?? 0),
      antecedencia_minima_dias: Number(config.antecedencia_minima_dias ?? 0),
      antecedencia_maxima_dias: Number(config.antecedencia_maxima_dias ?? 60),
      transbordo_automatico: normalizarBooleano(config.transbordo_automatico, true),
      condicoes_retorno_humano: config.condicoes_retorno_humano || '',
      alcadas_por_servico: normalizarListaAlcadasPorServico(config.alcadas_por_servico || [])
    };
  },

  /**
   * Atualiza parcial ou totalmente a configuração e os limites (guardrails) do Atendente do MEI.
   */
  async atualizarConfiguracao(usuario_id, payload = {}) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    const configAtual = await this.obterConfiguracao(usuario_id);
    const atualizacao = {};

    if (payload.nome_atendente !== undefined) {
      const nome = String(payload.nome_atendente || '').trim();
      if (!nome || nome.length > 100) {
        const erro = new Error('O nome do atendente deve ter entre 1 e 100 caracteres');
        erro.statusCode = 400;
        throw erro;
      }
      atualizacao.nome_atendente = nome;
    }

    if (payload.slug_publico !== undefined && payload.slug_publico !== null) {
      const slug = String(payload.slug_publico)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      if (slug.length < 3 || slug.length > 80) {
        const erro = new Error('O identificador do link público (slug) deve ter entre 3 e 80 caracteres');
        erro.statusCode = 400;
        throw erro;
      }
      atualizacao.slug_publico = slug;
    }

    if (payload.tom_voz !== undefined) {
      const tom = String(payload.tom_voz || '')
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (!TONS_PERMITIDOS.includes(tom)) {
        const erro = new Error(`Tom de voz inválido. Valores permitidos: ${TONS_PERMITIDOS.join(', ')}`);
        erro.statusCode = 400;
        throw erro;
      }
      atualizacao.tom_voz = tom;
    }

    if (payload.instrucoes_customizadas !== undefined) {
      atualizacao.instrucoes_customizadas = payload.instrucoes_customizadas
        ? String(payload.instrucoes_customizadas).trim().slice(0, 2000)
        : '';
    }

    if (payload.mensagem_boas_vindas !== undefined) {
      atualizacao.mensagem_boas_vindas = payload.mensagem_boas_vindas
        ? String(payload.mensagem_boas_vindas).trim().slice(0, 500)
        : '';
    }

    if (payload.condicoes_retorno_humano !== undefined) {
      atualizacao.condicoes_retorno_humano = payload.condicoes_retorno_humano
        ? String(payload.condicoes_retorno_humano).trim().slice(0, 2000)
        : '';
    }

    const minVal =
      payload.orcamento_min_valor !== undefined
        ? Number(payload.orcamento_min_valor)
        : Number(configAtual.orcamento_min_valor ?? 0);
    const maxVal =
      payload.orcamento_max_valor !== undefined
        ? Number(payload.orcamento_max_valor)
        : Number(configAtual.orcamento_max_valor ?? 500);

    if (isNaN(minVal) || minVal < 0) {
      const erro = new Error('O valor mínimo de orçamento não pode ser negativo');
      erro.statusCode = 400;
      throw erro;
    }
    if (isNaN(maxVal) || maxVal < 0) {
      const erro = new Error('O valor máximo de orçamento não pode ser negativo');
      erro.statusCode = 400;
      throw erro;
    }
    if (minVal > maxVal) {
      const erro = new Error('O valor mínimo de orçamento não pode ser maior que o valor máximo');
      erro.statusCode = 400;
      throw erro;
    }

    atualizacao.orcamento_min_valor = Number(minVal.toFixed(2));
    atualizacao.orcamento_max_valor = Number(maxVal.toFixed(2));

    if (payload.desconto_max_percentual !== undefined) {
      const descPct = Number(payload.desconto_max_percentual);
      if (isNaN(descPct) || descPct < 0 || descPct > 100) {
        const erro = new Error('O desconto máximo deve estar entre 0% e 100%');
        erro.statusCode = 400;
        throw erro;
      }
      atualizacao.desconto_max_percentual = Number(descPct.toFixed(2));
    }

    if (payload.alcadas_por_servico !== undefined) {
      atualizacao.alcadas_por_servico = normalizarListaAlcadasPorServico(payload.alcadas_por_servico);
    }

    const minDias =
      payload.antecedencia_minima_dias !== undefined
        ? Number(payload.antecedencia_minima_dias)
        : Number(configAtual.antecedencia_minima_dias ?? 0);
    const maxDias =
      payload.antecedencia_maxima_dias !== undefined
        ? Number(payload.antecedencia_maxima_dias)
        : Number(configAtual.antecedencia_maxima_dias ?? 60);

    if (isNaN(minDias) || minDias < 0 || minDias > 365) {
      const erro = new Error('A antecedência mínima deve estar entre 0 e 365 dias');
      erro.statusCode = 400;
      throw erro;
    }
    if (isNaN(maxDias) || maxDias < 0 || maxDias > 365) {
      const erro = new Error('A antecedência máxima deve estar entre 0 e 365 dias');
      erro.statusCode = 400;
      throw erro;
    }
    if (minDias > maxDias) {
      const erro = new Error('A antecedência mínima de agendamento não pode ser maior que a antecedência máxima');
      erro.statusCode = 400;
      throw erro;
    }

    atualizacao.antecedencia_minima_dias = Math.round(minDias);
    atualizacao.antecedencia_maxima_dias = Math.round(maxDias);

    const booleanFields = [
      'ativo',
      'permite_agendar',
      'permite_consultar_catalogo',
      'permite_gerar_orcamento',
      'permite_fechar_orcamento',
      'permite_gerar_cobranca_pix',
      'exigir_aprovacao_acima_limite',
      'transbordo_automatico'
    ];
    for (const field of booleanFields) {
      if (payload[field] !== undefined) {
        atualizacao[field] = normalizarBooleano(payload[field], configAtual[field]);
      }
    }

    if (payload.horario_inicio !== undefined) {
      atualizacao.horario_inicio = String(payload.horario_inicio).trim().slice(0, 5);
    }
    if (payload.horario_fim !== undefined) {
      atualizacao.horario_fim = String(payload.horario_fim).trim().slice(0, 5);
    }
    if (payload.dias_funcionamento !== undefined) {
      atualizacao.dias_funcionamento = String(payload.dias_funcionamento).trim();
    }

    const salvo = await atendenteRepository.atualizarConfig(usuario_id, atualizacao);
    return {
      ...salvo,
      ativo: normalizarBooleano(salvo.ativo, true),
      permite_agendar: normalizarBooleano(salvo.permite_agendar, true),
      permite_consultar_catalogo: normalizarBooleano(salvo.permite_consultar_catalogo, true),
      permite_gerar_orcamento: normalizarBooleano(salvo.permite_gerar_orcamento, true),
      permite_fechar_orcamento: normalizarBooleano(salvo.permite_fechar_orcamento, false),
      permite_gerar_cobranca_pix: normalizarBooleano(salvo.permite_gerar_cobranca_pix, false),
      orcamento_min_valor: Number(salvo.orcamento_min_valor ?? 0),
      orcamento_max_valor: Number(salvo.orcamento_max_valor ?? 500),
      desconto_max_percentual: Number(salvo.desconto_max_percentual ?? 0),
      antecedencia_minima_dias: Number(salvo.antecedencia_minima_dias ?? 0),
      antecedencia_maxima_dias: Number(salvo.antecedencia_maxima_dias ?? 60),
      transbordo_automatico: normalizarBooleano(salvo.transbordo_automatico, true),
      condicoes_retorno_humano: salvo.condicoes_retorno_humano || '',
      alcadas_por_servico: normalizarListaAlcadasPorServico(salvo.alcadas_por_servico || [])
    };
  },

  /**
   * Adiciona, atualiza ou remove a Alçada de Fechamento Automático (Guardrail Determinístico)
   * para um serviço específico do catálogo do MEI.
   */
  async configurarAlcadaServico(usuario_id, servico_id, dadosRegra = {}) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }
    const sid = Number(servico_id);
    if (isNaN(sid) || sid <= 0) {
      const erro = new Error('O identificador do serviço (servico_id) é inválido');
      erro.statusCode = 400;
      throw erro;
    }

    const configAtual = await this.obterConfiguracao(usuario_id);
    const listaAtual = Array.isArray(configAtual.alcadas_por_servico)
      ? [...configAtual.alcadas_por_servico]
      : [];

    if (dadosRegra && dadosRegra.remover === true) {
      const filtrada = listaAtual.filter((item) => Number(item.servico_id) !== sid);
      return await this.atualizarConfiguracao(usuario_id, { alcadas_por_servico: filtrada });
    }

    const novaRegra = {
      servico_id: sid,
      nome_servico: dadosRegra.nome_servico || '',
      permite_fechar_orcamento:
        dadosRegra.permite_fechar_orcamento !== undefined
          ? normalizarBooleano(dadosRegra.permite_fechar_orcamento, true)
          : true,
      orcamento_min_valor: Number(dadosRegra.orcamento_min_valor ?? 0),
      orcamento_max_valor: Number(dadosRegra.orcamento_max_valor ?? 500),
      desconto_max_percentual: Number(dadosRegra.desconto_max_percentual ?? 0)
    };

    const semAntiga = listaAtual.filter((item) => Number(item.servico_id) !== sid);
    semAntiga.push(novaRegra);

    return await this.atualizarConfiguracao(usuario_id, { alcadas_por_servico: semAntiga });
  },

  /**
   * Lista o catálogo público de serviços/produtos ativos do MEI para o Atendente,
   * enriquecendo cada serviço com sua alçada determinística de fechamento automático.
   */
  async consultarCatalogoCliente(usuario_id, { busca, categoria } = {}) {
    const config = await this.obterConfiguracao(usuario_id);
    if (!config.ativo) {
      const erro = new Error('O atendente virtual deste estabelecimento está temporariamente desativado.');
      erro.statusCode = 403;
      throw erro;
    }
    if (!config.permite_consultar_catalogo) {
      const erro = new Error('A consulta automática de catálogo não está habilitada para este atendente.');
      erro.statusCode = 403;
      throw erro;
    }

    const mapaAlcadas = new Map(
      (config.alcadas_por_servico || []).map((a) => [Number(a.servico_id), a])
    );

    const servicos = await servicoRepository.listar(usuario_id, { busca, categoria });
    return (servicos || []).map((s) => {
      const regraEsp = mapaAlcadas.get(Number(s.id));
      return {
        id: s.id,
        nome: s.nome,
        descricao: s.descricao || '',
        preco: Number(s.preco),
        categoria: s.categoria || 'Geral',
        alcada_fechamento: regraEsp
          ? {
              especifica_do_servico: true,
              permite_fechar_orcamento: regraEsp.permite_fechar_orcamento,
              orcamento_min_valor: regraEsp.orcamento_min_valor,
              orcamento_max_valor: regraEsp.orcamento_max_valor,
              desconto_max_percentual: regraEsp.desconto_max_percentual
            }
          : {
              especifica_do_servico: false,
              permite_fechar_orcamento: Boolean(config.permite_fechar_orcamento),
              orcamento_min_valor: Number(config.orcamento_min_valor ?? 0),
              orcamento_max_valor: Number(config.orcamento_max_valor ?? 500),
              desconto_max_percentual: Number(config.desconto_max_percentual ?? 0)
            }
      };
    });
  },

  /**
   * Consulta horários disponíveis na agenda do MEI para uma data (YYYY-MM-DD),
   * respeitando o guardrail determinístico de antecedência mínima e máxima em dias.
   */
  async consultarDisponibilidadeAgenda(usuario_id, dataStr) {
    const config = await this.obterConfiguracao(usuario_id);
    if (!config.ativo || !config.permite_agendar) {
      const erro = new Error('O agendamento automático não está habilitado para este atendente.');
      erro.statusCode = 403;
      throw erro;
    }

    const dataLimpa = dataStr ? String(dataStr).trim().slice(0, 10) : new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataLimpa)) {
      const erro = new Error('Informe a data no formato YYYY-MM-DD');
      erro.statusCode = 400;
      throw erro;
    }

    const diffDias = calcularDiferencaDiasCalendario(dataLimpa);
    const minDias = Number(config.antecedencia_minima_dias ?? 0);
    const maxDias = Number(config.antecedencia_maxima_dias ?? 60);

    if (diffDias < minDias) {
      return {
        data: dataLimpa,
        expediente: `${config.horario_inicio} às ${config.horario_fim}`,
        dentro_limite_antecedencia: false,
        antecedencia_minima_dias: minDias,
        antecedencia_maxima_dias: maxDias,
        horarios_disponiveis: [],
        total_horarios_livres: 0,
        requer_atendimento_humano: true,
        motivo_indisponibilidade:
          `O estabelecimento exige antecedência mínima de ${minDias} dia(s) para agendamentos automáticos. ` +
          `Caso precise de encaixe antes desse prazo, encaminhe para o atendimento humano.`
      };
    }

    if (diffDias > maxDias) {
      return {
        data: dataLimpa,
        expediente: `${config.horario_inicio} às ${config.horario_fim}`,
        dentro_limite_antecedencia: false,
        antecedencia_minima_dias: minDias,
        antecedencia_maxima_dias: maxDias,
        horarios_disponiveis: [],
        total_horarios_livres: 0,
        requer_atendimento_humano: true,
        motivo_indisponibilidade:
          `A agenda automática aceita marcações com no máximo ${maxDias} dias de antecedência. ` +
          `Para datas posteriores, encaminhe ao atendimento humano.`
      };
    }

    const agendamentosDia = (await agendamentoRepository.listar(usuario_id, { data: dataLimpa })) || [];
    const horariosOcupados = new Set(
      agendamentosDia
        .filter((a) => a.status !== 'CANCELADO')
        .map((a) => {
          const dt = a.data_hora instanceof Date ? a.data_hora.toISOString() : String(a.data_hora || '');
          const match = dt.match(/(\d{2}:\d{2})/);
          return match ? match[1] : null;
        })
        .filter(Boolean)
    );

    const hInicio = parseInt(String(config.horario_inicio || '08:00').split(':')[0], 10) || 8;
    const hFim = parseInt(String(config.horario_fim || '18:00').split(':')[0], 10) || 18;
    const slotsLivres = [];

    for (let h = hInicio; h < hFim; h++) {
      const slot = `${String(h).padStart(2, '0')}:00`;
      if (!horariosOcupados.has(slot)) {
        slotsLivres.push(`${dataLimpa} ${slot}`);
      }
    }

    return {
      data: dataLimpa,
      expediente: `${config.horario_inicio} às ${config.horario_fim}`,
      dentro_limite_antecedencia: true,
      antecedencia_minima_dias: minDias,
      antecedencia_maxima_dias: maxDias,
      horarios_disponiveis: slotsLivres,
      total_horarios_livres: slotsLivres.length
    };
  },

  /**
   * Localiza um cliente pelo telefone/nome ou cria automaticamente um registro para o atendimento.
   */
  async _obterOuCriarClienteAtendimento(usuario_id, { nome_cliente, telefone_cliente }) {
    const nomeLimpo = String(nome_cliente || 'Cliente Atendimento').trim();
    const telLimpo = String(telefone_cliente || '').trim();

    if (telLimpo) {
      const existentes = await clienteRepository.listar(usuario_id, telLimpo);
      if (existentes && existentes.length > 0) {
        return existentes[0];
      }
    }
    const porNome = await clienteRepository.listar(usuario_id, nomeLimpo);
    if (porNome && porNome.length > 0) {
      const exato = porNome.find((c) => c.nome.toLowerCase() === nomeLimpo.toLowerCase());
      if (exato) return exato;
    }

    return await clienteRepository.criar({
      usuario_id,
      nome: nomeLimpo,
      telefone: telLimpo || null,
      observacoes: 'Cadastrado automaticamente pelo Atendente Virtual'
    });
  },

  /**
   * Registra um pedido de transbordo para o MEI humano ("Atendimento pendente")
   * e gera o payload de notificação para o aplicativo mobile.
   */
  async solicitarAtendimentoHumano(
    usuario_id,
    { nome_cliente, telefone_cliente, motivo, resumo_conversa } = {}
  ) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    const nome = String(nome_cliente || 'Cliente').trim();
    const tel = String(telefone_cliente || '').trim();
    const mot = String(motivo || 'Solicitação fora da capacidade automática do atendente').trim();
    const resumo = String(resumo_conversa || '').trim();

    const pendente = await atendenteRepository.criarAtendimentoPendente({
      usuario_id,
      nome_cliente: nome,
      telefone_cliente: tel,
      motivo: mot,
      resumo_conversa: resumo
    });

    return {
      atendimento_pendente: pendente,
      notificacao_mobile: {
        titulo: 'Atendimento pendente',
        corpo: `${nome} aguarda retorno humano: ${mot}`,
        prioridade: 'ALTA'
      },
      mensagem_cliente:
        'Sua solicitação foge da alçada automática e já foi encaminhada para o responsável humano, que dará retorno em breve!'
    };
  },

  async listarAtendimentosPendentes(usuario_id, { status } = {}) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }
    const itens = await atendenteRepository.listarAtendimentosPendentes(usuario_id, { status });
    const pendentes = itens.filter((i) => i.status === 'PENDENTE');
    const naoLidosMobile = pendentes.filter((i) => !i.lido_mobile);

    return {
      total_pendentes: pendentes.length,
      nao_lidos_mobile: naoLidosMobile.length,
      notificacao_ativa:
        naoLidosMobile.length > 0
          ? {
              titulo: 'Atendimento pendente',
              mensagem: `${naoLidosMobile[0].nome_cliente}: ${naoLidosMobile[0].motivo}`,
              atendimento_id: naoLidosMobile[0].id
            }
          : null,
      itens
    };
  },

  async atualizarStatusAtendimentoPendente(usuario_id, id, { status = 'CONCLUIDO', lido_mobile = true } = {}) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }
    const atualizado = await atendenteRepository.atualizarStatusAtendimentoPendente(usuario_id, id, {
      status,
      lido_mobile
    });
    if (!atualizado) {
      const erro = new Error('Atendimento pendente não encontrado');
      erro.statusCode = 404;
      throw erro;
    }
    return atualizado;
  },

  /**
   * Cria ou fecha um orçamento solicitado pelo cliente final, aplicando rigorosamente
   * os guardrails determinísticos configurados pelo MEI (por serviço em alcadas_por_servico
   * ou na faixa global orcamento_min_valor..orcamento_max_valor e desconto_max_percentual).
   */
  async proporOuFecharOrcamentoCliente(
    usuario_id,
    {
      nome_cliente,
      telefone_cliente,
      itens,
      desconto = 0,
      fechar_automaticamente = false,
      observacoes
    } = {}
  ) {
    const config = await this.obterConfiguracao(usuario_id);
    if (!config.ativo) {
      const erro = new Error('O atendente virtual deste estabelecimento está desativado.');
      erro.statusCode = 403;
      throw erro;
    }
    if (!config.permite_gerar_orcamento && !config.permite_fechar_orcamento) {
      const erro = new Error('A geração de orçamentos não está habilitada para este atendente.');
      erro.statusCode = 403;
      throw erro;
    }

    if (!Array.isArray(itens) || itens.length === 0) {
      const erro = new Error('Informe pelo menos um item/serviço para o orçamento');
      erro.statusCode = 400;
      throw erro;
    }

    const mapaAlcadasServico = new Map(
      (config.alcadas_por_servico || []).map((a) => [Number(a.servico_id), a])
    );

    let subtotal = 0;
    const itensResolvidos = [];
    const servicosConsultados = [];

    for (let i = 0; i < itens.length; i++) {
      const it = itens[i];
      const qtd = Number(it.quantidade || 1);
      if (isNaN(qtd) || qtd < 1) {
        const erro = new Error(`Quantidade inválida no item ${i + 1}`);
        erro.statusCode = 400;
        throw erro;
      }

      let precoUnit = it.preco_unitario !== undefined && it.preco_unitario !== null ? Number(it.preco_unitario) : null;
      let servicoId = it.servico_id ? Number(it.servico_id) : null;
      let nomeServico = `Item ${i + 1}`;

      if (servicoId) {
        const servico = await servicoRepository.buscarPorId(servicoId, usuario_id);
        if (!servico) {
          const erro = new Error(`Serviço #${servicoId} não encontrado no catálogo`);
          erro.statusCode = 404;
          throw erro;
        }
        precoUnit = Number(servico.preco);
        nomeServico = servico.nome || `Serviço #${servicoId}`;
      }

      if (precoUnit === null || isNaN(precoUnit) || precoUnit < 0) {
        const erro = new Error(`Preço unitário inválido no item ${i + 1}`);
        erro.statusCode = 400;
        throw erro;
      }

      const subtotalItem = Number((qtd * precoUnit).toFixed(2));
      subtotal += subtotalItem;
      itensResolvidos.push({
        servico_id: servicoId,
        quantidade: qtd,
        preco_unitario: Number(precoUnit.toFixed(2))
      });
      servicosConsultados.push({
        servico_id: servicoId,
        nome_servico: nomeServico,
        subtotal_item: subtotalItem,
        regra_especifica: servicoId ? mapaAlcadasServico.get(servicoId) || null : null
      });
    }

    const subtotalFinal = Number(subtotal.toFixed(2));
    const descontoNum = Number(desconto || 0);
    if (isNaN(descontoNum) || descontoNum < 0) {
      const erro = new Error('O desconto não pode ser negativo');
      erro.statusCode = 400;
      throw erro;
    }

    const descontoPctAplicado = subtotalFinal > 0 ? Number(((descontoNum / subtotalFinal) * 100).toFixed(2)) : 0;

    // Determina o teto de desconto aplicável (se houver regra específica de serviço, valida contra ela; caso contrário usa o teto global)
    const regrasEspecificasAtivas = servicosConsultados
      .map((s) => s.regra_especifica)
      .filter(Boolean);

    let tetoPctEfetivo = Number(config.desconto_max_percentual ?? 0);
    if (regrasEspecificasAtivas.length > 0 && regrasEspecificasAtivas.length === servicosConsultados.length) {
      tetoPctEfetivo = Math.min(...regrasEspecificasAtivas.map((r) => Number(r.desconto_max_percentual ?? 0)));
    } else if (regrasEspecificasAtivas.length > 0) {
      for (const s of servicosConsultados) {
        if (s.regra_especifica && descontoPctAplicado > Number(s.regra_especifica.desconto_max_percentual ?? 0) + 0.001) {
          const erro = new Error(
            `O desconto solicitado (${descontoPctAplicado}%) excede o limite máximo de ${s.regra_especifica.desconto_max_percentual}% autorizado para o serviço ${s.nome_servico}.`
          );
          erro.statusCode = 400;
          throw erro;
        }
      }
    }

    if (descontoPctAplicado > tetoPctEfetivo + 0.001) {
      const erro = new Error(
        `O desconto solicitado (${descontoPctAplicado}%) excede o limite máximo de ${tetoPctEfetivo}% autorizado para o atendente.`
      );
      erro.statusCode = 400;
      throw erro;
    }

    const totalFinal = Number((subtotalFinal - descontoNum).toFixed(2));
    let minAuto = Number(config.orcamento_min_valor ?? 0);
    let maxAuto = Number(config.orcamento_max_valor ?? 500);
    let permiteFecharEfetivo = Boolean(config.permite_fechar_orcamento);
    let motivoBloqueioServico = null;
    let usouAlcadaPorServico = false;

    // Avalia guardrails específicos por serviço quando configurados
    if (regrasEspecificasAtivas.length > 0) {
      usouAlcadaPorServico = true;
      for (const s of servicosConsultados) {
        const r = s.regra_especifica;
        if (!r) continue;
        const nomeExibicao = r.nome_servico || s.nome_servico || `#${s.servico_id}`;
        const valorLiquidoItem = Number((s.subtotal_item * (1 - descontoPctAplicado / 100)).toFixed(2));

        if (!r.permite_fechar_orcamento) {
          permiteFecharEfetivo = false;
          motivoBloqueioServico = `O serviço "${nomeExibicao}" (#${s.servico_id}) não permite fechamento automático pelo atendente. O orçamento foi salvo como ENVIADO para aprovação do responsável.`;
          break;
        }

        if (valorLiquidoItem < r.orcamento_min_valor || valorLiquidoItem > r.orcamento_max_valor) {
          motivoBloqueioServico =
            `O valor do serviço "${nomeExibicao}" (R$ ${valorLiquidoItem.toFixed(2)}) está fora da alçada específica do serviço (R$ ${r.orcamento_min_valor.toFixed(2)} a R$ ${r.orcamento_max_valor.toFixed(2)}). O orçamento foi salvo como ENVIADO para aprovação do responsável.`;
          break;
        }
      }

      if (regrasEspecificasAtivas.length === 1 && servicosConsultados.length === 1) {
        minAuto = regrasEspecificasAtivas[0].orcamento_min_valor;
        maxAuto = regrasEspecificasAtivas[0].orcamento_max_valor;
      }
    }

    const dentroDaFaixaFinanceira = usouAlcadaPorServico
      ? motivoBloqueioServico === null
      : totalFinal >= minAuto && totalFinal <= maxAuto;

    const podeAprovarAutomatico =
      Boolean(fechar_automaticamente) &&
      permiteFecharEfetivo &&
      dentroDaFaixaFinanceira;

    const statusOrcamento = podeAprovarAutomatico ? 'APROVADO' : 'ENVIADO';

    let motivoAlcada = 'Orçamento registrado como proposta enviada.';
    if (fechar_automaticamente) {
      if (podeAprovarAutomatico) {
        motivoAlcada = usouAlcadaPorServico
          ? `Orçamento fechado e APROVADO automaticamente dentro da alçada específica do serviço (R$ ${minAuto.toFixed(2)} a R$ ${maxAuto.toFixed(2)}).`
          : `Orçamento fechado e APROVADO automaticamente dentro da alçada do atendente (R$ ${minAuto.toFixed(2)} a R$ ${maxAuto.toFixed(2)}).`;
      } else if (motivoBloqueioServico) {
        motivoAlcada = motivoBloqueioServico;
      } else if (!permiteFecharEfetivo) {
        motivoAlcada =
          'O fechamento automático de orçamentos está desativado pelo responsável. O orçamento foi salvo como ENVIADO para aprovação final do MEI.';
      } else {
        motivoAlcada =
          `Valor total (R$ ${totalFinal.toFixed(2)}) está fora da faixa automática do atendente (R$ ${minAuto.toFixed(2)} a R$ ${maxAuto.toFixed(2)}). O orçamento foi salvo como ENVIADO e encaminhado para aprovação do responsável.`;
      }
    }

    const cliente = await this._obterOuCriarClienteAtendimento(usuario_id, {
      nome_cliente,
      telefone_cliente
    });

    const orcamentoCriado = await orcamentoService.criar({
      usuario_id,
      cliente_id: cliente.id,
      status: statusOrcamento,
      desconto: Number(descontoNum.toFixed(2)),
      observacoes: observacoes || `Gerado pelo Atendente Virtual (${config.nome_atendente})`,
      itens: itensResolvidos
    });

    return {
      orcamento: orcamentoCriado,
      aprovado_automaticamente: podeAprovarAutomatico,
      dentro_faixa_valor: dentroDaFaixaFinanceira,
      usou_alcada_por_servico: usouAlcadaPorServico,
      faixa_autorizada: {
        min: minAuto,
        max: maxAuto,
        desconto_max_percentual: tetoPctEfetivo
      },
      motivo_alcada: motivoAlcada
    };
  },

  /**
   * Realiza o agendamento para o cliente final (criando ou vinculando um orçamento aprovado dentro da alçada).
   * Se o horário solicitado violar antecedencia_minima_dias, antecedencia_maxima_dias ou o expediente do MEI,
   * transborda automaticamente para o atendimento humano ("Atendimento pendente").
   */
  async agendarAtendimentoCliente(
    usuario_id,
    { nome_cliente, telefone_cliente, servico_id, orcamento_id, data_hora, observacoes } = {}
  ) {
    const config = await this.obterConfiguracao(usuario_id);
    if (!config.ativo || !config.permite_agendar) {
      const erro = new Error('O agendamento automático não está habilitado para este atendente.');
      erro.statusCode = 403;
      throw erro;
    }

    const dataHoraStr = String(data_hora || '').trim();
    const dataLimpa = dataHoraStr.slice(0, 10);
    const matchHora = dataHoraStr.match(/(\d{2}):(\d{2})/);
    const horaSolicitada = matchHora ? parseInt(matchHora[1], 10) : null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(dataLimpa)) {
      const diffDias = calcularDiferencaDiasCalendario(dataLimpa);
      const minDias = Number(config.antecedencia_minima_dias ?? 0);
      const maxDias = Number(config.antecedencia_maxima_dias ?? 60);

      if (diffDias < minDias || diffDias > maxDias) {
        const motivoLimite =
          diffDias < minDias
            ? `Cliente solicitou agendamento para ${dataHoraStr}, violando a antecedência mínima de ${minDias} dia(s).`
            : `Cliente solicitou agendamento para ${dataHoraStr}, acima da antecedência máxima de ${maxDias} dia(s).`;

        if (config.transbordo_automatico !== false) {
          const transbordo = await this.solicitarAtendimentoHumano(usuario_id, {
            nome_cliente,
            telefone_cliente,
            motivo: motivoLimite,
            resumo_conversa: observacoes || `Tentativa de agendamento em ${dataHoraStr}`
          });
          return {
            agendado: false,
            requer_atendimento_humano: true,
            motivo_recusa: motivoLimite,
            atendimento_pendente: transbordo.atendimento_pendente,
            notificacao_mobile: transbordo.notificacao_mobile,
            mensagem_cliente: transbordo.mensagem_cliente
          };
        }

        const erro = new Error(motivoLimite);
        erro.statusCode = 400;
        throw erro;
      }

      const hInicio = parseInt(String(config.horario_inicio || '08:00').split(':')[0], 10) || 8;
      const hFim = parseInt(String(config.horario_fim || '18:00').split(':')[0], 10) || 18;
      if (horaSolicitada !== null && (horaSolicitada < hInicio || horaSolicitada >= hFim)) {
        const motivoForaHorario = `Cliente solicitou agendamento às ${matchHora[0]} (${dataLimpa}), fora do horário disponível (${config.horario_inicio} às ${config.horario_fim}).`;
        if (config.transbordo_automatico !== false) {
          const transbordo = await this.solicitarAtendimentoHumano(usuario_id, {
            nome_cliente,
            telefone_cliente,
            motivo: motivoForaHorario,
            resumo_conversa: observacoes || `Pedido fora de horário em ${dataHoraStr}`
          });
          return {
            agendado: false,
            requer_atendimento_humano: true,
            motivo_recusa: motivoForaHorario,
            atendimento_pendente: transbordo.atendimento_pendente,
            notificacao_mobile: transbordo.notificacao_mobile,
            mensagem_cliente: transbordo.mensagem_cliente
          };
        }

        const erro = new Error(motivoForaHorario);
        erro.statusCode = 400;
        throw erro;
      }
    }

    const cliente = await this._obterOuCriarClienteAtendimento(usuario_id, {
      nome_cliente,
      telefone_cliente
    });

    let idOrcamentoFinal = orcamento_id ? Number(orcamento_id) : null;

    if (!idOrcamentoFinal) {
      if (!servico_id) {
        const erro = new Error('Informe o serviço desejado (servico_id) ou um orçamento aprovado (orcamento_id) para agendar.');
        erro.statusCode = 400;
        throw erro;
      }

      const servico = await servicoRepository.buscarPorId(Number(servico_id), usuario_id);
      if (!servico) {
        const erro = new Error('Serviço não encontrado no catálogo');
        erro.statusCode = 404;
        throw erro;
      }

      const orcamentoBase = await orcamentoService.criar({
        usuario_id,
        cliente_id: cliente.id,
        status: 'APROVADO',
        desconto: 0,
        observacoes: `Orçamento automático para agendamento via ${config.nome_atendente}`,
        itens: [{ servico_id: servico.id, quantidade: 1, preco_unitario: Number(servico.preco) }]
      });
      idOrcamentoFinal = orcamentoBase.id;
    }

    const agendamento = await agendamentoService.criar({
      usuario_id,
      cliente_id: cliente.id,
      orcamento_id: idOrcamentoFinal,
      servico_id: servico_id ? Number(servico_id) : undefined,
      data_hora,
      status: 'CONFIRMADO',
      observacoes: observacoes || `Agendado via ${config.nome_atendente}`
    });

    return {
      agendado: true,
      requer_atendimento_humano: false,
      agendamento,
      cliente: { id: cliente.id, nome: cliente.nome, telefone: cliente.telefone },
      orcamento_id: idOrcamentoFinal
    };
  }
};

module.exports = atendenteService;
