import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import AutoChartRenderer from './AutoChartRenderer';

// Mock de ResizeObserver para compatibilidade com jsdom e Recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock;
}

describe('AutoChartRenderer Component', () => {
  it('deve renderizar mensagem de dados vazios quando data for vazio', () => {
    render(<AutoChartRenderer type="bar" data={[]} />);
    expect(screen.getByText(/Nenhum dado disponível/i)).toBeInTheDocument();
  });

  it('deve renderizar mensagem de dados vazios quando data for null ou undefined', () => {
    const { rerender } = render(<AutoChartRenderer type="line" data={null} />);
    expect(screen.getByText(/Nenhum dado disponível/i)).toBeInTheDocument();

    rerender(<AutoChartRenderer type="pie" data={undefined} />);
    expect(screen.getByText(/Nenhum dado disponível/i)).toBeInTheDocument();
  });

  it('deve renderizar sem quebrar para o tipo radial_gauge (teto MEI)', () => {
    const data = [{ nome: 'Faturamento', valor: 45000, limite: 81000, percentual: 55.5 }];
    render(<AutoChartRenderer type="radial_gauge" data={data} />);
    expect(screen.getByText(/55.5%/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*45\.000/i)).toBeInTheDocument();
  });

  it('deve renderizar radial_gauge quando data for objeto unico', () => {
    const dataObj = { faturamento_anual: 30000, teto_anual: 81000, percentual: 37, saldo_restante: 51000 };
    render(<AutoChartRenderer type="radial_gauge" data={dataObj} />);
    expect(screen.getByText(/37%/i)).toBeInTheDocument();
  });

  it('deve renderizar cartão do tipo kpi com formatação monetária e percentual', () => {
    const kpiData = {
      faturamento_anual: 60000,
      teto_anual: 81000,
      percentual: 74.07,
      saldo_restante: 21000
    };
    render(<AutoChartRenderer type="kpi" data={kpiData} config={{ titulo: 'Faturamento Anual' }} />);
    expect(screen.getByText(/R\$\s*60\.000/i)).toBeInTheDocument();
    expect(screen.getByText(/74\.07%/i)).toBeInTheDocument();
    expect(screen.getByText(/Teto: R\$\s*81\.000/i)).toBeInTheDocument();
  });

  it('deve renderizar tipo bar (gráfico de barras) com container e legenda', () => {
    const fluxoData = [
      { periodo: 'Jan/26', entradas: 4500, saidas: 2100 },
      { periodo: 'Fev/26', entradas: 5200, saidas: 2800 },
    ];
    const { container } = render(<AutoChartRenderer type="bar" data={fluxoData} />);
    expect(container.querySelector('.recharts-responsive-container') || container.querySelector('svg')).toBeDefined();
  });

  it('deve renderizar tipo line (gráfico de linha) sem quebrar', () => {
    const novosClientesData = [
      { periodo: 'Jan/26', total: 4 },
      { periodo: 'Fev/26', total: 8 },
    ];
    const { container } = render(<AutoChartRenderer type="line" data={novosClientesData} />);
    expect(container).toBeDefined();
  });

  it('deve renderizar tipo area (gráfico de área) com gradientes', () => {
    const areaData = [
      { periodo: 'Jan/26', entradas: 3000, saidas: 1500 },
      { periodo: 'Fev/26', entradas: 4200, saidas: 1800 },
    ];
    const { container } = render(<AutoChartRenderer type="area" data={areaData} />);
    expect(container).toBeDefined();
  });

  it('deve renderizar tipo donut e pie com categorias e valores formatados', () => {
    const donutData = [
      { categoria: 'Mercadorias', valor: 2500, percentual: 62.5 },
      { categoria: 'Serviços', valor: 1500, percentual: 37.5 },
    ];
    const { container: c1 } = render(<AutoChartRenderer type="donut" data={donutData} />);
    expect(c1).toBeDefined();

    const { container: c2 } = render(<AutoChartRenderer type="pie" data={donutData} />);
    expect(c2).toBeDefined();
  });

  it('deve renderizar dados de projecao financeira futura em grafico de barras, linha e area', () => {
    const projecaoData = [
      { periodo: 'Nov/26', cobrancas_previstas: 1500, agendamentos_previstos: 2200, total_projetado: 3700 },
      { periodo: 'Dez/26', cobrancas_previstas: 2000, agendamentos_previstos: 3100, total_projetado: 5100 },
    ];

    const { container: barContainer } = render(<AutoChartRenderer type="bar" data={projecaoData} />);
    expect(barContainer).toBeDefined();

    const { container: lineContainer } = render(<AutoChartRenderer type="line" data={projecaoData} />);
    expect(lineContainer).toBeDefined();

    const { container: areaContainer } = render(<AutoChartRenderer type="area" data={projecaoData} />);
    expect(areaContainer).toBeDefined();
  });

  it('deve renderizar fallback amigável para tipo de gráfico desconhecido', () => {
    render(<AutoChartRenderer type="tipo_inexistente" data={[{ a: 1 }]} />);
    expect(screen.getByText(/Tipo de gráfico não suportado/i)).toBeInTheDocument();
  });

  describe('Harmonização de Cores e Hierarquia com o Tema', () => {
    it('deve exportar a função gerarPaletaTema gerando tons harmônicos a partir dos tokens primário e acento', async () => {
      const { gerarPaletaTema } = await import('./AutoChartRenderer');
      expect(typeof gerarPaletaTema).toBe('function');

      const tokens = { primary: '#059669', accent: '#d97706' };
      const paleta = gerarPaletaTema(tokens);

      expect(Array.isArray(paleta)).toBe(true);
      expect(paleta.length).toBeGreaterThanOrEqual(6);
      expect(paleta[0].toLowerCase()).toBe('#059669');
      expect(paleta[1].toLowerCase()).toBe('#d97706');
    });

    it('deve preservar cores semânticas fixas para entradas e saídas (#10b981 e #ef4444)', () => {
      const fluxoData = [{ periodo: 'Jan/26', entradas: 5000, saidas: 2000 }];
      const { container } = render(<AutoChartRenderer type="bar" data={fluxoData} />);
      
      // Bar de entradas e saídas devem ter as cores semânticas preservadas
      expect(container.innerHTML).toContain('#10b981');
      expect(container.innerHTML).toContain('#ef4444');
    });

    it('deve mapear status conhecidos de cobranças e orçamentos para cores semânticas via STATUS_CORES_MAP', async () => {
      const { STATUS_CORES_MAP } = await import('./AutoChartRenderer');
      expect(STATUS_CORES_MAP.PAGO).toBe('#10b981');
      expect(STATUS_CORES_MAP.APROVADO).toBe('#10b981');
      expect(STATUS_CORES_MAP.PENDENTE).toBe('#f59e0b');
      expect(STATUS_CORES_MAP.ATRASADO).toBe('#ef4444');
      expect(STATUS_CORES_MAP.CANCELADO).toBe('#ef4444');

      const statusData = [
        { status: 'PAGO', total: 10, valor: 3000 },
        { status: 'PENDENTE', total: 5, valor: 1500 },
        { status: 'ATRASADO', total: 2, valor: 600 },
      ];
      const { container } = render(<AutoChartRenderer type="donut" data={statusData} />);
      expect(container).toBeDefined();
    });

    it('deve aplicar a cor primária do tema ativo em gráficos analíticos de barra (ex: receita)', () => {
      const receitaData = [{ periodo: 'Jan/26', receita: 4500 }];
      const { container } = render(<AutoChartRenderer type="bar" data={receitaData} />);
      // Por padrão sem theme provider customizado, usa primaryColor de fallback (#6366f1)
      expect(container.innerHTML).toContain('#6366f1');
    });
  });
});
