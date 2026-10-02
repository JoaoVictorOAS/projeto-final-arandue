import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
      return Promise.resolve({ data: { dados: [] } });
    });
  });

  test('deve renderizar mensagem de boas-vindas personalizada e badge de status do sistema', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Boas-vindas com o nome do MEI logado
    expect(screen.getByText(/olá, ana!/i)).toBeInTheDocument();

    // Badge de status do sistema operacional
    expect(screen.getByTestId('status-sistema')).toHaveTextContent(/sistema operacional/i);
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
});
