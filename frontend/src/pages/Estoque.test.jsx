import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import Estoque from './Estoque';
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

describe('Módulo de Estoque & Produção', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('deve renderizar a listagem de insumos com saldos e status', async () => {
    const mockInsumos = [
      {
        id: 1,
        nome: 'Farinha de Trigo',
        unidade_base: 'g',
        quantidade_atual: 5000,
        estoque_minimo: 1000,
        custo_unitario: 0.005,
      },
      {
        id: 2,
        nome: 'Peito de Frango',
        unidade_base: 'g',
        quantidade_atual: 400,
        estoque_minimo: 500,
        custo_unitario: 0.015,
      },
    ];

    api.get.mockImplementation((url) => {
      if (url.includes('/estoque/insumos')) {
        return Promise.resolve({ data: { sucesso: true, dados: mockInsumos } });
      }
      if (url.includes('/servicos')) {
        return Promise.resolve({ data: { sucesso: true, dados: [] } });
      }
      if (url.includes('/estoque/movimentacoes')) {
        return Promise.resolve({ data: { sucesso: true, dados: [] } });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(<Estoque />);

    await waitFor(() => {
      expect(screen.getByText('Farinha de Trigo')).toBeInTheDocument();
      expect(screen.getByText('Peito de Frango')).toBeInTheDocument();
    });

    // Saldo e Alerta
    expect(screen.getByText(/5000 g/)).toBeInTheDocument();
    expect(screen.getByText(/Repor Estoque/i)).toBeInTheDocument();
    expect(screen.getByText(/Suficiente/i)).toBeInTheDocument();
  });

  test('deve abrir o modal de novo insumo ao clicar no botão', async () => {
    api.get.mockResolvedValue({ data: { sucesso: true, dados: [] } });

    render(<Estoque />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /novo insumo/i })).toBeInTheDocument();
    });

    const btnNovo = screen.getByRole('button', { name: /novo insumo/i });
    fireEvent.click(btnNovo);

    // Modal aberto
    expect(screen.getByRole('heading', { name: /novo insumo \/ matéria-prima/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nome do insumo/i)).toBeInTheDocument();
  });

  test('deve abrir o modal de registrar compra e permitir submissão', async () => {
    api.get.mockResolvedValue({ data: { sucesso: true, dados: [] } });
    api.post.mockResolvedValue({ data: { sucesso: true, dados: { insumo_id: 1 } } });

    render(<Estoque />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /registrar compra \/ entrada/i })).toBeInTheDocument();
    });

    const btnEntrada = screen.getByRole('button', { name: /registrar compra \/ entrada/i });
    fireEvent.click(btnEntrada);

    expect(screen.getByRole('heading', { name: /registrar compra \/ entrada de insumo/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/quantidade comprada/i)).toBeInTheDocument();
  });

  test('deve alternar para a aba do simulador e executar simulação com sucesso', async () => {
    const mockServicos = [
      { id: 10, nome: 'Cento de Coxinha', preco: 90.0 },
    ];

    api.get.mockImplementation((url) => {
      if (url.includes('/servicos')) {
        return Promise.resolve({ data: { sucesso: true, dados: mockServicos } });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    api.post.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          rendimentoMaximo: 3,
          insumoLimitante: { nome: 'Peito de Frango', faltaFormatada: '400 g' },
          sobras: [{ insumo_id: 1, nome: 'Farinha de Trigo', sobraFormatada: '2000 g' }],
        },
      },
    });

    render(<Estoque />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /simulador de capacidade/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /simulador de capacidade/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/produto a simular/i)).toBeInTheDocument();
    });

    const select = screen.getByLabelText(/produto a simular/i);
    fireEvent.change(select, { target: { value: '10' } });

    const btnSimular = screen.getByRole('button', { name: /simular agora/i });
    fireEvent.click(btnSimular);

    await waitFor(() => {
      expect(screen.getByText(/3 unidade\(s\)/i)).toBeInTheDocument();
      expect(screen.getByText('Peito de Frango')).toBeInTheDocument();
      expect(screen.getByText(/Sobra: 2000 g/i)).toBeInTheDocument();
    });
  });

  test('deve abrir o modal de entrada por nota fiscal / foto / xml ao clicar no botao', async () => {
    api.get.mockResolvedValue({ data: { sucesso: true, dados: [] } });

    render(<Estoque />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /entrada por nota \/ foto \/ xml/i })).toBeInTheDocument();
    });

    const btnNota = screen.getByRole('button', { name: /entrada por nota \/ foto \/ xml/i });
    fireEvent.click(btnNota);

    expect(screen.getByRole('heading', { name: /entrada de insumos por nota fiscal \(foto ou xml\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /foto do cupom \/ nota/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /arquivo xml da nf-e/i })).toBeInTheDocument();
  });
});
