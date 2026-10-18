import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Cobrancas from './Cobrancas';
import api from '../services/api';

vi.mock('../services/api', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe('Módulo de Cobranças - Responsividade Desktop & Mobile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCobrancas = [
    {
      id: 1,
      cliente_id: 10,
      cliente_nome: 'Marcos Vinicius',
      cliente_telefone: '(11) 99999-8888',
      valor: 250.0,
      vencimento: '2026-10-25',
      data_pagamento: null,
      status: 'PENDENTE',
      observacoes: 'Serviço de manutenção elétrica',
    },
    {
      id: 2,
      cliente_id: 11,
      cliente_nome: 'Ana Clara',
      cliente_telefone: '(21) 98888-7777',
      valor: 450.5,
      vencimento: '2026-10-10',
      data_pagamento: '2026-10-10',
      status: 'PAGO',
      observacoes: 'Instalação concluída',
    },
  ];

  const mockClientes = [
    { id: 10, nome: 'Marcos Vinicius', telefone: '(11) 99999-8888' },
    { id: 11, nome: 'Ana Clara', telefone: '(21) 98888-7777' },
  ];

  test('deve renderizar a listagem tanto no formato tabela desktop quanto em cards mobile', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/cobrancas')) {
        return Promise.resolve({ data: { sucesso: true, dados: mockCobrancas } });
      }
      if (url.includes('/clientes')) {
        return Promise.resolve({ data: { sucesso: true, dados: mockClientes } });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(
      <MemoryRouter>
        <Cobrancas />
      </MemoryRouter>
    );

    expect(screen.getByText(/carregando cobranças/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('Marcos Vinicius').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Ana Clara').length).toBeGreaterThanOrEqual(1);
    });

    // Verifica que os cards mobile específicos foram renderizados
    const cardPendente = screen.getByTestId('cobranca-card-1');
    expect(cardPendente).toBeInTheDocument();
    expect(cardPendente).toHaveTextContent('Marcos Vinicius');
    expect(cardPendente).toHaveTextContent('R$ 250,00');

    const cardPago = screen.getByTestId('cobranca-card-2');
    expect(cardPago).toBeInTheDocument();
    expect(cardPago).toHaveTextContent('Ana Clara');
    expect(cardPago).toHaveTextContent('R$ 450,50');
  });

  test('deve exibir botões tácteis de ação rápida no card mobile para cobranças pendentes', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/cobrancas')) {
        return Promise.resolve({ data: { sucesso: true, dados: [mockCobrancas[0]] } });
      }
      if (url.includes('/clientes')) {
        return Promise.resolve({ data: { sucesso: true, dados: mockClientes } });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(
      <MemoryRouter>
        <Cobrancas />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('cobranca-card-1')).toBeInTheDocument();
    });

    const card = screen.getByTestId('cobranca-card-1');

    // Botões no card mobile
    const btnBaixa = card.querySelector('button[aria-label*="Dar baixa"]');
    const btnPix = card.querySelector('button[aria-label*="Pix Copia e Cola"]');
    const btnWhatsApp = card.querySelector('button[aria-label*="via WhatsApp"]');

    expect(btnBaixa).toBeInTheDocument();
    expect(btnPix).toBeInTheDocument();
    expect(btnWhatsApp).toBeInTheDocument();

    // Clicar em Dar Baixa no card mobile deve abrir o modal de baixa
    fireEvent.click(btnBaixa);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /confirmar recebimento \/ dar baixa/i })).toBeInTheDocument();
    });
  });

  test('deve exibir estado vazio quando não houver cobranças cadastradas', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/cobrancas')) {
        return Promise.resolve({ data: { sucesso: true, dados: [] } });
      }
      if (url.includes('/clientes')) {
        return Promise.resolve({ data: { sucesso: true, dados: [] } });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(
      <MemoryRouter>
        <Cobrancas />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/nenhuma cobrança registrada|nenhuma cobrança encontrada/i)).toBeInTheDocument();
    });
  });
});
