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
  const mockTrack = { stop: vi.fn() };
  const mockStream = {
    getTracks: vi.fn(() => [mockTrack]),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });

    if (typeof HTMLVideoElement !== 'undefined') {
      HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    }

    if (typeof HTMLCanvasElement !== 'undefined') {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      });
      HTMLCanvasElement.prototype.toDataURL = vi
        .fn()
        .mockReturnValue('data:image/jpeg;base64,mockedphotofromcamera');
    }
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

  test('deve abrir o modal de entrada por nota fiscal / foto / xml e exibir opções separadas de Câmera e Galeria', async () => {
    api.get.mockResolvedValue({ data: { sucesso: true, dados: [] } });

    render(<Estoque />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /entrada por nota fiscal ou foto|foto \/ nota/i })).toBeInTheDocument();
    });

    const btnNota = screen.getByRole('button', { name: /entrada por nota fiscal ou foto|foto \/ nota/i });
    fireEvent.click(btnNota);

    expect(screen.getByRole('heading', { name: /entrada de insumos por nota fiscal \(foto ou xml\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /foto do cupom \/ nota/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /arquivo xml da nf-e/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tirar foto agora \(câmera\)/i })).toBeInTheDocument();
    expect(screen.getByText(/escolher da galeria \/ pdf/i)).toBeInTheDocument();
  });

  test('deve abrir a câmera integrada via opção Foto / Nota e enviar foto para OCR', async () => {
    api.get.mockResolvedValue({ data: { sucesso: true, dados: [] } });
    api.post.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          fornecedor: 'Distribuidora Alimentos S/A',
          numero_documento: 'NF-12345',
          valor_total: 150.0,
          itens: [
            { nome: 'Açúcar Cristal', quantidade: 10, unidade: 'kg', valor_total: 45.0 },
          ],
        },
      },
    });

    render(<Estoque />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /entrada por nota fiscal ou foto|foto \/ nota/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /entrada por nota fiscal ou foto|foto \/ nota/i }));

    const btnTirarFotoModal = screen.getByRole('button', { name: /tirar foto agora \(câmera\)/i });
    fireEvent.click(btnTirarFotoModal);

    // Modal de câmera aberto
    expect(screen.getByRole('heading', { name: /fotografar nota \/ cupom de insumos/i })).toBeInTheDocument();
    const btnCapturar = await screen.findByRole('button', { name: /capturar foto/i });
    await waitFor(() => {
      expect(btnCapturar).not.toBeDisabled();
    });

    // Clicar em Tirar Foto
    fireEvent.click(btnCapturar);

    // Verifica chamada ao OCR
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/estoque/insumos/ocr-foto',
        expect.objectContaining({
          imagem_base64: expect.stringContaining('data:image/jpeg;base64,'),
        })
      );
    });

    // Modal de nota fiscal deve abrir com itens identificados
    await waitFor(() => {
      expect(screen.getByText(/Distribuidora Alimentos S\/A/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Açúcar Cristal')).toBeInTheDocument();
    });
  });

  test('deve alternar para aba XML no modal de nota fiscal e exibir instruções de upload', async () => {
    api.get.mockResolvedValue({ data: { sucesso: true, dados: [] } });

    render(<Estoque />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /entrada por nota fiscal ou foto|foto \/ nota/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /entrada por nota fiscal ou foto|foto \/ nota/i }));

    const btnXmlTab = screen.getByRole('button', { name: /arquivo xml da nf-e/i });
    fireEvent.click(btnXmlTab);

    expect(screen.getByText(/anexe o arquivo xml da nf-e emitida pelo fornecedor/i)).toBeInTheDocument();
    expect(screen.getByText(/clique para carregar o arquivo \.xml/i)).toBeInTheDocument();
  });

  test('deve preencher formulário de Novo Insumo via foto da câmera', async () => {
    api.get.mockResolvedValue({ data: { sucesso: true, dados: [] } });
    api.post.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          itens: [
            { nome: 'Leite Condensado Piracanjuba', quantidade: 1, unidade: 'kg', valor_total: 10.0 },
          ],
        },
      },
    });

    render(<Estoque />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /novo insumo/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /novo insumo/i }));

    expect(screen.getByRole('button', { name: /preencher por foto \(câmera\)/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /preencher por foto \(câmera\)/i }));

    // Modal de câmera para novo insumo
    expect(screen.getByRole('heading', { name: /fotografar rótulo \/ insumo/i })).toBeInTheDocument();

    const btnCapturar = await screen.findByRole('button', { name: /capturar foto/i });
    await waitFor(() => {
      expect(btnCapturar).not.toBeDisabled();
    });
    fireEvent.click(btnCapturar);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Leite Condensado Piracanjuba')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0.0100')).toBeInTheDocument(); // 10 / 1000g = 0.0100
    });
  });

  test('deve preencher formulário de Registrar Compra / Entrada via foto da câmera', async () => {
    const mockInsumos = [
      { id: 1, nome: 'Farinha de Trigo', unidade_base: 'g', quantidade_atual: 5000, estoque_minimo: 1000 },
    ];
    api.get.mockImplementation((url) => {
      if (url.includes('/estoque/insumos')) {
        return Promise.resolve({ data: { sucesso: true, dados: mockInsumos } });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    api.post.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          itens: [
            { nome: 'Farinha de Trigo', quantidade: 5, unidade: 'kg', valor_total: 25.0 },
          ],
        },
      },
    });

    render(<Estoque />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /registrar compra \/ entrada/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /registrar compra \/ entrada/i }));

    expect(screen.getByRole('button', { name: /preencher por foto \(câmera\)/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /preencher por foto \(câmera\)/i }));

    expect(screen.getByRole('heading', { name: /fotografar comprovante \/ insumo comprado/i })).toBeInTheDocument();
    const btnCapturar = await screen.findByRole('button', { name: /capturar foto/i });
    await waitFor(() => {
      expect(btnCapturar).not.toBeDisabled();
    });
    fireEvent.click(btnCapturar);

    await waitFor(() => {
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('25')).toBeInTheDocument();
    });
  });

  test('deve exibir aviso amigável e opção de galeria quando câmera for bloqueada ou indisponível', async () => {
    api.get.mockResolvedValue({ data: { sucesso: true, dados: [] } });

    navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue({
      name: 'NotAllowedError',
      message: 'Permission denied',
    });

    render(<Estoque />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /entrada por nota fiscal ou foto|foto \/ nota/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /entrada por nota fiscal ou foto|foto \/ nota/i }));

    const btnTirarFotoModal = screen.getByRole('button', { name: /tirar foto agora \(câmera\)/i });
    fireEvent.click(btnTirarFotoModal);

    await waitFor(() => {
      expect(screen.getByText(/permissão de acesso à câmera negada/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /abrir câmera nativa \/ galeria/i })).toBeInTheDocument();
    });
  });
});
