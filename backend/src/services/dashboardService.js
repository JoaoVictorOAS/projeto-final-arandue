const pool = require('../config/database');

/**
 * Serviço responsável por consolidar métricas e KPIs para o Dashboard do MEI,
 * além do Metric Registry analítico e gerenciamento de múltiplos painéis e widgets customizados.
 */
const dashboardService = {
  /**
   * Obtém o resumo consolidado de métricas financeiras e operacionais para o MEI autenticado.
   * @param {number} usuario_id
   * @returns {Promise<Object>}
   */
  async obterResumo(usuario_id) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const mesAtual = agora.getMonth() + 1;
    const hojeIso = agora.toISOString().slice(0, 10);
    const agoraIso = agora.toISOString().slice(0, 19).replace('T', ' ');

    // Executa todas as consultas do Dashboard em paralelo para alta performance
    const [
      [movimentacoesRows],
      [cobrancasRows],
      [agendamentosHojeRows],
      [proximosAgendamentosRows],
      [orcamentosRows],
      [clientesRows],
    ] = await Promise.all([
      // 1. Métricas do Mês Corrente (Livro Caixa)
      pool.execute(
        `SELECT 
          COALESCE(SUM(CASE WHEN tipo = 'ENTRADA' THEN valor ELSE 0 END), 0) AS entradas_mes,
          COALESCE(SUM(CASE WHEN tipo = 'SAIDA' THEN valor ELSE 0 END), 0) AS saidas_mes
        FROM movimentacoes
        WHERE usuario_id = ?
          AND (
            (YEAR(data_movimentacao) = YEAR(CURDATE()) AND MONTH(data_movimentacao) = MONTH(CURDATE()))
            OR
            (YEAR(data_movimentacao) = ? AND MONTH(data_movimentacao) = ?)
          )`,
        [usuario_id, anoAtual, mesAtual]
      ),

      // 2. Cobranças a receber pendentes (PENDENTE ou ATRASADO)
      pool.execute(
        `SELECT 
          COALESCE(SUM(valor), 0) AS a_receber_pendente
        FROM cobrancas
        WHERE usuario_id = ?
          AND status IN ('PENDENTE', 'ATRASADO')`,
        [usuario_id]
      ),

      // 3. Agendamentos de Hoje (status != CANCELADO)
      pool.execute(
        `SELECT COUNT(*) AS total
        FROM agendamentos
        WHERE usuario_id = ?
          AND (DATE(data_hora) = CURDATE() OR DATE(data_hora) = ?)
          AND status != 'CANCELADO'`,
        [usuario_id, hojeIso]
      ),

      // 4. Próximos 5 agendamentos a partir de agora
      pool.execute(
        `SELECT 
          a.id,
          a.usuario_id,
          a.cliente_id,
          c.nome AS cliente_nome,
          c.telefone AS cliente_telefone,
          a.servico_id,
          s.nome AS servico_nome,
          s.preco AS servico_preco,
          a.data_hora,
          a.status,
          a.observacoes
        FROM agendamentos a
        INNER JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE a.usuario_id = ?
          AND (a.data_hora >= NOW() OR a.data_hora >= ?)
          AND a.status != 'CANCELADO'
        ORDER BY a.data_hora ASC
        LIMIT 5`,
        [usuario_id, agoraIso]
      ),

      // 5. Orçamentos pendentes (ENVIADO ou RASCUNHO)
      pool.execute(
        `SELECT COUNT(*) AS total
        FROM orcamentos
        WHERE usuario_id = ?
          AND status IN ('ENVIADO', 'RASCUNHO')`,
        [usuario_id]
      ),

      // 6. Total de clientes ativos
      pool.execute(
        `SELECT COUNT(*) AS total
        FROM clientes
        WHERE usuario_id = ?
          AND ativo = 1`,
        [usuario_id]
      ),
    ]);

    const entradas_mes = Number(movimentacoesRows[0]?.entradas_mes || 0);
    const saidas_mes = Number(movimentacoesRows[0]?.saidas_mes || 0);
    const saldo_mes = Number((entradas_mes - saidas_mes).toFixed(2));
    const a_receber_pendente = Number(cobrancasRows[0]?.a_receber_pendente || 0);
    const agendamentos_hoje = Number(agendamentosHojeRows[0]?.total || 0);
    const orcamentos_pendentes = Number(orcamentosRows[0]?.total || 0);
    const total_clientes = Number(clientesRows[0]?.total || 0);

    return {
      // Propriedades diretas no primeiro nível (retrocompatibilidade e conveniência)
      saldo_mes,
      entradas_mes,
      saidas_mes,
      a_receber_pendente,
      agendamentos_hoje,
      proximos_agendamentos: proximosAgendamentosRows,
      orcamentos_pendentes,
      total_clientes,

      // Agrupamentos estruturados
      financeiro: {
        entradas_mes,
        saidas_mes,
        saldo_mes,
        a_receber_pendente,
      },
      operacional: {
        agendamentos_hoje,
        proximos_agendamentos: proximosAgendamentosRows,
        orcamentos_pendentes,
        total_clientes,
      },
    };
  },

  // =========================================================================
  // METRIC REGISTRY & ANALYTICS
  // =========================================================================

  /**
   * Retorna o catálogo oficial de métricas, períodos e tipos de gráficos disponíveis.
   * @returns {Object}
   */
  obterMetricasDisponiveis() {
    return {
      metricas: [
        {
          chave: 'limite_mei',
          nome: 'Faturamento vs Teto MEI',
          descricao: 'Acompanhamento do teto anual de faturamento do MEI (R$ 81.000)',
          tipos_grafico_compativeis: ['radial_gauge', 'kpi'],
          periodos_compativeis: ['ano_atual']
        },
        {
          chave: 'fluxo_caixa',
          nome: 'Fluxo de Caixa (Entradas vs Saídas)',
          descricao: 'Comparativo cronológico de entradas e saídas financeiras',
          tipos_grafico_compativeis: ['bar', 'area', 'line'],
          periodos_compativeis: ['mes_atual', 'ultimos_3_meses', 'ultimos_6_meses', 'ano_atual', 'historico_total']
        },
        {
          chave: 'despesas_categoria',
          nome: 'Despesas por Categoria',
          descricao: 'Distribuição percentual e absoluta dos gastos por categoria',
          tipos_grafico_compativeis: ['donut', 'pie', 'bar'],
          periodos_compativeis: ['mes_atual', 'ultimos_3_meses', 'ultimos_6_meses', 'ano_atual', 'historico_total']
        },
        {
          chave: 'top_servicos',
          nome: 'Serviços / Produtos Mais Vendidos',
          descricao: 'Ranking dos serviços mais demandados por receita e quantidade vendida',
          tipos_grafico_compativeis: ['bar', 'pie', 'donut'],
          periodos_compativeis: ['mes_atual', 'ultimos_3_meses', 'ultimos_6_meses', 'ano_atual', 'historico_total']
        },
        {
          chave: 'cobrancas_status',
          nome: 'Distribuição de Cobranças',
          descricao: 'Situação de recebimentos agrupados por status (Pago, Pendente, Atrasado)',
          tipos_grafico_compativeis: ['donut', 'pie', 'bar'],
          periodos_compativeis: ['mes_atual', 'ultimos_3_meses', 'ultimos_6_meses', 'ano_atual', 'historico_total']
        },
        {
          chave: 'funil_orcamentos',
          nome: 'Taxa de Conversão de Orçamentos',
          descricao: 'Volume de orçamentos gerados por etapa do funil',
          tipos_grafico_compativeis: ['bar', 'donut'],
          periodos_compativeis: ['mes_atual', 'ultimos_3_meses', 'ultimos_6_meses', 'ano_atual', 'historico_total']
        },
        {
          chave: 'novos_clientes',
          nome: 'Novos Clientes Cadastrados',
          descricao: 'Evolução do volume de novos clientes cadastrados no período',
          tipos_grafico_compativeis: ['line', 'bar', 'area'],
          periodos_compativeis: ['mes_atual', 'ultimos_3_meses', 'ultimos_6_meses', 'ano_atual', 'historico_total']
        }
      ],
      periodos: [
        { chave: 'mes_atual', nome: 'Mês Atual' },
        { chave: 'ultimos_3_meses', nome: 'Últimos 3 Meses' },
        { chave: 'ultimos_6_meses', nome: 'Últimos 6 Meses' },
        { chave: 'ano_atual', nome: 'Ano Atual' },
        { chave: 'historico_total', nome: 'Histórico Total' }
      ],
      tipos_grafico: [
        { chave: 'bar', nome: 'Barras' },
        { chave: 'line', nome: 'Linhas' },
        { chave: 'area', nome: 'Área' },
        { chave: 'donut', nome: 'Rosca (Donut)' },
        { chave: 'pie', nome: 'Pizza' },
        { chave: 'radial_gauge', nome: 'Termômetro (Gauge)' },
        { chave: 'kpi', nome: 'Cartão KPI' }
      ]
    };
  },

  /**
   * Helper para resolução de intervalo de datas a partir da chave do período.
   * @private
   */
  _obterIntervalo(periodo) {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = agora.getMonth(); // 0 a 11

    if (periodo === 'mes_atual') {
      const dataInicio = `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
      const ultimoDia = new Date(ano, mes + 1, 0).getDate();
      const dataFim = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
      return {
        dataInicio,
        dataFim,
        inicioDateTime: `${dataInicio} 00:00:00`,
        fimDateTime: `${dataFim} 23:59:59`
      };
    }

    if (periodo === 'ultimos_3_meses') {
      const dInicio = new Date(ano, mes - 2, 1);
      const dataInicio = `${dInicio.getFullYear()}-${String(dInicio.getMonth() + 1).padStart(2, '0')}-01`;
      const ultimoDia = new Date(ano, mes + 1, 0).getDate();
      const dataFim = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
      return {
        dataInicio,
        dataFim,
        inicioDateTime: `${dataInicio} 00:00:00`,
        fimDateTime: `${dataFim} 23:59:59`
      };
    }

    if (periodo === 'ultimos_6_meses') {
      const dInicio = new Date(ano, mes - 5, 1);
      const dataInicio = `${dInicio.getFullYear()}-${String(dInicio.getMonth() + 1).padStart(2, '0')}-01`;
      const ultimoDia = new Date(ano, mes + 1, 0).getDate();
      const dataFim = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
      return {
        dataInicio,
        dataFim,
        inicioDateTime: `${dataInicio} 00:00:00`,
        fimDateTime: `${dataFim} 23:59:59`
      };
    }

    if (periodo === 'ano_atual') {
      const dataInicio = `${ano}-01-01`;
      const dataFim = `${ano}-12-31`;
      return {
        dataInicio,
        dataFim,
        inicioDateTime: `${dataInicio} 00:00:00`,
        fimDateTime: `${dataFim} 23:59:59`
      };
    }

    // historico_total
    return {
      dataInicio: '1970-01-01',
      dataFim: '2099-12-31',
      inicioDateTime: '1970-01-01 00:00:00',
      fimDateTime: '2099-12-31 23:59:59'
    };
  },

  /**
   * Helper para gerar a lista cronológica de meses para preenchimento de séries temporais.
   * @private
   */
  _gerarMeses(periodo) {
    const NOMES_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = agora.getMonth();

    let quantidade = 6;
    if (periodo === 'mes_atual') quantidade = 1;
    else if (periodo === 'ultimos_3_meses') quantidade = 3;
    else if (periodo === 'ultimos_6_meses') quantidade = 6;
    else if (periodo === 'ano_atual') quantidade = mes + 1;
    else if (periodo === 'historico_total') quantidade = 12;

    const lista = [];
    for (let i = quantidade - 1; i >= 0; i--) {
      const d = new Date(ano, mes - i, 1);
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const rotulo = `${NOMES_MESES[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
      lista.push({ chave, rotulo });
    }
    return lista;
  },

  /**
   * Executa uma métrica analítica de forma segura por usuário e período.
   * @param {number} usuario_id
   * @param {string} metrica
   * @param {string} [periodo]
   * @param {Object} [configuracoes]
   * @returns {Promise<any>}
   */
  async executarMetrica(usuario_id, metrica, periodo = 'ultimos_6_meses', configuracoes = null) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    switch (metrica) {
      case 'limite_mei':
        return this.calcularLimiteMei(usuario_id);
      case 'fluxo_caixa':
        return this.calcularFluxoCaixa(usuario_id, periodo);
      case 'despesas_categoria':
        return this.calcularDespesasCategoria(usuario_id, periodo);
      case 'top_servicos':
        return this.calcularTopServicos(usuario_id, periodo);
      case 'cobrancas_status':
        return this.calcularCobrancasStatus(usuario_id, periodo);
      case 'funil_orcamentos':
        return this.calcularFunilOrcamentos(usuario_id, periodo);
      case 'novos_clientes':
        return this.calcularNovosClientes(usuario_id, periodo);
      default: {
        const erro = new Error(`Métrica não suportada: ${metrica}`);
        erro.statusCode = 400;
        throw erro;
      }
    }
  },

  /**
   * Calcula o faturamento acumulado no ano vigente comparado ao teto anual do MEI (R$ 81.000).
   * @param {number} usuario_id
   */
  async calcularLimiteMei(usuario_id) {
    const anoAtual = new Date().getFullYear();
    const [rows] = await pool.execute(
      `SELECT COALESCE(SUM(valor), 0) AS faturamento_anual
       FROM movimentacoes
       WHERE usuario_id = ?
         AND tipo = 'ENTRADA'
         AND YEAR(data_movimentacao) = ?`,
      [usuario_id, anoAtual]
    );

    const faturamento_anual = Number(Number(rows[0]?.faturamento_anual || 0).toFixed(2));
    const teto_anual = 81000.00;
    const percentual = Number(((faturamento_anual / teto_anual) * 100).toFixed(2));
    const saldo_restante = Number(Math.max(0, teto_anual - faturamento_anual).toFixed(2));

    return {
      faturamento_anual,
      teto_anual,
      percentual,
      saldo_restante
    };
  },

  /**
   * Calcula o fluxo de caixa histórico (entradas vs saídas) agrupado mês a mês.
   * @param {number} usuario_id
   * @param {string} periodo
   */
  async calcularFluxoCaixa(usuario_id, periodo = 'ultimos_6_meses') {
    const meses = this._gerarMeses(periodo);
    const mapa = new Map();
    for (const m of meses) {
      mapa.set(m.chave, {
        periodo: m.rotulo,
        entradas: 0,
        saidas: 0,
        saldo: 0
      });
    }

    const { dataInicio, dataFim } = this._obterIntervalo(periodo);
    const [rows] = await pool.execute(
      `SELECT 
         DATE_FORMAT(data_movimentacao, '%Y-%m') AS mes_ano,
         COALESCE(SUM(CASE WHEN tipo = 'ENTRADA' THEN valor ELSE 0 END), 0) AS entradas,
         COALESCE(SUM(CASE WHEN tipo = 'SAIDA' THEN valor ELSE 0 END), 0) AS saidas
       FROM movimentacoes
       WHERE usuario_id = ?
         AND data_movimentacao >= ? AND data_movimentacao <= ?
       GROUP BY DATE_FORMAT(data_movimentacao, '%Y-%m')
       ORDER BY mes_ano ASC`,
      [usuario_id, dataInicio, dataFim]
    );

    for (const r of rows) {
      const item = mapa.get(r.mes_ano) || {
        periodo: r.mes_ano,
        entradas: 0,
        saidas: 0,
        saldo: 0
      };
      item.entradas = Number(Number(r.entradas).toFixed(2));
      item.saidas = Number(Number(r.saidas).toFixed(2));
      item.saldo = Number((item.entradas - item.saidas).toFixed(2));
      mapa.set(r.mes_ano, item);
    }

    return Array.from(mapa.values());
  },

  /**
   * Calcula a distribuição de saídas por categoria com valores absolutos e percentuais.
   * @param {number} usuario_id
   * @param {string} periodo
   */
  async calcularDespesasCategoria(usuario_id, periodo = 'mes_atual') {
    const { dataInicio, dataFim } = this._obterIntervalo(periodo);
    const [rows] = await pool.execute(
      `SELECT 
         categoria,
         COALESCE(SUM(valor), 0) AS valor
       FROM movimentacoes
       WHERE usuario_id = ?
         AND tipo = 'SAIDA'
         AND data_movimentacao >= ? AND data_movimentacao <= ?
       GROUP BY categoria
       ORDER BY valor DESC`,
      [usuario_id, dataInicio, dataFim]
    );

    const total = rows.reduce((acc, r) => acc + Number(r.valor), 0);
    return rows.map(r => {
      const valor = Number(Number(r.valor).toFixed(2));
      const percentual = total > 0 ? Number(((valor / total) * 100).toFixed(1)) : 0;
      return {
        categoria: r.categoria,
        valor,
        percentual
      };
    });
  },

  /**
   * Calcula o ranking dos serviços mais vendidos por receita e quantidade.
   * @param {number} usuario_id
   * @param {string} periodo
   */
  async calcularTopServicos(usuario_id, periodo = 'ano_atual') {
    const { dataInicio, dataFim } = this._obterIntervalo(periodo);
    const [rows] = await pool.execute(
      `SELECT 
         s.nome,
         COALESCE(SUM(oi.quantidade), 0) AS total_vendas,
         COALESCE(SUM(oi.subtotal), 0) AS receita
       FROM orcamento_itens oi
       INNER JOIN orcamentos o ON oi.orcamento_id = o.id
       INNER JOIN servicos s ON oi.servico_id = s.id
       WHERE o.usuario_id = ?
         AND o.status NOT IN ('CANCELADO', 'RECUSADO')
         AND o.data_emissao >= ? AND o.data_emissao <= ?
       GROUP BY s.id, s.nome
       ORDER BY receita DESC, total_vendas DESC
       LIMIT 10`,
      [usuario_id, dataInicio, dataFim]
    );

    return rows.map(r => ({
      nome: r.nome,
      total_vendas: Number(r.total_vendas),
      receita: Number(Number(r.receita).toFixed(2))
    }));
  },

  /**
   * Calcula o total de cobranças agrupadas por status (PAGO, PENDENTE, ATRASADO, CANCELADO).
   * @param {number} usuario_id
   * @param {string} periodo
   */
  async calcularCobrancasStatus(usuario_id, periodo = 'ultimos_6_meses') {
    const { dataInicio, dataFim } = this._obterIntervalo(periodo);
    const [rows] = await pool.execute(
      `SELECT 
         status,
         COUNT(*) AS total,
         COALESCE(SUM(valor), 0) AS valor
       FROM cobrancas
       WHERE usuario_id = ?
         AND (
           (vencimento >= ? AND vencimento <= ?)
           OR
           (DATE(criado_em) >= ? AND DATE(criado_em) <= ?)
         )
       GROUP BY status
       ORDER BY valor DESC`,
      [usuario_id, dataInicio, dataFim, dataInicio, dataFim]
    );

    return rows.map(r => ({
      status: r.status,
      total: Number(r.total),
      valor: Number(Number(r.valor).toFixed(2))
    }));
  },

  /**
   * Calcula a taxa de conversão e volume de orçamentos por status (Rascunho, Enviado, Aprovado, etc.).
   * @param {number} usuario_id
   * @param {string} periodo
   */
  async calcularFunilOrcamentos(usuario_id, periodo = 'ano_atual') {
    const { dataInicio, dataFim } = this._obterIntervalo(periodo);
    const [rows] = await pool.execute(
      `SELECT 
         status,
         COUNT(*) AS total,
         COALESCE(SUM(total), 0) AS valor
       FROM orcamentos
       WHERE usuario_id = ?
         AND data_emissao >= ? AND data_emissao <= ?
       GROUP BY status
       ORDER BY total DESC`,
      [usuario_id, dataInicio, dataFim]
    );

    return rows.map(r => ({
      status: r.status,
      total: Number(r.total),
      valor: Number(Number(r.valor).toFixed(2))
    }));
  },

  /**
   * Calcula a evolução do cadastro de novos clientes ao longo dos meses.
   * @param {number} usuario_id
   * @param {string} periodo
   */
  async calcularNovosClientes(usuario_id, periodo = 'ultimos_6_meses') {
    const meses = this._gerarMeses(periodo);
    const mapa = new Map();
    for (const m of meses) {
      mapa.set(m.chave, {
        periodo: m.rotulo,
        total: 0,
        novos_clientes: 0
      });
    }

    const { inicioDateTime, fimDateTime } = this._obterIntervalo(periodo);
    const [rows] = await pool.execute(
      `SELECT 
         DATE_FORMAT(criado_em, '%Y-%m') AS mes_ano,
         COUNT(*) AS total
       FROM clientes
       WHERE usuario_id = ?
         AND criado_em >= ? AND criado_em <= ?
       GROUP BY DATE_FORMAT(criado_em, '%Y-%m')
       ORDER BY mes_ano ASC`,
      [usuario_id, inicioDateTime, fimDateTime]
    );

    for (const r of rows) {
      const item = mapa.get(r.mes_ano) || {
        periodo: r.mes_ano,
        total: 0,
        novos_clientes: 0
      };
      item.total = Number(r.total);
      item.novos_clientes = Number(r.total);
      mapa.set(r.mes_ano, item);
    }

    return Array.from(mapa.values());
  },

  // =========================================================================
  // DASHBOARDS & WIDGETS CRUD OPERATIONS
  // =========================================================================

  /**
   * Provisiona o Dashboard padrão "Principal" com os 3 widgets pré-configurados.
   * @param {number} usuario_id
   * @returns {Promise<Object>}
   */
  async provisionarDashboardPadrao(usuario_id) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    const [resDash] = await pool.execute(
      `INSERT INTO dashboards_usuario (usuario_id, nome, descricao, eh_padrao, ordem)
       VALUES (?, 'Principal', 'Visão consolidada e métricas principais', 1, 0)`,
      [usuario_id]
    );
    const dashboardId = resDash.insertId;

    const widgetsPadrao = [
      {
        dashboard_id: dashboardId,
        usuario_id,
        titulo: 'Faturamento vs Limite MEI',
        tipo_grafico: 'radial_gauge',
        metrica: 'limite_mei',
        periodo: 'ano_atual',
        largura: 2,
        ordem: 0,
      },
      {
        dashboard_id: dashboardId,
        usuario_id,
        titulo: 'Fluxo de Caixa Mensal',
        tipo_grafico: 'bar',
        metrica: 'fluxo_caixa',
        periodo: 'ultimos_6_meses',
        largura: 1,
        ordem: 1,
      },
      {
        dashboard_id: dashboardId,
        usuario_id,
        titulo: 'Despesas por Categoria',
        tipo_grafico: 'donut',
        metrica: 'despesas_categoria',
        periodo: 'mes_atual',
        largura: 1,
        ordem: 2,
      }
    ];

    for (const w of widgetsPadrao) {
      await pool.execute(
        `INSERT INTO dashboard_widgets 
         (dashboard_id, usuario_id, titulo, tipo_grafico, metrica, periodo, largura, ordem, configuracoes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [w.dashboard_id, w.usuario_id, w.titulo, w.tipo_grafico, w.metrica, w.periodo, w.largura, w.ordem]
      );
    }

    return this.obterDashboard(usuario_id, dashboardId, false);
  },

  /**
   * Lista todos os dashboards do usuário com seus respectivos widgets.
   * Se o usuário ainda não tiver nenhum dashboard, provisiona o padrão automaticamente.
   * @param {number} usuario_id
   * @returns {Promise<Array<Object>>}
   */
  async listarDashboards(usuario_id) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    let [rows] = await pool.execute(
      `SELECT * FROM dashboards_usuario WHERE usuario_id = ? ORDER BY ordem ASC, id ASC`,
      [usuario_id]
    );

    if (rows.length === 0) {
      await this.provisionarDashboardPadrao(usuario_id);
      const [novasLinhas] = await pool.execute(
        `SELECT * FROM dashboards_usuario WHERE usuario_id = ? ORDER BY ordem ASC, id ASC`,
        [usuario_id]
      );
      rows = novasLinhas;
    }

    // Carrega todos os widgets do usuário agrupados por dashboard_id
    const [widgetsRows] = await pool.execute(
      `SELECT * FROM dashboard_widgets WHERE usuario_id = ? ORDER BY ordem ASC, id ASC`,
      [usuario_id]
    );

    const widgetsPorDashboard = new Map();
    for (const w of widgetsRows) {
      if (typeof w.configuracoes === 'string') {
        try {
          w.configuracoes = JSON.parse(w.configuracoes);
        } catch {
          w.configuracoes = null;
        }
      }
      if (!widgetsPorDashboard.has(w.dashboard_id)) {
        widgetsPorDashboard.set(w.dashboard_id, []);
      }
      widgetsPorDashboard.get(w.dashboard_id).push(w);
    }

    return rows.map(d => ({
      ...d,
      widgets: widgetsPorDashboard.get(d.id) || []
    }));
  },

  /**
   * Obtém os detalhes de um dashboard específico, calculando os dados das métricas para cada widget.
   * @param {number} usuario_id
   * @param {number|string} dashboard_id
   * @param {boolean} [calcularDados=true]
   * @returns {Promise<Object>}
   */
  async obterDashboard(usuario_id, dashboard_id, calcularDados = true) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    let dashboard;
    if (!dashboard_id || dashboard_id === 'padrao') {
      const [rows] = await pool.execute(
        `SELECT * FROM dashboards_usuario WHERE usuario_id = ? ORDER BY eh_padrao DESC, ordem ASC, id ASC LIMIT 1`,
        [usuario_id]
      );
      if (rows.length === 0) {
        await this.provisionarDashboardPadrao(usuario_id);
        const [padraoRows] = await pool.execute(
          `SELECT * FROM dashboards_usuario WHERE usuario_id = ? ORDER BY eh_padrao DESC, ordem ASC, id ASC LIMIT 1`,
          [usuario_id]
        );
        dashboard = padraoRows[0];
      } else {
        dashboard = rows[0];
      }
    } else {
      const [rows] = await pool.execute(
        `SELECT * FROM dashboards_usuario WHERE id = ? AND usuario_id = ?`,
        [dashboard_id, usuario_id]
      );
      if (rows.length === 0) {
        const erro = new Error('Dashboard não encontrado');
        erro.statusCode = 404;
        throw erro;
      }
      dashboard = rows[0];
    }

    const [widgets] = await pool.execute(
      `SELECT * FROM dashboard_widgets WHERE dashboard_id = ? AND usuario_id = ? ORDER BY ordem ASC, id ASC`,
      [dashboard.id, usuario_id]
    );

    await Promise.all(
      widgets.map(async widget => {
        if (typeof widget.configuracoes === 'string') {
          try {
            widget.configuracoes = JSON.parse(widget.configuracoes);
          } catch {
            widget.configuracoes = null;
          }
        }

        if (calcularDados) {
          try {
            widget.dados = await this.executarMetrica(
              usuario_id,
              widget.metrica,
              widget.periodo,
              widget.configuracoes
            );
          } catch (err) {
            widget.dados = null;
            widget.erro = err.message;
          }
        }
      })
    );

    return {
      ...dashboard,
      widgets
    };
  },

  /**
   * Cria um novo painel de dashboard para o usuário.
   * @param {number} usuario_id
   * @param {Object} dados
   */
  async criarDashboard(usuario_id, { nome, descricao = null, eh_padrao = 0, ordem = null }) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }
    if (!nome || !nome.trim()) {
      const erro = new Error('O nome do dashboard é obrigatório');
      erro.statusCode = 400;
      throw erro;
    }

    const ehPadraoNum = eh_padrao ? 1 : 0;
    if (ehPadraoNum === 1) {
      await pool.execute(
        `UPDATE dashboards_usuario SET eh_padrao = 0 WHERE usuario_id = ?`,
        [usuario_id]
      );
    }

    let finalOrdem = ordem;
    if (finalOrdem === null || finalOrdem === undefined) {
      const [maxRows] = await pool.execute(
        `SELECT COALESCE(MAX(ordem), -1) + 1 AS proxima_ordem FROM dashboards_usuario WHERE usuario_id = ?`,
        [usuario_id]
      );
      finalOrdem = maxRows[0].proxima_ordem;
    }

    const [res] = await pool.execute(
      `INSERT INTO dashboards_usuario (usuario_id, nome, descricao, eh_padrao, ordem)
       VALUES (?, ?, ?, ?, ?)`,
      [usuario_id, nome.trim(), descricao ? descricao.trim() : null, ehPadraoNum, finalOrdem]
    );

    return {
      id: res.insertId,
      usuario_id,
      nome: nome.trim(),
      descricao: descricao ? descricao.trim() : null,
      eh_padrao: ehPadraoNum,
      ordem: finalOrdem,
      widgets: []
    };
  },

  /**
   * Atualiza as configurações de um painel de dashboard.
   * @param {number} usuario_id
   * @param {number} dashboard_id
   * @param {Object} dados
   */
  async atualizarDashboard(usuario_id, dashboard_id, { nome, descricao, eh_padrao, ordem }) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    if (nome !== undefined && (!nome || !nome.trim())) {
      const erro = new Error('O nome do dashboard é obrigatório');
      erro.statusCode = 400;
      throw erro;
    }

    const [existente] = await pool.execute(
      `SELECT * FROM dashboards_usuario WHERE id = ? AND usuario_id = ?`,
      [dashboard_id, usuario_id]
    );
    if (existente.length === 0) {
      const erro = new Error('Dashboard não encontrado');
      erro.statusCode = 404;
      throw erro;
    }

    const dash = existente[0];
    const novoNome = nome !== undefined ? nome.trim() : dash.nome;
    const novaDescricao = descricao !== undefined ? (descricao ? descricao.trim() : null) : dash.descricao;
    const novaOrdem = ordem !== undefined ? Number(ordem) : dash.ordem;

    let novoEhPadrao = dash.eh_padrao;
    if (eh_padrao !== undefined) {
      novoEhPadrao = eh_padrao ? 1 : 0;
      if (novoEhPadrao === 1) {
        await pool.execute(
          `UPDATE dashboards_usuario SET eh_padrao = 0 WHERE usuario_id = ? AND id != ?`,
          [usuario_id, dashboard_id]
        );
      }
    }

    await pool.execute(
      `UPDATE dashboards_usuario 
       SET nome = ?, descricao = ?, eh_padrao = ?, ordem = ?
       WHERE id = ? AND usuario_id = ?`,
      [novoNome, novaDescricao, novoEhPadrao, novaOrdem, dashboard_id, usuario_id]
    );

    return {
      id: Number(dashboard_id),
      usuario_id,
      nome: novoNome,
      descricao: novaDescricao,
      eh_padrao: novoEhPadrao,
      ordem: novaOrdem
    };
  },

  /**
   * Exclui um painel de dashboard e seus widgets. Impede exclusão caso seja o único painel ativo.
   * @param {number} usuario_id
   * @param {number} dashboard_id
   */
  async excluirDashboard(usuario_id, dashboard_id) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    const [totalDashboards] = await pool.execute(
      `SELECT COUNT(*) AS total FROM dashboards_usuario WHERE usuario_id = ?`,
      [usuario_id]
    );

    if (totalDashboards[0].total <= 1) {
      const erro = new Error('Não é possível excluir o único painel ativo');
      erro.statusCode = 400;
      throw erro;
    }

    const [existente] = await pool.execute(
      `SELECT * FROM dashboards_usuario WHERE id = ? AND usuario_id = ?`,
      [dashboard_id, usuario_id]
    );
    if (existente.length === 0) {
      const erro = new Error('Dashboard não encontrado');
      erro.statusCode = 404;
      throw erro;
    }

    const eraPadrao = existente[0].eh_padrao === 1;

    await pool.execute(
      `DELETE FROM dashboards_usuario WHERE id = ? AND usuario_id = ?`,
      [dashboard_id, usuario_id]
    );

    if (eraPadrao) {
      await pool.execute(
        `UPDATE dashboards_usuario SET eh_padrao = 1 WHERE usuario_id = ? ORDER BY ordem ASC, id ASC LIMIT 1`,
        [usuario_id]
      );
    }

    return { sucesso: true, mensagem: 'Dashboard excluído com sucesso' };
  },

  /**
   * Adiciona um widget gráfico a um dashboard existente.
   * @param {number} usuario_id
   * @param {number} dashboard_id
   * @param {Object} dadosWidget
   */
  async adicionarWidget(usuario_id, dashboard_id, dadosWidget) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    const [dash] = await pool.execute(
      `SELECT id FROM dashboards_usuario WHERE id = ? AND usuario_id = ?`,
      [dashboard_id, usuario_id]
    );
    if (dash.length === 0) {
      const erro = new Error('Dashboard não encontrado');
      erro.statusCode = 404;
      throw erro;
    }

    const {
      titulo,
      tipo_grafico = 'bar',
      metrica,
      periodo = 'ultimos_6_meses',
      largura = 1,
      ordem = null,
      configuracoes = null
    } = dadosWidget || {};

    if (!titulo || !titulo.trim()) {
      const erro = new Error('Título do widget é obrigatório');
      erro.statusCode = 400;
      throw erro;
    }
    if (!metrica) {
      const erro = new Error('Métrica do widget é obrigatória');
      erro.statusCode = 400;
      throw erro;
    }

    const metricasValidas = this.obterMetricasDisponiveis().metricas.map(m => m.chave);
    if (!metricasValidas.includes(metrica)) {
      const erro = new Error(`Métrica não suportada: ${metrica}`);
      erro.statusCode = 400;
      throw erro;
    }

    const tiposValidos = ['bar', 'line', 'area', 'donut', 'pie', 'radial_gauge', 'kpi'];
    if (!tiposValidos.includes(tipo_grafico)) {
      const erro = new Error(`Tipo de gráfico inválido: ${tipo_grafico}`);
      erro.statusCode = 400;
      throw erro;
    }

    if (largura !== undefined && ![1, 2].includes(Number(largura))) {
      const erro = new Error('A largura do widget deve ser 1 ou 2');
      erro.statusCode = 400;
      throw erro;
    }

    let finalOrdem = ordem;
    if (finalOrdem === null || finalOrdem === undefined) {
      const [maxRows] = await pool.execute(
        `SELECT COALESCE(MAX(ordem), -1) + 1 AS proxima_ordem FROM dashboard_widgets WHERE dashboard_id = ?`,
        [dashboard_id]
      );
      finalOrdem = maxRows[0].proxima_ordem;
    }

    const configJson = configuracoes ? JSON.stringify(configuracoes) : null;
    const larguraNum = Number(largura) === 2 ? 2 : 1;

    const [res] = await pool.execute(
      `INSERT INTO dashboard_widgets
       (dashboard_id, usuario_id, titulo, tipo_grafico, metrica, periodo, largura, ordem, configuracoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dashboard_id,
        usuario_id,
        titulo.trim(),
        tipo_grafico,
        metrica,
        periodo,
        larguraNum,
        finalOrdem,
        configJson
      ]
    );

    return {
      id: res.insertId,
      dashboard_id: Number(dashboard_id),
      usuario_id,
      titulo: titulo.trim(),
      tipo_grafico,
      metrica,
      periodo,
      largura: larguraNum,
      ordem: finalOrdem,
      configuracoes: configuracoes || null
    };
  },

  /**
   * Atualiza as configurações de um widget gráfico.
   * @param {number} usuario_id
   * @param {number} dashboard_id
   * @param {number} widget_id
   * @param {Object} dadosWidget
   */
  async atualizarWidget(usuario_id, dashboard_id, widget_id, dadosWidget) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    const [existente] = await pool.execute(
      `SELECT * FROM dashboard_widgets WHERE id = ? AND dashboard_id = ? AND usuario_id = ?`,
      [widget_id, dashboard_id, usuario_id]
    );
    if (existente.length === 0) {
      const erro = new Error('Widget não encontrado');
      erro.statusCode = 404;
      throw erro;
    }

    const widget = existente[0];
    const {
      titulo,
      tipo_grafico,
      metrica,
      periodo,
      largura,
      ordem,
      configuracoes
    } = dadosWidget || {};

    if (titulo !== undefined && (!titulo || !titulo.trim())) {
      const erro = new Error('O título do widget é obrigatório');
      erro.statusCode = 400;
      throw erro;
    }

    if (metrica !== undefined) {
      const metricasValidas = this.obterMetricasDisponiveis().metricas.map(m => m.chave);
      if (!metricasValidas.includes(metrica)) {
        const erro = new Error(`Métrica não suportada: ${metrica}`);
        erro.statusCode = 400;
        throw erro;
      }
    }

    if (tipo_grafico !== undefined) {
      const tiposValidos = ['bar', 'line', 'area', 'donut', 'pie', 'radial_gauge', 'kpi'];
      if (!tiposValidos.includes(tipo_grafico)) {
        const erro = new Error(`Tipo de gráfico inválido: ${tipo_grafico}`);
        erro.statusCode = 400;
        throw erro;
      }
    }

    if (largura !== undefined && ![1, 2].includes(Number(largura))) {
      const erro = new Error('A largura do widget deve ser 1 ou 2');
      erro.statusCode = 400;
      throw erro;
    }

    const novoTitulo = titulo !== undefined ? titulo.trim() : widget.titulo;
    const novoTipo = tipo_grafico !== undefined ? tipo_grafico : widget.tipo_grafico;
    const novaMetrica = metrica !== undefined ? metrica : widget.metrica;
    const novoPeriodo = periodo !== undefined ? periodo : widget.periodo;
    const novaLargura = largura !== undefined ? (Number(largura) === 2 ? 2 : 1) : widget.largura;
    const novaOrdem = ordem !== undefined ? Number(ordem) : widget.ordem;

    let novaConfig = widget.configuracoes;
    if (configuracoes !== undefined) {
      novaConfig = configuracoes ? JSON.stringify(configuracoes) : null;
    }

    await pool.execute(
      `UPDATE dashboard_widgets
       SET titulo = ?, tipo_grafico = ?, metrica = ?, periodo = ?, largura = ?, ordem = ?, configuracoes = ?
       WHERE id = ? AND dashboard_id = ? AND usuario_id = ?`,
      [
        novoTitulo,
        novoTipo,
        novaMetrica,
        novoPeriodo,
        novaLargura,
        novaOrdem,
        novaConfig,
        widget_id,
        dashboard_id,
        usuario_id
      ]
    );

    let configRetorno = novaConfig;
    if (typeof configRetorno === 'string') {
      try {
        configRetorno = JSON.parse(configRetorno);
      } catch {
        configRetorno = null;
      }
    }

    return {
      id: Number(widget_id),
      dashboard_id: Number(dashboard_id),
      usuario_id,
      titulo: novoTitulo,
      tipo_grafico: novoTipo,
      metrica: novaMetrica,
      periodo: novoPeriodo,
      largura: novaLargura,
      ordem: novaOrdem,
      configuracoes: configRetorno
    };
  },

  /**
   * Exclui um widget de um painel.
   * @param {number} usuario_id
   * @param {number} dashboard_id
   * @param {number} widget_id
   */
  async excluirWidget(usuario_id, dashboard_id, widget_id) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    const [existente] = await pool.execute(
      `SELECT id FROM dashboard_widgets WHERE id = ? AND dashboard_id = ? AND usuario_id = ?`,
      [widget_id, dashboard_id, usuario_id]
    );
    if (existente.length === 0) {
      const erro = new Error('Widget não encontrado');
      erro.statusCode = 404;
      throw erro;
    }

    await pool.execute(
      `DELETE FROM dashboard_widgets WHERE id = ? AND dashboard_id = ? AND usuario_id = ?`,
      [widget_id, dashboard_id, usuario_id]
    );

    return { sucesso: true, mensagem: 'Widget excluído com sucesso' };
  }
};

module.exports = dashboardService;
