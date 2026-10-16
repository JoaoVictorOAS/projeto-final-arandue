import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import Assistente from './Assistente';
import api from '../services/api';

vi.mock('../services/api', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe('Módulo do Assistente IA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('deve renderizar a interface do assistente com sidebar de conversas e sugestões iniciais', async () => {
    api.get.mockResolvedValueOnce({
      data: { sucesso: true, dados: [] },
    });

    render(<Assistente />);

    expect(screen.getByText(/assistente virtual mei/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nova conversa/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/como posso ajudar o seu negócio hoje\?/i)).toBeInTheDocument();
      expect(screen.getByText(/qual o limite de faturamento anual do mei\?/i)).toBeInTheDocument();
      expect(screen.getByText(/como emitir nota fiscal para pessoa física\?/i)).toBeInTheDocument();
    });

    // Rodapé legal obrigatório
    expect(
      screen.getByText(/orientação informativa baseada no documento oficial do mei\. não substitui assessoria contábil\./i)
    ).toBeInTheDocument();
  });

  test('deve listar conversas salvas na barra lateral e permitir selecionar uma conversa', async () => {
    const conversasMock = [
      { id: 101, titulo: 'Dúvida sobre DAS e boleto', atualizado_em: '2026-10-07T12:00:00Z' },
      { id: 102, titulo: 'Limite de faturamento anual', atualizado_em: '2026-10-07T13:00:00Z' },
    ];

    const mensagensMock = [
      { id: 1, papel: 'usuario', conteudo: 'Qual a data de vencimento do DAS?', fontes: [] },
      { id: 2, papel: 'assistente', conteudo: 'O DAS vence todo dia 20 de cada mês.', fontes: [{ pagina: 8, trecho: 'Vencimento dia 20' }] },
    ];

    api.get.mockImplementation((url) => {
      if (url === '/assistente/conversas') {
        return Promise.resolve({ data: { sucesso: true, dados: conversasMock } });
      }
      if (url === '/assistente/conversas/101/mensagens') {
        return Promise.resolve({ data: { sucesso: true, dados: mensagensMock } });
      }
      return Promise.reject(new Error('URL não encontrada'));
    });

    render(<Assistente />);

    await waitFor(() => {
      expect(screen.getByText('Dúvida sobre DAS e boleto')).toBeInTheDocument();
      expect(screen.getByText('Limite de faturamento anual')).toBeInTheDocument();
    });

    // Clica na primeira conversa
    fireEvent.click(screen.getByText('Dúvida sobre DAS e boleto'));

    await waitFor(() => {
      expect(screen.getByText('Qual a data de vencimento do DAS?')).toBeInTheDocument();
      expect(screen.getByText('O DAS vence todo dia 20 de cada mês.')).toBeInTheDocument();
      expect(screen.getByText(/pág\. 8/i)).toBeInTheDocument();
    });
  });

  test('deve enviar uma nova pergunta e exibir a resposta do assistente com badge de fonte', async () => {
    api.get.mockResolvedValueOnce({
      data: { sucesso: true, dados: [] },
    });

    api.post.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: {
          conversa_id: 201,
          mensagem: {
            id: 99,
            papel: 'assistente',
            conteudo: 'O limite anual de faturamento do MEI é de R$ 81.000,00.',
            fontes: [
              { pagina: 14, arquivo: 'perguntaomei.pdf', trecho: 'Limite proporcional e anual' },
            ],
            criado_em: new Date().toISOString(),
          },
        },
      },
    });

    render(<Assistente />);

    const input = screen.getByPlaceholderText(/digite sua dúvida contábil ou sobre seu negócio\.\.\./i);
    fireEvent.change(input, { target: { value: 'Qual o limite de faturamento do MEI?' } });

    const btnEnviar = screen.getByRole('button', { name: /enviar/i });
    fireEvent.click(btnEnviar);

    // Mensagem do usuário deve ser renderizada na tela imediatamente
    expect(screen.getByText('Qual o limite de faturamento do MEI?')).toBeInTheDocument();

    // Espera a resposta da API ser renderizada
    await waitFor(() => {
      expect(screen.getByText(/O limite anual de faturamento do MEI é de R\$ 81\.000,00\./i)).toBeInTheDocument();
      expect(screen.getByText(/pág\. 14/i)).toBeInTheDocument();
    });

    expect(api.post).toHaveBeenCalledWith('/assistente/mensagens', {
      conversa_id: null,
      mensagem: 'Qual o limite de faturamento do MEI?',
      assincrono: true,
    });
  });

  test('deve executar short-polling quando a resposta inicial vier como "processando"', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/assistente/conversas') {
        return Promise.resolve({ data: { sucesso: true, dados: [] } });
      }
      if (url === '/assistente/mensagens/777/status') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: {
              id: 777,
              conversa_id: 501,
              status: 'concluida',
              conteudo: 'Resposta final obtida com sucesso via short-polling!',
              fontes: [],
            },
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    api.post.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: {
          conversa_id: 501,
          mensagem: {
            id: 777,
            papel: 'assistente',
            status: 'processando',
            conteudo: null,
            fontes: [],
          },
        },
      },
    });

    render(<Assistente />);

    const input = screen.getByPlaceholderText(/digite sua dúvida contábil ou sobre seu negócio\.\.\./i);
    fireEvent.change(input, { target: { value: 'Pergunta assíncrona' } });

    const btnEnviar = screen.getByRole('button', { name: /enviar/i });
    fireEvent.click(btnEnviar);

    // Deve exibir indicador de processando
    await waitFor(() => {
      expect(screen.getByText(/consultando regras oficiais e dados do negócio\.\.\./i)).toBeInTheDocument();
    });

    // Quando o short-polling resolver status 'concluida'
    await waitFor(() => {
      expect(screen.getByText(/Resposta final obtida com sucesso via short-polling!/i)).toBeInTheDocument();
    });
  });

  test('deve tratar erro 503 com mensagem amigável e permitir tentar novamente', async () => {
    api.get.mockResolvedValueOnce({
      data: { sucesso: true, dados: [] },
    });

    api.post.mockRejectedValueOnce({
      response: {
        status: 503,
        data: { mensagem: 'Assistente IA temporariamente indisponível' },
      },
    });

    render(<Assistente />);

    const input = screen.getByPlaceholderText(/digite sua dúvida contábil ou sobre seu negócio\.\.\./i);
    fireEvent.change(input, { target: { value: 'Como funciona o desenquadramento?' } });

    const btnEnviar = screen.getByRole('button', { name: /enviar/i });
    fireEvent.click(btnEnviar);

    await waitFor(() => {
      expect(screen.getByText(/assistente ia temporariamente indisponível/i)).toBeInTheDocument();
    });
  });

  test('deve permitir excluir uma conversa existente', async () => {
    const conversasMock = [
      { id: 301, titulo: 'Conversa a ser deletada', atualizado_em: '2026-10-07T10:00:00Z' },
    ];

    api.get.mockImplementation((url) => {
      if (url === '/assistente/conversas') {
        return Promise.resolve({ data: { sucesso: true, dados: conversasMock } });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    api.delete.mockResolvedValueOnce({ status: 204 });

    render(<Assistente />);

    await waitFor(() => {
      expect(screen.getByText('Conversa a ser deletada')).toBeInTheDocument();
    });

    const btnExcluir = screen.getByLabelText(/excluir conversa/i);
    fireEvent.click(btnExcluir);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/assistente/conversas/301');
    });
  });

  test('deve exibir o badge WhatsApp nas conversas originadas no canal whatsapp', async () => {
    const conversasMock = [
      { id: 401, titulo: 'WhatsApp - Assistente Aranduê', canal: 'whatsapp', atualizado_em: '2026-10-15T10:00:00Z' },
    ];

    api.get.mockImplementation((url) => {
      if (url === '/assistente/conversas') {
        return Promise.resolve({ data: { sucesso: true, dados: conversasMock } });
      }
      if (url === '/assistente/conversas/401/mensagens') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: [{ id: 10, papel: 'usuario', conteudo: 'Quanto tenho em caixa?', fontes: [] }],
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(<Assistente />);

    expect(await screen.findByText('WhatsApp - Assistente Aranduê')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();

    fireEvent.click(screen.getByText('WhatsApp - Assistente Aranduê'));

    expect(await screen.findByText('Canal WhatsApp')).toBeInTheDocument();
  });

  test('deve renderizar mensagens com indicadores de áudio e imagem no histórico', async () => {
    const conversasMock = [
      { id: 601, titulo: 'Conversa Multimodal', atualizado_em: '2026-10-15T10:00:00Z' },
    ];
    const mensagensMock = [
      {
        id: 1,
        papel: 'usuario',
        conteudo: 'Áudio gravado',
        tipo_midia: 'audio',
        fontes: [],
      },
      {
        id: 2,
        papel: 'assistente',
        conteudo: 'Entendi seu áudio! Seu saldo atual é R$ 1.500,00.',
        fontes: [],
      },
      {
        id: 3,
        papel: 'usuario',
        conteudo: 'Veja esta nota fiscal',
        tipo_midia: 'imagem',
        midia_preview: 'data:image/png;base64,fakeimage',
        fontes: [],
      },
    ];

    api.get.mockImplementation((url) => {
      if (url === '/assistente/conversas') {
        return Promise.resolve({ data: { sucesso: true, dados: conversasMock } });
      }
      if (url === '/assistente/conversas/601/mensagens') {
        return Promise.resolve({ data: { sucesso: true, dados: mensagensMock } });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(<Assistente />);

    expect(await screen.findByText('Conversa Multimodal')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Conversa Multimodal'));

    expect(await screen.findByText('Mensagem de Voz')).toBeInTheDocument();
    expect(screen.getByText('Entendi seu áudio! Seu saldo atual é R$ 1.500,00.')).toBeInTheDocument();
    expect(screen.getByText('Imagem Anexada')).toBeInTheDocument();
    expect(screen.getByAltText('Pré-visualização')).toHaveAttribute('src', 'data:image/png;base64,fakeimage');
  });

  test('deve permitir anexar imagem e enviá-la para o assistente', async () => {
    api.get.mockResolvedValueOnce({
      data: { sucesso: true, dados: [] },
    });
    api.post.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: {
          conversa_id: 701,
          mensagem: {
            id: 888,
            papel: 'assistente',
            conteudo: 'Recebi o comprovante e registrei a receita.',
            fontes: [],
            criado_em: new Date().toISOString(),
          },
        },
      },
    });

    const fakeBase64 = 'data:image/png;base64,mockedimgdata';
    class MockFileReader {
      readAsDataURL() {
        this.result = fakeBase64;
        if (this.onload) this.onload();
      }
    }
    const originalFileReader = window.FileReader;
    window.FileReader = MockFileReader;

    try {
      render(<Assistente />);

      const fileInput = screen.getByLabelText(/upload de imagem/i);
      const file = new File(['fake-image-content'], 'comprovante.png', { type: 'image/png' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('comprovante.png')).toBeInTheDocument();
      });

      const btnEnviar = screen.getByRole('button', { name: /enviar/i });
      fireEvent.click(btnEnviar);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/assistente/mensagens',
          expect.objectContaining({
            mensagem: 'Analise esta imagem enviada.',
            tipo_midia: 'imagem',
            midia: {
              tipo: 'imagem',
              dados_base64: fakeBase64,
              mime_type: 'image/png',
            },
            assincrono: true,
          })
        );
      });
    } finally {
      window.FileReader = originalFileReader;
    }
  });

  test('deve permitir remover imagem anexada antes de enviar', async () => {
    api.get.mockResolvedValueOnce({
      data: { sucesso: true, dados: [] },
    });

    const fakeBase64 = 'data:image/jpeg;base64,recibo';
    class MockFileReader {
      readAsDataURL() {
        this.result = fakeBase64;
        if (this.onload) this.onload();
      }
    }
    const originalFileReader = window.FileReader;
    window.FileReader = MockFileReader;

    try {
      render(<Assistente />);

      const fileInput = screen.getByLabelText(/upload de imagem/i);
      const file = new File(['recibo-bytes'], 'recibo.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('recibo.jpg')).toBeInTheDocument();
      });

      const btnRemover = screen.getByLabelText(/remover anexo/i);
      fireEvent.click(btnRemover);

      await waitFor(() => {
        expect(screen.queryByText('recibo.jpg')).not.toBeInTheDocument();
      });
    } finally {
      window.FileReader = originalFileReader;
    }
  });

  test('deve iniciar gravação de áudio e permitir cancelamento', async () => {
    api.get.mockResolvedValueOnce({
      data: { sucesso: true, dados: [] },
    });

    const mockStream = {
      getTracks: vi.fn(() => [{ stop: vi.fn() }]),
    };
    navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
    };

    class MockMediaRecorder {
      constructor(stream) {
        this.stream = stream;
        this.state = 'recording';
        this.ondataavailable = null;
        this.onstop = null;
      }
      start() {}
      stop() {
        this.state = 'inactive';
        if (this.onstop) this.onstop();
      }
    }
    window.MediaRecorder = MockMediaRecorder;

    const fakeBase64 = 'data:audio/webm;base64,mockedaudio';
    class MockFileReader {
      readAsDataURL() {
        this.result = fakeBase64;
        if (this.onloadend) this.onloadend();
      }
    }
    const originalFileReader = window.FileReader;
    window.FileReader = MockFileReader;

    try {
      render(<Assistente />);

      const btnGravar = screen.getByLabelText(/gravar áudio/i);
      fireEvent.click(btnGravar);

      await waitFor(() => {
        expect(screen.getByText(/gravando mensagem de voz/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /concluir/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

      await waitFor(() => {
        expect(screen.queryByText(/gravando mensagem de voz/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/áudio gravado pronto para envio/i)).not.toBeInTheDocument();
      });
    } finally {
      window.FileReader = originalFileReader;
    }
  });

  test('deve permitir concluir gravação de áudio e anexar para envio', async () => {
    api.get.mockResolvedValueOnce({
      data: { sucesso: true, dados: [] },
    });

    const mockStream = {
      getTracks: vi.fn(() => [{ stop: vi.fn() }]),
    };
    navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
    };

    class MockMediaRecorder {
      constructor(stream) {
        this.stream = stream;
        this.mimeType = 'audio/webm';
        this.state = 'recording';
        this.ondataavailable = null;
        this.onstop = null;
      }
      start() {}
      stop() {
        this.state = 'inactive';
        if (this.onstop) this.onstop();
      }
    }
    window.MediaRecorder = MockMediaRecorder;

    const fakeBase64 = 'data:audio/webm;base64,gravaudio';
    class MockFileReader {
      readAsDataURL() {
        this.result = fakeBase64;
        if (this.onloadend) this.onloadend();
      }
    }
    const originalFileReader = window.FileReader;
    window.FileReader = MockFileReader;

    try {
      render(<Assistente />);

      const btnGravar = screen.getByLabelText(/gravar áudio/i);
      fireEvent.click(btnGravar);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /concluir/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /concluir/i }));

      await waitFor(() => {
        expect(screen.getByText(/áudio gravado pronto para envio/i)).toBeInTheDocument();
      });
    } finally {
      window.FileReader = originalFileReader;
    }
  });
});

