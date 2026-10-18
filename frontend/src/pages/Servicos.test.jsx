import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import Servicos from './Servicos';
import api from '../services/api';

vi.mock('../services/api', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe('Módulo de Serviços e Assinaturas Recorrentes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('deve renderizar a listagem de serviços com valores formatados em BRL e padrão sucesso/dados', async () => {
    const mockServicos = [
      {
        id: 1,
        nome: 'Manutenção de Computadores',
        categoria: 'Mão de Obra',
        preco: 150.0,
        descricao: 'Limpeza e troca de pasta térmica',
        ativo: 1,
        recorrente: 0,
      },
      {
        id: 2,
        nome: 'Licença de Software',
        categoria: 'Produto',
        preco: 1250.5,
        descricao: 'Licença anual para gestão',
        ativo: 1,
        recorrente: 1,
        periodicidade: 'MENSAL',
      },
    ];

    api.get.mockImplementation((url) => {
      if (url === '/servicos') {
        return Promise.resolve({ data: { sucesso: true, dados: mockServicos } });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(<Servicos />);

    expect(screen.getByText(/carregando catálogo de serviços/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Manutenção de Computadores')).toBeInTheDocument();
      expect(screen.getByText('Licença de Software')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Mão de Obra').length).toBeGreaterThan(0);
    expect(screen.getByText('Limpeza e troca de pasta térmica')).toBeInTheDocument();

    // Valida formatação em BRL (incluindo possíveis espaços não-quebráveis)
    expect(screen.getByText(/150,00/)).toBeInTheDocument();
    expect(screen.getByText(/1\.250,50/)).toBeInTheDocument();

    // Valida badge de assinatura recorrente
    expect(screen.getByText(/assinatura • mensal/i)).toBeInTheDocument();
  });

  test('deve abrir o modal de novo serviço com os campos necessários e campos de recorrência', async () => {
    api.get.mockResolvedValue({ data: { sucesso: true, dados: [] } });

    render(<Servicos />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /novo serviço/i })).toBeInTheDocument();
    });

    const btnNovo = screen.getByRole('button', { name: /novo serviço/i });
    fireEvent.click(btnNovo);

    // Modal deve estar aberto
    expect(screen.getByRole('heading', { name: /novo serviço/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nome do serviço \/ produto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^categoria$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/preço padrão/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descrição detalhada/i)).toBeInTheDocument();

    // Checkbox de serviço recorrente
    const checkboxRecorrente = screen.getByLabelText(/serviço recorrente \(assinatura\)/i);
    expect(checkboxRecorrente).toBeInTheDocument();
    expect(checkboxRecorrente).not.toBeChecked();

    // Ao marcar como recorrente, exibe periodicidade e dia de vencimento
    fireEvent.click(checkboxRecorrente);
    expect(checkboxRecorrente).toBeChecked();
    expect(screen.getByLabelText(/periodicidade padrão/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dia de vencimento padrão/i)).toBeInTheDocument();
  });

  test('deve exibir feedback de catálogo vazio quando nao houver itens', async () => {
    api.get.mockResolvedValue({ data: { sucesso: true, dados: [] } });

    render(<Servicos />);

    await waitFor(() => {
      expect(screen.getByText(/catálogo vazio/i)).toBeInTheDocument();
    });
  });

  test('deve alternar para a aba de assinaturas recorrentes e renderizar métricas de MRR e lista', async () => {
    const mockAssinaturas = [
      {
        id: 1,
        cliente_id: 10,
        cliente_nome: 'Cliente Alpha',
        servico_id: 2,
        servico_nome: 'Manutenção Recorrente',
        valor: 200.0,
        periodicidade: 'MENSAL',
        dia_vencimento: 10,
        data_inicio: '2026-10-01',
        proximo_vencimento: '2026-11-10',
        status: 'ATIVA',
      },
    ];

    const mockResumo = {
      total_assinaturas: 1,
      total_ativas: 1,
      total_pausadas: 0,
      total_canceladas: 0,
      mrr: 200.0,
      proximos_vencimentos_30d: 1,
    };

    api.get.mockImplementation((url) => {
      if (url === '/servicos') {
        return Promise.resolve({ data: { sucesso: true, dados: [] } });
      }
      if (url === '/servicos/assinaturas') {
        return Promise.resolve({ data: { sucesso: true, dados: mockAssinaturas, resumo: mockResumo } });
      }
      if (url === '/clientes') {
        return Promise.resolve({ data: { sucesso: true, dados: [{ id: 10, nome: 'Cliente Alpha' }] } });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(<Servicos />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /assinaturas recorrentes/i })).toBeInTheDocument();
    });

    const abaAssinaturas = screen.getByRole('button', { name: /assinaturas recorrentes/i });
    fireEvent.click(abaAssinaturas);

    await waitFor(() => {
      expect(screen.getByText('Cliente Alpha')).toBeInTheDocument();
      expect(screen.getByText('Manutenção Recorrente')).toBeInTheDocument();
      expect(screen.getByText(/receita mensal recorrente \(mrr\)/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/200,00/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /gerar cobrança/i })).toBeInTheDocument();
  });

  test('deve executar geração de cobrança de uma assinatura ativa', async () => {
    const mockAssinaturas = [
      {
        id: 1,
        cliente_id: 10,
        cliente_nome: 'Cliente Alpha',
        servico_id: 2,
        servico_nome: 'Manutenção Recorrente',
        valor: 200.0,
        periodicidade: 'MENSAL',
        dia_vencimento: 10,
        data_inicio: '2026-10-01',
        proximo_vencimento: '2026-11-10',
        status: 'ATIVA',
      },
    ];

    api.get.mockImplementation((url) => {
      if (url === '/servicos/assinaturas') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: mockAssinaturas,
            resumo: { total_assinaturas: 1, total_ativas: 1, mrr: 200.0, proximos_vencimentos_30d: 1 },
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    api.post.mockResolvedValue({
      data: {
        sucesso: true,
        mensagem: 'Cobrança gerada com sucesso',
        dados: { proximo_vencimento: '2026-12-10' },
      },
    });

    render(<Servicos />);

    const abaAssinaturas = screen.getByRole('button', { name: /assinaturas recorrentes/i });
    fireEvent.click(abaAssinaturas);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /gerar cobrança/i })).toBeInTheDocument();
    });

    const btnGerar = screen.getByRole('button', { name: /gerar cobrança/i });
    fireEvent.click(btnGerar);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/servicos/assinaturas/1/gerar-cobranca');
      expect(screen.getByText(/cobrança gerada com sucesso/i)).toBeInTheDocument();
    });
  });

  test('deve pausar uma assinatura ativa ao clicar no botão de pausar', async () => {
    const mockAssinaturas = [
      {
        id: 1,
        cliente_id: 10,
        cliente_nome: 'Cliente Alpha',
        servico_id: 2,
        servico_nome: 'Manutenção Recorrente',
        valor: 200.0,
        periodicidade: 'MENSAL',
        status: 'ATIVA',
      },
    ];

    api.get.mockImplementation((url) => {
      if (url === '/servicos/assinaturas') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: mockAssinaturas,
            resumo: { total_assinaturas: 1, total_ativas: 1, mrr: 200.0 },
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    api.patch.mockResolvedValue({
      data: {
        sucesso: true,
        dados: { id: 1, status: 'PAUSADA' },
      },
    });

    render(<Servicos />);

    const abaAssinaturas = screen.getByRole('button', { name: /assinaturas recorrentes/i });
    fireEvent.click(abaAssinaturas);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pausar assinatura/i })).toBeInTheDocument();
    });

    const btnPausar = screen.getByRole('button', { name: /pausar assinatura/i });
    fireEvent.click(btnPausar);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/servicos/assinaturas/1/status', { status: 'PAUSADA' });
    });
  });
});
