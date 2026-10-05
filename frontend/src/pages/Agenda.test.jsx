import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import Agenda from './Agenda';
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

describe('Módulo de Agenda', () => {
  const mockClientes = [
    {
      id: 1,
      nome: 'Carlos Drummond',
      telefone: '(31) 98765-4321',
      email: 'carlos@drummond.com',
    },
    {
      id: 2,
      nome: 'Clarice Lispector',
      telefone: '(21) 91234-5678',
      email: 'clarice@lispector.com',
    },
  ];

  const mockServicos = [
    {
      id: 10,
      nome: 'Manutenção de Computador',
      preco: 250.0,
      categoria: 'TI',
    },
    {
      id: 20,
      nome: 'Formatação de Sistema',
      preco: 120.0,
      categoria: 'TI',
    },
  ];

  const mockAgendamentos = [
    {
      id: 501,
      cliente_id: 1,
      cliente_nome: 'Carlos Drummond',
      servico_id: 10,
      servico_nome: 'Manutenção de Computador',
      data_hora: '2026-10-10T14:00:00',
      status: 'PENDENTE',
      observacoes: 'Trazer pasta térmica nova.',
      orcamento_id: 301,
    },
    {
      id: 502,
      cliente_id: 2,
      cliente_nome: 'Clarice Lispector',
      servico_id: 20,
      servico_nome: 'Formatação de Sistema',
      data_hora: '2026-10-11T10:30:00',
      status: 'CONFIRMADO',
      observacoes: 'Fazer backup prévio.',
      orcamento_id: 302,
    },
  ];

  const mockOrcamentos = [
    {
      id: 301,
      cliente_id: 1,
      cliente_nome: 'Carlos Drummond',
      status: 'APROVADO',
      total: 250.0,
      itens: [{ servico_id: 10, quantidade: 1, preco_unitario: 250.0 }],
    },
    {
      id: 302,
      cliente_id: 2,
      cliente_nome: 'Clarice Lispector',
      status: 'APROVADO',
      total: 120.0,
      itens: [{ servico_id: 20, quantidade: 1, preco_unitario: 120.0 }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/agendamentos') {
        return Promise.resolve({ data: { sucesso: true, dados: mockAgendamentos } });
      }
      if (url === '/clientes') {
        return Promise.resolve({ data: { sucesso: true, dados: mockClientes } });
      }
      if (url === '/servicos') {
        return Promise.resolve({ data: { sucesso: true, dados: mockServicos } });
      }
      if (url === '/orcamentos') {
        return Promise.resolve({ data: { sucesso: true, dados: mockOrcamentos } });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });
  });

  const renderAgenda = () =>
    render(
      <MemoryRouter>
        <Agenda />
      </MemoryRouter>
    );

  test('deve renderizar a listagem de agendamentos mockados e o badge de status', async () => {
    renderAgenda();

    expect(screen.getByText(/carregando agendamentos/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Carlos Drummond')).toBeInTheDocument();
      expect(screen.getByText('Clarice Lispector')).toBeInTheDocument();
    });

    expect(screen.getByText('Manutenção de Computador')).toBeInTheDocument();
    expect(screen.getByText('Formatação de Sistema')).toBeInTheDocument();

    // StatusBadges (também existem botões de filtro com o mesmo texto)
    expect(screen.getAllByText(/Pendente/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Confirmado/i).length).toBeGreaterThan(0);

    const badges = screen.getAllByTestId('status-badge');
    expect(badges.length).toBe(2);
    expect(badges[0]).toHaveAttribute('data-status', 'PENDENTE');
    expect(badges[1]).toHaveAttribute('data-status', 'CONFIRMADO');

    // Ações rápidas
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /concluir/i })).toBeInTheDocument();
  });

  test('deve abrir o modal de novo agendamento com os campos necessários', async () => {
    renderAgenda();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /novo agendamento/i })).toBeInTheDocument();
    });

    const btnNovo = screen.getByRole('button', { name: /novo agendamento/i });
    fireEvent.click(btnNovo);

    // Modal
    expect(screen.getByRole('heading', { name: /novo agendamento/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/orçamento aprovado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cliente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/serviço a realizar/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data e horário do atendimento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/observações \/ detalhes/i)).toBeInTheDocument();
  });

  test('deve exibir alerta visual de conflito de horário ao receber erro 409 da API', async () => {
    api.post.mockRejectedValue({
      response: {
        status: 409,
        data: {
          message: 'Choque de horários! Já existe um atendimento para este dia e horário.',
        },
      },
    });

    renderAgenda();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /novo agendamento/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /novo agendamento/i }));

    const submitBtn = screen.getByRole('button', { name: /agendar atendimento/i });
    fireEvent.click(submitBtn);

    // Deve exibir o alerta de conflito 409
    await waitFor(() => {
      expect(screen.getByTestId('alerta-conflito-horario')).toBeInTheDocument();
      expect(
        screen.getByText(/choque de horários detectado!/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/já existe um atendimento para este dia e horário/i)
      ).toBeInTheDocument();
    });
  });

  test('deve exibir mensagem de estado vazio quando nao houver agendamentos cadastrados', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/agendamentos') {
        return Promise.resolve({ data: { sucesso: true, dados: [] } });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    renderAgenda();

    await waitFor(() => {
      expect(screen.getByText(/nenhum compromisso agendado/i)).toBeInTheDocument();
    });
  });

  test('deve exibir o botão Gerar Cobrança para agendamento com status CONCLUIDO', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/agendamentos') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: [
              {
                id: 503,
                cliente_id: 1,
                cliente_nome: 'Carlos Drummond',
                servico_id: 10,
                data_hora: '2026-10-12T15:00:00',
                status: 'CONCLUIDO',
                orcamento_id: 301,
              },
            ],
          },
        });
      }
      if (url === '/clientes') return Promise.resolve({ data: { sucesso: true, dados: mockClientes } });
      if (url === '/servicos') return Promise.resolve({ data: { sucesso: true, dados: mockServicos } });
      if (url === '/orcamentos') return Promise.resolve({ data: { sucesso: true, dados: mockOrcamentos } });
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    renderAgenda();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /gerar cobrança/i })).toBeInTheDocument();
    });
  });
});
