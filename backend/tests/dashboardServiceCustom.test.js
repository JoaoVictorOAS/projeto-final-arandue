const pool = require('../src/config/database');
const dashboardService = require('../src/services/dashboardService');

describe('dashboardService - Métricas Analíticas e Dashboards Customizados', () => {
  let userId;
  let otherUserId;

  beforeAll(async () => {
    // Limpa eventuais resíduos de execuções anteriores
    await pool.execute(`DELETE FROM usuarios WHERE email IN ('metric.test@mei.com', 'metric.other@mei.com')`);

    // Cria usuário de teste principal
    const [res] = await pool.execute(
      `INSERT INTO usuarios (nome, email, senha) VALUES ('User Test Metric', 'metric.test@mei.com', 'hash123')`
    );
    userId = res.insertId;

    // Cria outro usuário para testes de isolamento multi-tenant
    const [otherRes] = await pool.execute(
      `INSERT INTO usuarios (nome, email, senha) VALUES ('Other User Metric', 'metric.other@mei.com', 'hash123')`
    );
    otherUserId = otherRes.insertId;
  });

  afterAll(async () => {
    if (userId || otherUserId) {
      await pool.execute(
        `DELETE FROM usuarios WHERE email IN ('metric.test@mei.com', 'metric.other@mei.com')`
      );
    }
    await pool.end();
  });

  test('deve listar catálogo de métricas disponíveis', () => {
    const catalogo = dashboardService.obterMetricasDisponiveis();
    expect(Array.isArray(catalogo.metricas)).toBe(true);
    expect(catalogo.metricas.some(m => m.chave === 'fluxo_caixa')).toBe(true);
    expect(catalogo.metricas.some(m => m.chave === 'limite_mei')).toBe(true);
    expect(catalogo.metricas.some(m => m.chave === 'despesas_categoria')).toBe(true);
    expect(catalogo.metricas.some(m => m.chave === 'top_servicos')).toBe(true);
    expect(catalogo.metricas.some(m => m.chave === 'cobrancas_status')).toBe(true);
    expect(catalogo.metricas.some(m => m.chave === 'funil_orcamentos')).toBe(true);
    expect(catalogo.metricas.some(m => m.chave === 'novos_clientes')).toBe(true);
  });

  test('deve provisionar dashboard padrão se o usuário não possuir dashboards', async () => {
    const dashboards = await dashboardService.listarDashboards(userId);
    expect(dashboards.length).toBe(1);
    expect(dashboards[0].eh_padrao).toBe(1);
    expect(dashboards[0].nome).toBe('Principal');
    expect(dashboards[0].widgets.length).toBe(3);

    // Valida os 3 widgets pré-configurados do Principal
    const metricasWidgets = dashboards[0].widgets.map(w => w.metrica);
    expect(metricasWidgets).toContain('limite_mei');
    expect(metricasWidgets).toContain('fluxo_caixa');
    expect(metricasWidgets).toContain('despesas_categoria');
  });

  test('deve executar métrica de fluxo_caixa sem erro', async () => {
    const dados = await dashboardService.executarMetrica(userId, 'fluxo_caixa', 'ultimos_6_meses');
    expect(Array.isArray(dados)).toBe(true);
    expect(dados.length).toBeGreaterThan(0);
    expect(dados[0]).toHaveProperty('entradas');
    expect(dados[0]).toHaveProperty('saidas');
    expect(dados[0]).toHaveProperty('periodo');
  });

  test('deve executar todas as 7 métricas analíticas suportadas', async () => {
    // 1. limite_mei
    const limiteMei = await dashboardService.executarMetrica(userId, 'limite_mei');
    expect(limiteMei).toHaveProperty('faturamento_anual');
    expect(limiteMei).toHaveProperty('teto_anual', 81000);
    expect(limiteMei).toHaveProperty('percentual');
    expect(limiteMei).toHaveProperty('saldo_restante');

    // 2. despesas_categoria
    const despesas = await dashboardService.executarMetrica(userId, 'despesas_categoria', 'mes_atual');
    expect(Array.isArray(despesas)).toBe(true);

    // 3. top_servicos
    const topServicos = await dashboardService.executarMetrica(userId, 'top_servicos', 'ano_atual');
    expect(Array.isArray(topServicos)).toBe(true);

    // 4. cobrancas_status
    const cobrancas = await dashboardService.executarMetrica(userId, 'cobrancas_status', 'ultimos_6_meses');
    expect(Array.isArray(cobrancas)).toBe(true);

    // 5. funil_orcamentos
    const funil = await dashboardService.executarMetrica(userId, 'funil_orcamentos', 'ano_atual');
    expect(Array.isArray(funil)).toBe(true);

    // 6. novos_clientes
    const novosClientes = await dashboardService.executarMetrica(userId, 'novos_clientes', 'ultimos_6_meses');
    expect(Array.isArray(novosClientes)).toBe(true);
    expect(novosClientes.length).toBeGreaterThan(0);
  });

  test('deve lançar erro ao tentar executar métrica inexistente', async () => {
    await expect(
      dashboardService.executarMetrica(userId, 'metrica_invalida_xyz')
    ).rejects.toThrow('Métrica não suportada');
  });

  test('deve suportar períodos paramétricos e métrica projecao_financeira', async () => {
    // 1. Catálogo deve incluir projecao_financeira
    const catalogo = dashboardService.obterMetricasDisponiveis();
    expect(catalogo.metricas.some(m => m.chave === 'projecao_financeira')).toBe(true);
    expect(catalogo.periodos.some(p => p.chave === 'proximos_3_meses')).toBe(true);

    // 2. Parser paramétrico
    const parsed3m = dashboardService._parsePeriodo('proximos_3_meses');
    expect(parsed3m.direcao).toBe('proximos');
    expect(parsed3m.quantidade).toBe(3);
    expect(parsed3m.unidade).toBe('meses');

    const parsed30d = dashboardService._parsePeriodo('proximos_30_dias');
    expect(parsed30d.direcao).toBe('proximos');
    expect(parsed30d.quantidade).toBe(30);
    expect(parsed30d.unidade).toBe('dias');

    const parsed1a = dashboardService._parsePeriodo('proximos_1_ano');
    expect(parsed1a.direcao).toBe('proximos');
    expect(parsed1a.quantidade).toBe(1);
    expect(parsed1a.unidade).toBe('anos');

    const parsed12m = dashboardService._parsePeriodo('ultimos_12_meses');
    expect(parsed12m.direcao).toBe('ultimos');
    expect(parsed12m.quantidade).toBe(12);
    expect(parsed12m.unidade).toBe('meses');

    // 3. Execução da métrica projecao_financeira
    const projecao = await dashboardService.executarMetrica(userId, 'projecao_financeira', 'proximos_3_meses');
    expect(Array.isArray(projecao)).toBe(true);
    expect(projecao.length).toBe(3);
    expect(projecao[0]).toHaveProperty('periodo');
    expect(projecao[0]).toHaveProperty('cobrancas_previstas');
    expect(projecao[0]).toHaveProperty('agendamentos_previstos');
    expect(projecao[0]).toHaveProperty('total_projetado');
  });

  test('deve obter dashboard com dados computados em cada widget', async () => {
    const dashboards = await dashboardService.listarDashboards(userId);
    const dashboardId = dashboards[0].id;

    const dashDetalhado = await dashboardService.obterDashboard(userId, dashboardId);
    expect(dashDetalhado.id).toBe(dashboardId);
    expect(dashDetalhado.widgets.length).toBe(3);

    // Cada widget deve conter a propriedade "dados" computada
    for (const widget of dashDetalhado.widgets) {
      expect(widget).toHaveProperty('dados');
      expect(widget.dados).not.toBeNull();
    }
  });

  test('deve criar, atualizar e excluir novo dashboard customizado com widgets', async () => {
    const novo = await dashboardService.criarDashboard(userId, {
      nome: 'Painel Vendas',
      descricao: 'Acompanhamento de vendas'
    });
    expect(novo.id).toBeDefined();
    expect(novo.nome).toBe('Painel Vendas');

    // Adiciona widget
    const addWidget = await dashboardService.adicionarWidget(userId, novo.id, {
      titulo: 'Top Serviços',
      tipo_grafico: 'bar',
      metrica: 'top_servicos',
      periodo: 'ano_atual',
      largura: 2
    });
    expect(addWidget.id).toBeDefined();
    expect(addWidget.titulo).toBe('Top Serviços');

    // Atualiza widget
    const widgetAtualizado = await dashboardService.atualizarWidget(userId, novo.id, addWidget.id, {
      titulo: 'Ranking de Serviços',
      largura: 1
    });
    expect(widgetAtualizado.titulo).toBe('Ranking de Serviços');
    expect(widgetAtualizado.largura).toBe(1);

    // Atualiza dashboard
    const dashAtualizado = await dashboardService.atualizarDashboard(userId, novo.id, {
      nome: 'Painel Comercial Atualizado'
    });
    expect(dashAtualizado.nome).toBe('Painel Comercial Atualizado');

    // Exclui widget e dashboard
    await dashboardService.excluirWidget(userId, novo.id, addWidget.id);
    await dashboardService.excluirDashboard(userId, novo.id);

    // Confirma que não é mais retornado
    await expect(
      dashboardService.obterDashboard(userId, novo.id)
    ).rejects.toThrow();
  });

  test('deve garantir isolamento multi-tenant entre MEIs distintos', async () => {
    const dashboardsUser1 = await dashboardService.listarDashboards(userId);
    const dashUser1Id = dashboardsUser1[0].id;

    // Outro usuário MEI não pode acessar o dashboard do MEI 1
    await expect(
      dashboardService.obterDashboard(otherUserId, dashUser1Id)
    ).rejects.toThrow();

    // Outro usuário MEI não pode alterar nem excluir dashboard do MEI 1
    await expect(
      dashboardService.atualizarDashboard(otherUserId, dashUser1Id, { nome: 'Hacked' })
    ).rejects.toThrow();

    await expect(
      dashboardService.excluirDashboard(otherUserId, dashUser1Id)
    ).rejects.toThrow();
  });

  test('deve impedir exclusão do único dashboard do usuário', async () => {
    const dashboards = await dashboardService.listarDashboards(otherUserId);
    expect(dashboards.length).toBe(1);

    await expect(
      dashboardService.excluirDashboard(otherUserId, dashboards[0].id)
    ).rejects.toThrow('Não é possível excluir o único painel ativo');
  });

  test('deve aplicar validações estritas ao atualizar dashboard e widgets', async () => {
    const dashboards = await dashboardService.listarDashboards(userId);
    const dashId = dashboards[0].id;
    const widgetId = dashboards[0].widgets[0].id;

    // Atualizar dashboard com nome vazio ou somente espaços
    await expect(
      dashboardService.atualizarDashboard(userId, dashId, { nome: '' })
    ).rejects.toThrow('O nome do dashboard é obrigatório');

    await expect(
      dashboardService.atualizarDashboard(userId, dashId, { nome: '   ' })
    ).rejects.toThrow('O nome do dashboard é obrigatório');

    // Atualizar widget com título vazio
    await expect(
      dashboardService.atualizarWidget(userId, dashId, widgetId, { titulo: '' })
    ).rejects.toThrow('O título do widget é obrigatório');

    // Atualizar widget com métrica inválida
    await expect(
      dashboardService.atualizarWidget(userId, dashId, widgetId, { metrica: 'metrica_inexistente' })
    ).rejects.toThrow('Métrica não suportada');

    // Atualizar widget com tipo de gráfico inválido
    await expect(
      dashboardService.atualizarWidget(userId, dashId, widgetId, { tipo_grafico: 'grafico_inexistente' })
    ).rejects.toThrow('Tipo de gráfico inválido');

    // Atualizar widget com largura inválida
    await expect(
      dashboardService.atualizarWidget(userId, dashId, widgetId, { largura: 3 })
    ).rejects.toThrow('A largura do widget deve ser 1 ou 2');

    // Adicionar widget com largura inválida
    await expect(
      dashboardService.adicionarWidget(userId, dashId, {
        titulo: 'Teste Largura',
        metrica: 'limite_mei',
        largura: 4
      })
    ).rejects.toThrow('A largura do widget deve ser 1 ou 2');
  });
});
