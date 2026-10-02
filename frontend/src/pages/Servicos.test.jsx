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
      delete: vi.fn(),
    },
  };
});

describe('Módulo de Serviços', () => {
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
      },
      {
        id: 2,
        nome: 'Licença de Software',
        categoria: 'Produto',
        preco: 1250.5,
        descricao: 'Licença anual para gestão',
        ativo: 1,
      },
    ];

    api.get.mockResolvedValue({ data: { sucesso: true, dados: mockServicos } });

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
  });

  test('deve abrir o modal de novo serviço com os campos necessários', async () => {
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
  });

  test('deve exibir feedback de catálogo vazio quando nao houver itens', async () => {
    api.get.mockResolvedValue({ data: { sucesso: true, dados: [] } });

    render(<Servicos />);

    await waitFor(() => {
      expect(screen.getByText(/catálogo vazio/i)).toBeInTheDocument();
    });
  });
});
