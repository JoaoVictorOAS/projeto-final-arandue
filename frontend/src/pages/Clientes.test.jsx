import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import Clientes from './Clientes';
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

describe('Módulo de Clientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('deve renderizar a listagem de clientes mockada pela API com padrão sucesso/dados', async () => {
    const mockClientes = [
      {
        id: 1,
        nome: 'Carlos Eduardo',
        telefone: '(11) 98765-4321',
        email: 'carlos@empresa.com',
        endereco: 'Rua das Flores, 100 - SP',
        observacoes: 'Cliente preferencial',
        ativo: 1,
      },
      {
        id: 2,
        nome: 'Mariana Souza',
        telefone: '(21) 91234-5678',
        email: 'mariana@email.com',
        endereco: 'Av Central, 200 - RJ',
        observacoes: null,
        ativo: 0,
      },
    ];

    api.get.mockResolvedValue({ data: { sucesso: true, dados: mockClientes } });

    render(<Clientes />);

    expect(screen.getByText(/carregando lista de clientes/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('Carlos Eduardo').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Mariana Souza').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('(11) 98765-4321').length).toBeGreaterThan(0);
    expect(screen.getAllByText('carlos@empresa.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rua das Flores, 100 - SP').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cliente preferencial').length).toBeGreaterThan(0);
  });

  test('deve abrir o modal de novo cliente com campos limpos ao clicar no botao', async () => {
    api.get.mockResolvedValue({ data: { sucesso: true, dados: [] } });

    render(<Clientes />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /novo cliente/i })).toBeInTheDocument();
    });

    const btnNovo = screen.getByRole('button', { name: /novo cliente/i });
    fireEvent.click(btnNovo);

    // Modal deve estar aberto
    expect(screen.getByRole('heading', { name: /novo cliente/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/telefone \/ whatsapp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/endereço completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/observações/i)).toBeInTheDocument();
  });

  test('deve exibir mensagem de estado vazio quando nao houver clientes cadastrados', async () => {
    api.get.mockResolvedValue({ data: { sucesso: true, dados: [] } });

    render(<Clientes />);

    await waitFor(() => {
      expect(screen.getByText(/nenhum cliente cadastrado/i)).toBeInTheDocument();
    });
  });
});
