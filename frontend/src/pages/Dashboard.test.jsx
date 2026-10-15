import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import api from '../services/api';

vi.mock('../services/api', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock('../context/AuthContext', () => {
  return {
    useAuth: () => ({
      usuario: {
        id: 1,
        nome: 'Ana Carolina',
        email: 'ana@meinegocio.com',
      },
    }),
  };
});

describe('Módulo Dashboard - Visão Consolidada com Indicadores', () => {
  const mockResumoDashboard = {
    saldo_mes: 3500.0,
    entradas_mes: 5000.0,
    saidas_mes: 1500.0,
    a_receber_pendente: 1200.0,
    agendamentos_hoje: 4,
    proximos_agendamentos: [
      {
        id: 1,
        cliente_nome: 'Marcos Silva',
        servico_nome: 'Manutenção Preventiva',
        data_hora: '2026-10-05T14:30:00',
        status: 'CONFIRMADO',
      },
      {
        id: 2,
        cliente_nome: 'Beatriz Costa',
        servico_nome: 'Consultoria Contábil',
        data_hora: '2026-10-06T10:00:00',
        status: 'PENDENTE',
      },
    ],
  };

  const mockDashboards = [
    {
      id: 1,
      nome: 'Principal',
      eh_padrao: 1,
      ordem: 0,
      widgets: [
        {
          id: 101,
          dashboard_id: 1,
          titulo: 'Termômetro MEI',
          tipo_grafico: 'radial_gauge',
          metrica: 'limite_mei',
          periodo: 'ano_atual',
          largura: 2,
          ordem: 0,
          dados: {
            valor: 45000,
            limite: 81000,
            percentual: 55.5,
            saldo_restante: 36000,
          },
        },
        {
          id: 102,
          dashboard_id: 1,
          titulo: 'Fluxo de Caixa Mensal',
          tipo_grafico: 'bar',
          metrica: 'fluxo_caixa',
          periodo: 'ultimos_6_meses',
          largura: 1,
          ordem: 1,
          dados: [
            { periodo: 'Set/26', entradas: 4000, saidas: 1500 },
            { periodo: 'Out/26', entradas: 5000, saidas: 2000 },
          ],
        },
      ],
    },
    {
      id: 2,
      nome: 'Vendas & Metas',
      eh_padrao: 0,
      ordem: 1,
      widgets: [
        {
          id: 201,
          dashboard_id: 2,
          titulo: 'Top Serviços',
          tipo_grafico: 'donut',
          metrica: 'top_servicos',
          periodo: 'mes_atual',
          largura: 1,
          ordem: 0,
          dados: [
            { nome: 'Consultoria', valor: 3000, percentual: 60 },
            { nome: 'Manutenção', valor: 2000, percentual: 40 },
          ],
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/dashboard/resumo') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: mockResumoDashboard,
          },
        });
      }
      if (url === '/dashboards') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: mockDashboards,
          },
        });
      }
      if (url === '/dashboards/1') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: mockDashboards[0],
          },
        });
      }
      if (url === '/dashboards/2') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: mockDashboards[1],
          },
        });
      }
      if (url === '/dashboards/metricas/catalogo') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: {
              metricas: [
                {
                  chave: 'limite_mei',
                  nome: 'Faturamento vs Teto MEI',
                  tipos_grafico_compativeis: ['radial_gauge', 'kpi'],
                  periodos_compativeis: ['ano_atual'],
                },
                {
                  chave: 'fluxo_caixa',
                  nome: 'Fluxo de Caixa (Entradas vs Saídas)',
                  tipos_grafico_compativeis: ['bar', 'area', 'line'],
                  periodos_compativeis: ['mes_atual', 'ultimos_3_meses', 'ultimos_6_meses', 'ano_atual', 'historico_total'],
                },
                {
                  chave: 'top_servicos',
                  nome: 'Serviços / Produtos Mais Vendidos',
                  tipos_grafico_compativeis: ['bar', 'pie', 'donut'],
                  periodos_compativeis: ['mes_atual', 'ultimos_3_meses', 'ultimos_6_meses', 'ano_atual', 'historico_total'],
                },
              ],
            },
          },
        });
      }
      return Promise.resolve({ data: { dados: [] } });
    });
    api.post.mockResolvedValue({ data: { sucesso: true, dados: { id: 999 } } });
    api.put.mockResolvedValue({ data: { sucesso: true, dados: {} } });
    api.delete.mockResolvedValue({ data: { sucesso: true, mensagem: 'OK' } });
  });

  test('deve renderizar a seção de Ações Rápidas e navegação do dashboard', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/ações rápidas/i)).toBeInTheDocument();
  });

  test('deve renderizar os cards de indicadores principais (KPIs) com valores formatados em BRL e contadores', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Aguarda carregamento dos KPIs
    await waitFor(() => {
      // Saldo do Mês: R$ 3.500,00
      expect(screen.getAllByText(/3\.500,00/).length).toBeGreaterThan(0);
      // Entradas do Mês: R$ 5.000,00
      expect(screen.getAllByText(/5\.000,00/).length).toBeGreaterThan(0);
      // Saídas do Mês: R$ 1.500,00
      expect(screen.getAllByText(/1\.500,00/).length).toBeGreaterThan(0);
      // A Receber Pendente: R$ 1.200,00
      expect(screen.getAllByText(/1\.200,00/).length).toBeGreaterThan(0);
      // Agendamentos Hoje: 4
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    expect(screen.getByTestId('kpi-saldo-mes')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-entradas-mes')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-saidas-mes')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-a-receber-pendente')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-agendamentos-hoje')).toBeInTheDocument();
  });

  test('deve renderizar a seção de Próximos Atendimentos com a lista de agendamentos e botão para a Agenda', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Marcos Silva')).toBeInTheDocument();
      expect(screen.getByText('Manutenção Preventiva')).toBeInTheDocument();
      expect(screen.getByText('Beatriz Costa')).toBeInTheDocument();
      expect(screen.getByText('Consultoria Contábil')).toBeInTheDocument();
    });

    // Botão para navegar para a Agenda
    expect(screen.getByText(/ver agenda completa/i)).toBeInTheDocument();
  });

  test('deve renderizar a seção de Ações Rápidas com atalhos funcionais', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/novo cliente/i)).toBeInTheDocument();
    expect(screen.getAllByText(/novo orçamento/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/novo agendamento/i)).toBeInTheDocument();
    expect(screen.getByText(/nova cobrança/i)).toBeInTheDocument();
    expect(screen.getByText(/lançar despesa/i)).toBeInTheDocument();
  });

  test('deve processar corretamente payload com estrutura aninhada (financeiro e operacional)', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/dashboard/resumo') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: {
              financeiro: {
                saldo_mes: 2450.5,
                entradas_mes: 4000.0,
                saidas_mes: 1549.5,
                a_receber_pendente: 850.0,
              },
              operacional: {
                agendamentos_hoje: 3,
                proximos_agendamentos: [
                  {
                    id: 99,
                    cliente_nome: 'Cliente Estrutura Aninhada',
                    servico_nome: 'Serviço de Teste',
                    data_hora: '2026-10-10T09:00:00',
                    status: 'CONFIRMADO',
                  },
                ],
                orcamentos_pendentes: 2,
                total_clientes: 5,
              },
            },
          },
        });
      }
      return Promise.resolve({ data: { dados: [] } });
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/2\.450,50/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/4\.000,00/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/1\.549,50/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/850,00/).length).toBeGreaterThan(0);
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Cliente Estrutura Aninhada')).toBeInTheDocument();
    });
  });

  test('deve renderizar as abas de dashboards e os widgets do dashboard ativo', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Abas de dashboards
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /principal/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /vendas & metas/i })).toBeInTheDocument();
    });

    // Widgets do dashboard ativo (Principal)
    expect(screen.getByText('Termômetro MEI')).toBeInTheDocument();
    expect(screen.getByText('Fluxo de Caixa Mensal')).toBeInTheDocument();
    expect(screen.getByText(/55\.5%/i)).toBeInTheDocument();
  });

  test('deve alternar entre abas de dashboards ao clicar', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /vendas & metas/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /vendas & metas/i }));

    await waitFor(() => {
      expect(screen.getByText('Top Serviços')).toBeInTheDocument();
    });
  });

  test('deve abrir modal de novo dashboard e criar novo painel', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: { id: 3, nome: 'Metas 2026', eh_padrao: 0, widgets: [] },
      },
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /novo painel/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /novo painel/i }));

    expect(screen.getByText(/novo painel de dashboard/i)).toBeInTheDocument();

    const inputNome = screen.getByPlaceholderText(/vendas e metas/i);
    fireEvent.change(inputNome, { target: { value: 'Metas 2026' } });

    fireEvent.click(screen.getByRole('button', { name: /criar painel/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/dashboards', expect.objectContaining({
        nome: 'Metas 2026',
      }));
    });
  });

  test('deve abrir modal de novo widget e adicionar ao dashboard ativo', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: {
          id: 103,
          dashboard_id: 1,
          titulo: 'Despesas por Categoria',
          tipo_grafico: 'donut',
          metrica: 'despesas_categoria',
          periodo: 'mes_atual',
          largura: 1,
        },
      },
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /adicionar gráfico/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /adicionar gráfico/i }));

    expect(screen.getByText(/novo gráfico/i)).toBeInTheDocument();

    const inputTitulo = screen.getByLabelText(/título do gráfico/i);
    fireEvent.change(inputTitulo, { target: { value: 'Despesas por Categoria' } });

    fireEvent.click(screen.getByRole('button', { name: /salvar gráfico/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/dashboards/1/widgets', expect.objectContaining({
        titulo: 'Despesas por Categoria',
      }));
    });
  });

  test('deve permitir alternar a largura e excluir um widget', async () => {
    api.put.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: { id: 102, largura: 2 },
      },
    });
    api.delete.mockResolvedValueOnce({
      data: {
        sucesso: true,
        mensagem: 'Widget excluído com sucesso',
      },
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('widget-card-102')).toBeInTheDocument();
    });

    // Redimensionar
    const resizeBtn = screen.getByTestId('widget-resize-btn-102');
    fireEvent.click(resizeBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/dashboards/1/widgets/102', expect.objectContaining({
        largura: 2,
      }));
    });

    // Excluir
    const deleteBtn = screen.getByTestId('widget-delete-btn-102');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/dashboards/1/widgets/102');
    });
  });

  test('deve exibir a alça de arraste (drag handle) para reposicionamento dos gráficos', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('widget-card-101')).toBeInTheDocument();
    });

    const dragHandles = screen.getAllByTitle(/clique e arraste para reposicionar o gráfico/i);
    expect(dragHandles.length).toBeGreaterThan(0);
  });
});

