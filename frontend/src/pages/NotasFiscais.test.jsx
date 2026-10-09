import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import NotasFiscais from './NotasFiscais';
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

describe('Módulo Fiscal — Notas Fiscais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('deve renderizar a listagem de notas fiscais com dados formatados em BRL e status', async () => {
    const mockNotas = [
      {
        id: 1,
        numero: 101,
        serie: '1',
        tipo: 'NFSE',
        tomador_nome: 'Empresa ABC Ltda',
        tomador_documento: '12.345.678/0001-90',
        data_emissao: '2026-10-08T14:30:00Z',
        valor_total: 250.0,
        status: 'EMITIDA',
      },
      {
        id: 2,
        numero: 102,
        serie: '1',
        tipo: 'NFE',
        destinatario_nome: 'Maria da Silva',
        destinatario_documento: '123.456.789-00',
        data_emissao: '2026-10-08T15:00:00Z',
        valor_total: 180.5,
        status: 'CANCELADA',
      },
    ];

    api.get.mockResolvedValue({ data: { sucesso: true, dados: mockNotas } });

    render(<NotasFiscais />);

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument();
      expect(screen.getByText('Empresa ABC Ltda')).toBeInTheDocument();
      expect(screen.getByText('#102')).toBeInTheDocument();
      expect(screen.getByText('Maria da Silva')).toBeInTheDocument();
    });

    // Formatação de valores
    expect(screen.getAllByText(/250,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/180,50/).length).toBeGreaterThan(0);

    // Badges
    expect(screen.getByText('Emitida')).toBeInTheDocument();
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
  });

  test('deve abrir o modal de emissao ao clicar em Emitir Nova Nota', async () => {
    api.get.mockResolvedValue({ data: { sucesso: true, dados: [] } });

    render(<NotasFiscais />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /emitir nova nota/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /emitir nova nota/i }));

    expect(screen.getByRole('heading', { name: /emitir novo documento fiscal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nfs-e \(serviço\)/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/valor total do serviço/i)).toBeInTheDocument();
  });

  test('deve abrir o modal de visualizacao do DANFE', async () => {
    const mockNotas = [
      {
        id: 1,
        numero: 101,
        serie: '1',
        tipo: 'NFSE',
        tomador_nome: 'Cliente Exemplo',
        valor_total: 150.0,
        status: 'EMITIDA',
      },
    ];

    api.get.mockImplementation((url) => {
      if (url.includes('/danfe')) {
        return Promise.resolve({ data: { sucesso: true, dados: { danfe: '<div>DANFE SIMPLIFICADO MEI</div>' } } });
      }
      return Promise.resolve({ data: { sucesso: true, dados: mockNotas } });
    });

    render(<NotasFiscais />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /danfe/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /danfe/i }));

    await waitFor(() => {
      expect(screen.getByText(/DANFE SIMPLIFICADO MEI/i)).toBeInTheDocument();
    });
  });

  test('deve abrir o modal de cancelamento de nota', async () => {
    const mockNotas = [
      {
        id: 1,
        numero: 101,
        serie: '1',
        tipo: 'NFSE',
        tomador_nome: 'Cliente Para Cancelar',
        valor_total: 150.0,
        status: 'EMITIDA',
      },
    ];

    api.get.mockResolvedValue({ data: { sucesso: true, dados: mockNotas } });

    render(<NotasFiscais />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.getByRole('heading', { name: /cancelar nota fiscal #101/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/justificativa \/ motivo do cancelamento/i)).toBeInTheDocument();
  });
});

