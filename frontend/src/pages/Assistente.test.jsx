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

  test('deve aplicar tokens dinâmicos de tema na área de conversa e container', async () => {
    api.get.mockResolvedValueOnce({
      data: { sucesso: true, dados: [] },
    });

    const { container } = render(<Assistente />);

    await waitFor(() => {
      expect(screen.getByText(/como posso ajudar o seu negócio hoje\?/i)).toBeInTheDocument();
    });

    // Container principal deve ter classes do tema
    const outerContainer = container.querySelector('.theme-card');
    expect(outerContainer).toBeInTheDocument();
    expect(outerContainer).toHaveStyle({ backgroundColor: 'var(--bg-surface)' });

    // Área de mensagens (canvas da conversa) deve adotar var(--bg-app)
    const mainChatArea = container.querySelector('main');
    expect(mainChatArea).toBeInTheDocument();
    expect(mainChatArea).toHaveStyle({ backgroundColor: 'var(--bg-app)' });
  });

  test('deve permitir abrir e fechar o drawer de histórico de conversas no mobile', async () => {
    api.get.mockResolvedValueOnce({
      data: { sucesso: true, dados: [] },
    });

    render(<Assistente />);

    await waitFor(() => {
      expect(screen.getByText(/como posso ajudar o seu negócio hoje\?/i)).toBeInTheDocument();
    });

    const btnAbrirDrawer = screen.getByRole('button', { name: /abrir histórico de conversas/i });
    expect(btnAbrirDrawer).toBeInTheDocument();

    const aside = screen.getByRole('complementary');
    expect(aside).toHaveClass('-translate-x-full');

    // Abre o drawer no mobile
    fireEvent.click(btnAbrirDrawer);
    expect(aside).toHaveClass('translate-x-0');

    // Fecha pelo botão X
    const btnFechar = screen.getByRole('button', { name: /fechar histórico/i });
    fireEvent.click(btnFechar);
    expect(aside).toHaveClass('-translate-x-full');
  });

  test('deve fechar o drawer móvel ao selecionar uma conversa ou iniciar nova', async () => {
    const conversasMock = [
      { id: 301, titulo: 'Conversa Teste Mobile', atualizado_em: '2026-10-07T12:00:00Z' },
    ];
    api.get.mockImplementation((url) => {
      if (url === '/assistente/conversas') {
        return Promise.resolve({ data: { sucesso: true, dados: conversasMock } });
      }
      if (url === '/assistente/conversas/301/mensagens') {
        return Promise.resolve({ data: { sucesso: true, dados: [] } });
      }
      return Promise.reject(new Error('URL não encontrada'));
    });

    render(<Assistente />);

    await waitFor(() => {
      expect(screen.getByText('Conversa Teste Mobile')).toBeInTheDocument();
    });

    const btnAbrirDrawer = screen.getByRole('button', { name: /abrir histórico de conversas/i });
    const aside = screen.getByRole('complementary');

    // Abre o drawer
    fireEvent.click(btnAbrirDrawer);
    expect(aside).toHaveClass('translate-x-0');

    // Clica na conversa -> deve fechar o drawer
    fireEvent.click(screen.getByText('Conversa Teste Mobile'));
    expect(aside).toHaveClass('-translate-x-full');

    // Abre de novo e clica em "Nova conversa" -> deve fechar
    fireEvent.click(btnAbrirDrawer);
    expect(aside).toHaveClass('translate-x-0');
    fireEvent.click(screen.getByRole('button', { name: /nova conversa/i }));
    expect(aside).toHaveClass('-translate-x-full');
  });

  test('deve aplicar classes responsivas que removem a aparência de modal no mobile', async () => {
    api.get.mockResolvedValueOnce({
      data: { sucesso: true, dados: [] },
    });

    const { container } = render(<Assistente />);

    await waitFor(() => {
      expect(screen.getByText(/como posso ajudar o seu negócio hoje\?/i)).toBeInTheDocument();
    });

    const outerContainer = container.querySelector('.theme-card');
    expect(outerContainer).toBeInTheDocument();
    expect(outerContainer).toHaveClass('rounded-none', 'md:rounded-2xl');
    expect(outerContainer).toHaveClass('shadow-none', 'md:shadow-lg');
    expect(outerContainer).toHaveClass('border-0', 'md:border');
    expect(outerContainer).toHaveClass('h-[calc(100dvh-4rem)]', 'md:h-[calc(85vh)]');
    expect(outerContainer).toHaveClass('min-h-0', 'md:min-h-[520px]');
  });

  test('deve atualizar e aplicar o tema dinamicamente quando o assistente alterar o tema via tools ou resposta', async () => {
    let temaAtivo = {
      id: 1,
      nome: 'Claro Aranduê',
      modo: 'light',
      eh_ativo: true,
      tokens: {
        bgApp: '#f8fafc',
        primary: '#4f46e5',
      },
    };

    api.get.mockImplementation((url) => {
      if (url === '/assistente/conversas') {
        return Promise.resolve({ data: { sucesso: true, dados: [] } });
      }
      if (url === '/configuracoes/temas') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: [
              { ...temaAtivo, eh_ativo: temaAtivo.id === 1 },
              {
                id: 2,
                nome: 'Escuro Aranduê',
                modo: 'dark',
                eh_ativo: temaAtivo.id === 2,
                tokens: {
                  bgApp: '#0f172a',
                  primary: '#6366f1',
                },
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    api.post.mockImplementation((url) => {
      if (url === '/assistente/mensagens') {
        // Ao executar a mensagem do assistente, o tema ativo no backend passa a ser escuro
        temaAtivo = {
          id: 2,
          nome: 'Escuro Aranduê',
          modo: 'dark',
          eh_ativo: true,
          tokens: {
            bgApp: '#0f172a',
            primary: '#6366f1',
          },
        };
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: {
              conversa_id: 999,
              mensagem: {
                id: 1234,
                papel: 'assistente',
                status: 'concluida',
                conteudo: "Tema 'Escuro Aranduê' ativado com sucesso!",
                tools_usadas: ['ativar_tema'],
                fontes: [],
                criado_em: new Date().toISOString(),
              },
            },
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true } });
    });

    const { ThemeProvider } = await import('../context/ThemeContext');

    render(
      <ThemeProvider>
        <Assistente />
      </ThemeProvider>
    );

    const input = await screen.findByPlaceholderText(/digite sua dúvida contábil ou sobre seu negócio\.\.\./i);
    fireEvent.change(input, { target: { value: 'muda para o tema escuro' } });

    const btnEnviar = screen.getByRole('button', { name: /enviar/i });
    fireEvent.click(btnEnviar);

    await waitFor(() => {
      expect(screen.getByText(/Tema 'Escuro Aranduê' ativado com sucesso!/i)).toBeInTheDocument();
    });

    // O tema deve ter sido atualizado no DOM imediatamente sem precisar navegar até /configuracoes
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.style.getPropertyValue('--bg-app')).toBe('#0f172a');
    });
  });

  test('deve atualizar o tema imediatamente após short-polling quando a IA ativar o tema de forma assíncrona', async () => {
    let temaAtivo = {
      id: 1,
      nome: 'Claro Aranduê',
      modo: 'light',
      eh_ativo: true,
      tokens: {
        bgApp: '#f8fafc',
        primary: '#4f46e5',
      },
    };

    api.get.mockImplementation((url) => {
      if (url === '/assistente/conversas') {
        return Promise.resolve({ data: { sucesso: true, dados: [] } });
      }
      if (url === '/configuracoes/temas') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: [
              { ...temaAtivo, eh_ativo: temaAtivo.id === 1 },
              {
                id: 2,
                nome: 'Escuro Aranduê',
                modo: 'dark',
                eh_ativo: temaAtivo.id === 2,
                tokens: {
                  bgApp: '#0f172a',
                  primary: '#6366f1',
                },
              },
            ],
          },
        });
      }
      if (url === '/assistente/mensagens/4321/status') {
        temaAtivo = {
          id: 2,
          nome: 'Escuro Aranduê',
          modo: 'dark',
          eh_ativo: true,
          tokens: {
            bgApp: '#0f172a',
            primary: '#6366f1',
          },
        };
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: {
              id: 4321,
              conversa_id: 888,
              status: 'concluida',
              conteudo: "Tema 'Escuro Aranduê' (dark) ativado com sucesso em todo o sistema!",
              tools_usadas: ['ativar_tema'],
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
          conversa_id: 888,
          mensagem: {
            id: 4321,
            papel: 'assistente',
            status: 'processando',
            conteudo: null,
            fontes: [],
          },
        },
      },
    });

    const { ThemeProvider } = await import('../context/ThemeContext');

    render(
      <ThemeProvider>
        <Assistente />
      </ThemeProvider>
    );

    const input = await screen.findByPlaceholderText(/digite sua dúvida contábil ou sobre seu negócio\.\.\./i);
    fireEvent.change(input, { target: { value: 'quero ativar o tema escuro' } });

    const btnEnviar = screen.getByRole('button', { name: /enviar/i });
    fireEvent.click(btnEnviar);

    await waitFor(() => {
      expect(screen.getByText(/Tema 'Escuro Aranduê' \(dark\) ativado com sucesso em todo o sistema!/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.style.getPropertyValue('--bg-app')).toBe('#0f172a');
    });
  });

  test('deve acionar a síntese de voz (Web Speech API) quando preferencia_resposta for "audio" ou ao clicar no botão de ouvir', async () => {
    const mockSpeak = vi.fn();
    const mockCancel = vi.fn();
    window.speechSynthesis = {
      speak: mockSpeak,
      cancel: mockCancel,
    };
    window.SpeechSynthesisUtterance = vi.fn().mockImplementation(function (text) {
      this.text = text;
      this.lang = 'pt-BR';
    });

    const mensagensMock = [
      { id: 1, papel: 'usuario', conteudo: 'Qual meu saldo atual?', fontes: [] },
      { id: 2, papel: 'assistente', status: 'concluida', conteudo: 'Seu saldo atual em caixa é de R$ 1.500,00.', fontes: [] },
    ];

    api.get.mockImplementation((url) => {
      if (url === '/configuracoes') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: { preferencia_resposta: 'audio' },
          },
        });
      }
      if (url === '/assistente/conversas') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: [{ id: 99, titulo: 'Consulta de Caixa', atualizado_em: '2026-10-07T12:00:00Z' }],
          },
        });
      }
      if (url === '/assistente/conversas/99/mensagens') {
        return Promise.resolve({
          data: { sucesso: true, dados: mensagensMock },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(<Assistente />);

    // Clica na conversa existente
    const conversaBtn = await screen.findByText('Consulta de Caixa');
    fireEvent.click(conversaBtn);

    // Mensagem do assistente é exibida
    expect(await screen.findByText(/Seu saldo atual em caixa é de R\$ 1\.500,00\./i)).toBeInTheDocument();

    // Botão de ouvir resposta por voz deve estar presente
    const btnOuvir = screen.getByRole('button', { name: /ouvir resposta/i });
    expect(btnOuvir).toBeInTheDocument();

    fireEvent.click(btnOuvir);
    expect(mockSpeak).toHaveBeenCalled();
  });

  test('deve renderizar o player de áudio e transcrição colapsável quando o assistente responder em modo apenas áudio', async () => {
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();

    const mensagensMock = [
      { id: 1, papel: 'usuario', conteudo: 'Qual meu saldo?', fontes: [] },
      {
        id: 2,
        papel: 'assistente',
        tipo_midia: 'audio',
        audio_base64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        conteudo: 'Seu saldo atual é de R$ 3.420,50.',
        status: 'concluida',
        fontes: [],
      },
    ];

    api.get.mockImplementation((url) => {
      if (url === '/assistente/conversas') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: [{ id: 50, titulo: 'Consulta Saldo Áudio' }],
          },
        });
      }
      if (url === '/assistente/conversas/50/mensagens') {
        return Promise.resolve({
          data: { sucesso: true, dados: mensagensMock },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(<Assistente />);

    const conversaBtn = await screen.findByText('Consulta Saldo Áudio');
    fireEvent.click(conversaBtn);

    // Player de áudio interativo deve estar presente
    const btnPlay = await screen.findByRole('button', { name: /reproduzir áudio/i });
    expect(btnPlay).toBeInTheDocument();

    // Botão de transcrição colapsável deve estar presente
    const btnTranscricao = screen.getByRole('button', { name: /ver transcrição/i });
    expect(btnTranscricao).toBeInTheDocument();

    // A transcrição deve estar oculta inicialmente no modo áudio
    expect(screen.queryByText('Seu saldo atual é de R$ 3.420,50.')).not.toBeInTheDocument();

    // Ao clicar em 'Ver transcrição', exibe o texto
    fireEvent.click(btnTranscricao);
    expect(await screen.findByText('Seu saldo atual é de R$ 3.420,50.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ocultar transcrição/i })).toBeInTheDocument();

    // Ao clicar em 'Ocultar transcrição', esconde o texto novamente
    fireEvent.click(screen.getByRole('button', { name: /ocultar transcrição/i }));
    expect(screen.queryByText('Seu saldo atual é de R$ 3.420,50.')).not.toBeInTheDocument();
  });

  test('deve renderizar player de áudio e texto simultaneamente quando a resposta for no modo ambos', async () => {
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();

    const mensagensMock = [
      { id: 1, papel: 'usuario', conteudo: 'Resumo geral', fontes: [] },
      {
        id: 2,
        papel: 'assistente',
        tipo_midia: 'texto',
        audio_base64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        conteudo: 'Aqui está seu resumo completo com métricas do mês.',
        status: 'concluida',
        fontes: [],
      },
    ];

    api.get.mockImplementation((url) => {
      if (url === '/assistente/conversas') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: [{ id: 51, titulo: 'Consulta Modo Ambos' }],
          },
        });
      }
      if (url === '/assistente/conversas/51/mensagens') {
        return Promise.resolve({
          data: { sucesso: true, dados: mensagensMock },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(<Assistente />);

    const conversaBtn = await screen.findByText('Consulta Modo Ambos');
    fireEvent.click(conversaBtn);

    // Player de áudio deve estar presente
    const btnPlay = await screen.findByRole('button', { name: /reproduzir áudio/i });
    expect(btnPlay).toBeInTheDocument();

    // No modo ambos, o texto fica visível imediatamente (sem botão de transcrição colapsável obrigatório)
    expect(await screen.findByText('Aqui está seu resumo completo com métricas do mês.')).toBeInTheDocument();
  });

  test('deve permitir reproduzir e pausar o áudio do assistente pelo player interativo', async () => {
    const playMock = vi.fn().mockResolvedValue(undefined);
    const pauseMock = vi.fn();
    window.HTMLMediaElement.prototype.play = playMock;
    window.HTMLMediaElement.prototype.pause = pauseMock;

    const mensagensMock = [
      {
        id: 2,
        papel: 'assistente',
        tipo_midia: 'audio',
        audio_base64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        conteudo: 'Resposta em áudio sintetizada.',
        status: 'concluida',
        fontes: [],
      },
    ];

    api.get.mockImplementation((url) => {
      if (url === '/assistente/conversas') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: [{ id: 52, titulo: 'Teste Player Áudio' }],
          },
        });
      }
      if (url === '/assistente/conversas/52/mensagens') {
        return Promise.resolve({
          data: { sucesso: true, dados: mensagensMock },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(<Assistente />);

    const conversaBtn = await screen.findByText('Teste Player Áudio');
    fireEvent.click(conversaBtn);

    const btnPlay = await screen.findByRole('button', { name: /reproduzir áudio/i });
    fireEvent.click(btnPlay);

    // Deve chamar play no elemento de áudio
    expect(playMock).toHaveBeenCalled();

    // Botão agora deve alternar para pausar áudio
    const btnPause = await screen.findByRole('button', { name: /pausar áudio/i });
    expect(btnPause).toBeInTheDocument();

    fireEvent.click(btnPause);
    expect(pauseMock).toHaveBeenCalled();
  });

  test('deve atualizar audio_base64 e renderizar player interativo após conclusão de short-polling', async () => {
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();

    api.get.mockImplementation((url) => {
      if (url === '/assistente/conversas') {
        return Promise.resolve({ data: { sucesso: true, dados: [] } });
      }
      if (url === '/assistente/mensagens/888/status') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: {
              id: 888,
              status: 'concluida',
              conteudo: 'Áudio gerado com sucesso via short-polling.',
              tipo_midia: 'audio',
              audio_base64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
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
          conversa_id: 300,
          mensagem: {
            id: 888,
            papel: 'assistente',
            status: 'processando',
            conteudo: null,
          },
        },
      },
    });

    render(<Assistente />);

    const input = screen.getByPlaceholderText(/digite sua dúvida contábil ou sobre seu negócio\.\.\./i);
    fireEvent.change(input, { target: { value: 'Pergunta assíncrona com áudio' } });

    const btnEnviar = screen.getByRole('button', { name: /enviar/i });
    fireEvent.click(btnEnviar);

    // Após conclusão do polling, o player de áudio deve ser renderizado
    const btnPlay = await screen.findByRole('button', { name: /reproduzir áudio/i });
    expect(btnPlay).toBeInTheDocument();

    // E a transcrição colapsável deve estar presente
    const btnTranscricao = screen.getByRole('button', { name: /ver transcrição/i });
    expect(btnTranscricao).toBeInTheDocument();
  });
});


