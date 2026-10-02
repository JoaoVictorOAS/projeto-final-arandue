import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import Cobrancas from './Cobrancas';
import Caixa from './Caixa';
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

describe('Módulo Financeiro - Cobranças e Livro Caixa', () => {
  const mockClientes = [
    {
      id: 1,
      nome: 'Mariana Lima',
      telefone: '(11) 98765-4321',
      email: 'mariana@exemplo.com',
    },
    {
      id: 2,
      nome: 'Roberto Dias',
      telefone: '(21) 99887-6655',
      email: 'roberto@exemplo.com',
    },
  ];

  const mockCobrancas = [
    {
      id: 101,
      cliente_id: 1,
      cliente_nome: 'Mariana Lima',
      cliente_telefone: '(11) 98765-4321',
      valor: 1200.0,
      vencimento: '2026-10-15',
      data_pagamento: null,
      status: 'PENDENTE',
      observacoes: 'Serviço de identidade visual e logomarca.',
    },
    {
      id: 102,
      cliente_id: 2,
      cliente_nome: 'Roberto Dias',
      cliente_telefone: '(21) 99887-6655',
      valor: 450.0,
      vencimento: '2026-10-01',
      data_pagamento: '2026-10-01',
      status: 'PAGO',
      observacoes: 'Consultoria rápida de gestão.',
    },
  ];

  const mockMovimentacoes = [
    {
      id: 1,
      tipo: 'ENTRADA',
      categoria: 'Recebimento de Cliente',
      valor: 450.0,
      data_movimentacao: '2026-10-01',
      descricao: 'Baixa recebimento Cobrança #0102 - Roberto Dias',
      cobranca_id: 102,
    },
    {
      id: 2,
      tipo: 'SAIDA',
      categoria: 'DAS-MEI (Imposto Mensal)',
      valor: 75.0,
      data_movimentacao: '2026-10-02',
      descricao: 'Pagamento da guia mensal DAS MEI',
      cobranca_id: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    api.get.mockImplementation((url) => {
      if (url === '/cobrancas') {
        return Promise.resolve({ data: { sucesso: true, dados: mockCobrancas } });
      }
      if (url === '/clientes') {
        return Promise.resolve({ data: { sucesso: true, dados: mockClientes } });
      }
      if (url === '/movimentacoes') {
        return Promise.resolve({ data: { sucesso: true, dados: mockMovimentacoes } });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    api.patch.mockResolvedValue({
      data: { sucesso: true, mensagem: 'Cobrança quitada com sucesso.' },
    });

    api.post.mockResolvedValue({
      data: { sucesso: true, dados: { id: 103 } },
    });
  });

  describe('Submódulo: Cobranças', () => {
    test('deve renderizar a listagem de cobranças com dados formatados em BRL e botão Dar Baixa', async () => {
      render(
        <MemoryRouter>
          <Cobrancas />
        </MemoryRouter>
      );

      // Loading
      expect(screen.getByText(/carregando cobranças/i)).toBeInTheDocument();

      // Aguarda listagem
      await waitFor(() => {
        expect(screen.getByText('#0101')).toBeInTheDocument();
        expect(screen.getByText('#0102')).toBeInTheDocument();
      });

      // Verifica nomes de clientes
      expect(screen.getByText('Mariana Lima')).toBeInTheDocument();
      expect(screen.getByText('Roberto Dias')).toBeInTheDocument();

      // Formatação BRL (1.200,00 e 450,00)
      expect(screen.getAllByText(/1\.200,00/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/450,00/).length).toBeGreaterThan(0);

      // Botão "Dar Baixa" presente para a cobrança pendente
      const btnDarBaixa = screen.getByLabelText(/dar baixa na cobrança 101/i);
      expect(btnDarBaixa).toBeInTheDocument();

      // Cobrança paga deve exibir badge ou indicação de recebido
      expect(screen.getByText(/recebido/i)).toBeInTheDocument();
    });

    test('deve abrir o modal de Dar Baixa e confirmar o recebimento integrando com Livro Caixa', async () => {
      render(
        <MemoryRouter>
          <Cobrancas />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/dar baixa na cobrança 101/i)).toBeInTheDocument();
      });

      // Clica no botão Dar Baixa
      fireEvent.click(screen.getByLabelText(/dar baixa na cobrança 101/i));

      // Modal de Dar Baixa abre
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /confirmar recebimento \/ dar baixa/i })).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/data do pagamento/i)).toBeInTheDocument();
      const checkboxCaixa = screen.getByLabelText(/lançar automaticamente no livro caixa/i);
      expect(checkboxCaixa).toBeInTheDocument();
      expect(checkboxCaixa).toBeChecked();

      // Clica em confirmar baixa
      const btnConfirmar = screen.getByRole('button', { name: /confirmar baixa/i });
      fireEvent.click(btnConfirmar);

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          '/cobrancas/101/pagar',
          expect.objectContaining({
            gerar_movimentacao_caixa: true,
          })
        );
      });
    });

    test('deve abrir o modal de cobrança via WhatsApp com mensagem amigável predefinida', async () => {
      render(
        <MemoryRouter>
          <Cobrancas />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/cobrar via whatsapp cobrança 101/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText(/cobrar via whatsapp cobrança 101/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /cobrar via whatsapp/i })).toBeInTheDocument();
      });

      expect(screen.getByText(/passando para enviar o lembrete da sua cobrança/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copiar mensagem/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /abrir whatsapp/i })).toBeInTheDocument();
    });

    test('deve abrir o modal de Nova Cobrança com os campos necessários', async () => {
      render(
        <MemoryRouter>
          <Cobrancas />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /nova cobrança/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /nova cobrança/i }));

      expect(screen.getByRole('heading', { name: /emitir nova cobrança/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/cliente/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/valor \(r\$\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/data de vencimento/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/observações/i)).toBeInTheDocument();
    });
  });

  describe('Submódulo: Livro Caixa', () => {
    test('deve renderizar o extrato de caixa com totais de entradas, saídas e saldo líquido apurado', async () => {
      render(
        <MemoryRouter>
          <Caixa />
        </MemoryRouter>
      );

      // Loading
      expect(screen.getByText(/carregando extrato do caixa/i)).toBeInTheDocument();

      // Aguarda extrato
      await waitFor(() => {
        expect(screen.getByText(/baixa recebimento cobrança #0102/i)).toBeInTheDocument();
        expect(screen.getByText(/pagamento da guia mensal das mei/i)).toBeInTheDocument();
      });

      // Cards superiores de resumo:
      // Entradas: 450,00
      // Saídas: 75,00
      // Saldo líquido: 450 - 75 = 375,00
      expect(screen.getAllByText(/450,00/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/75,00/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/375,00/).length).toBeGreaterThan(0);

      // Linhas do extrato com badges
      expect(screen.getByText(/Recebimento de Cliente/i)).toBeInTheDocument();
      expect(screen.getByText(/DAS-MEI/i)).toBeInTheDocument();
    });

    test('deve abrir o modal de novo lançamento manual ao clicar em Nova Entrada ou Nova Saída', async () => {
      render(
        <MemoryRouter>
          <Caixa />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /nova saída/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /nova saída/i }));

      // Modal aberto
      expect(screen.getByRole('heading', { name: /novo lançamento financeiro/i })).toBeInTheDocument();
      expect(screen.getByText(/tipo de movimentação/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/categoria/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/valor \(r\$\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/data da movimentação/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/descrição do lançamento/i)).toBeInTheDocument();
    });
  });
});
