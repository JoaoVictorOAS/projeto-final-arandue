import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import Orcamentos from './Orcamentos';
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

describe('Módulo de Orçamentos', () => {
  const mockClientes = [
    {
      id: 1,
      nome: 'João Silva',
      telefone: '(11) 99999-1111',
      email: 'joao@silva.com',
      endereco: 'Rua A, 123',
    },
    {
      id: 2,
      nome: 'Maria Fernandes',
      telefone: '(21) 98888-2222',
      email: 'maria@fernandes.com',
      endereco: 'Av B, 456',
    },
  ];

  const mockServicos = [
    {
      id: 10,
      nome: 'Desenvolvimento Web',
      preco: 1500.0,
      categoria: 'Tecnologia',
    },
    {
      id: 20,
      nome: 'Consultoria Financeira',
      preco: 300.0,
      categoria: 'Consultoria',
    },
  ];

  const mockOrcamentos = [
    {
      id: 101,
      cliente_id: 1,
      cliente_nome: 'João Silva',
      data_emissao: '2026-10-01',
      validade: '2026-10-16',
      subtotal: 1500.0,
      desconto: 100.0,
      total: 1400.0,
      status: 'RASCUNHO',
      observacoes: 'Condição: 50% de entrada e 50% na entrega.',
      itens: [
        {
          id: 1,
          servico_id: 10,
          descricao: 'Desenvolvimento Web',
          quantidade: 1,
          preco_unitario: 1500.0,
          subtotal: 1500.0,
        },
      ],
    },
    {
      id: 102,
      cliente_id: 2,
      cliente_nome: 'Maria Fernandes',
      data_emissao: '2026-10-02',
      validade: '2026-10-17',
      subtotal: 600.0,
      desconto: 0.0,
      total: 600.0,
      status: 'ENVIADO',
      observacoes: 'Validade de 15 dias',
      itens: [
        {
          id: 2,
          servico_id: 20,
          descricao: 'Consultoria Financeira',
          quantidade: 2,
          preco_unitario: 300.0,
          subtotal: 600.0,
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation based on URL
    api.get.mockImplementation((url) => {
      if (url === '/orcamentos') {
        return Promise.resolve({ data: { sucesso: true, dados: mockOrcamentos } });
      }
      if (url === '/clientes') {
        return Promise.resolve({ data: { sucesso: true, dados: mockClientes } });
      }
      if (url === '/servicos') {
        return Promise.resolve({ data: { sucesso: true, dados: mockServicos } });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });
  });

  test('deve renderizar a listagem de orçamentos mockada com padrão sucesso/dados e formatação BRL', async () => {
    render(<Orcamentos />);

    expect(screen.getByText(/carregando orçamentos/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('#0101')).toBeInTheDocument();
      expect(screen.getByText('#0102')).toBeInTheDocument();
    });

    // Clientes
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Maria Fernandes')).toBeInTheDocument();

    // Valores formatados BRL (pode aparecer no subtotal e no total)
    expect(screen.getAllByText(/1\.400,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/600,00/).length).toBeGreaterThan(0);

    // Badges de Status
    expect(screen.getAllByText(/Rascunho/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Enviado/i).length).toBeGreaterThan(0);
  });

  test('deve abrir o modal de proposta comercial detalhada ao clicar no botão de visualização', async () => {
    render(<Orcamentos />);

    await waitFor(() => {
      expect(screen.getByLabelText(/ver proposta do orçamento 101/i)).toBeInTheDocument();
    });

    const btnVerProposta = screen.getByLabelText(/ver proposta do orçamento 101/i);
    fireEvent.click(btnVerProposta);

    // Modal de proposta comercial
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /proposta comercial #0101/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/condição: 50% de entrada/i)).toBeInTheDocument();
    expect(screen.getByText(/imprimir \/ pdf/i)).toBeInTheDocument();
    expect(screen.getByText(/copiar p\/ whatsapp/i)).toBeInTheDocument();
  });

  test('deve abrir o modal de emissão de orçamento com campos dinâmicos e seleção de catálogo', async () => {
    render(<Orcamentos />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /novo orçamento/i })).toBeInTheDocument();
    });

    const btnNovo = screen.getByRole('button', { name: /novo orçamento/i });
    fireEvent.click(btnNovo);

    // Modal de emissão
    expect(screen.getByRole('heading', { name: /emitir novo orçamento/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/cliente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data de emissão/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/validade da proposta/i)).toBeInTheDocument();

    // Botão de adicionar item
    expect(screen.getByRole('button', { name: /adicionar item/i })).toBeInTheDocument();

    // Resumo de valores
    expect(screen.getByText(/subtotal dos itens:/i)).toBeInTheDocument();
    expect(screen.getByText(/total líquido:/i)).toBeInTheDocument();
  });

  test('deve exibir mensagem de estado vazio quando nao houver orçamentos cadastrados', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/orcamentos') {
        return Promise.resolve({ data: { sucesso: true, dados: [] } });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(<Orcamentos />);

    await waitFor(() => {
      expect(screen.getByText(/nenhum orçamento emitido/i)).toBeInTheDocument();
    });
  });
});
