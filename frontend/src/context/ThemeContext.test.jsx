import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider, useTheme, applyThemeToDOM } from './ThemeContext';

let mockTemas = [];

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockImplementation((url) => {
      if (url === '/configuracoes/temas') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: mockTemas,
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    }),
    put: vi.fn().mockImplementation((url) => {
      if (url.includes('/ativar')) {
        const idMatch = url.match(/\/temas\/(.+)\/ativar/);
        const id = idMatch ? idMatch[1] : null;
        let ativado = null;
        mockTemas = mockTemas.map((t) => {
          if (String(t.id) === String(id) || t.slug === id) {
            ativado = { ...t, eh_ativo: true };
            return ativado;
          }
          return { ...t, eh_ativo: false };
        });
        if (!ativado && id === '2') {
          ativado = {
            id: 2,
            nome: 'Escuro Aranduê',
            modo: 'dark',
            eh_ativo: true,
            tokens: {
              bgApp: '#0f172a',
              bgSurface: '#1e293b',
              border: '#334155',
              textMain: '#f8fafc',
              textSecondary: '#94a3b8',
              primary: '#6366f1',
              accent: '#38bdf8',
            },
          };
          mockTemas.push(ativado);
        }
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: ativado,
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true } });
    }),
    post: vi.fn().mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          id: 3,
          nome: 'Tema Customizado',
          modo: 'light',
          tokens: {
            bgApp: '#ffffff',
            primary: '#10b981',
          },
        },
      },
    }),
    delete: vi.fn().mockResolvedValue({
      data: { sucesso: true },
    }),
  },
}));

function ComponenteTeste() {
  const { temaAtual, temas, carregando, ativarTema, uploadTema, gerarTemaIA, excluirTema, exportarTema } = useTheme();
  return (
    <div>
      {carregando && <span data-testid="carregando">Carregando...</span>}
      <div data-testid="nome-tema">{temaAtual?.nome}</div>
      <div data-testid="modo-tema">{temaAtual?.modo}</div>
      <div data-testid="total-temas">{temas.length}</div>
      <button data-testid="btn-ativar" onClick={() => ativarTema(2)}>Ativar 2</button>
      <button data-testid="btn-upload" onClick={() => uploadTema({ nome: 'Importado' })}>Upload</button>
      <button data-testid="btn-gerar" onClick={() => gerarTemaIA('Tema Roxo', 'dark', '#7c3aed')}>Gerar IA</button>
      <button data-testid="btn-excluir" onClick={() => excluirTema(3)}>Excluir</button>
      <button data-testid="btn-exportar" onClick={() => exportarTema()}>Exportar</button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.cssText = '';

    mockTemas = [
      {
        id: 1,
        nome: 'Claro Aranduê',
        modo: 'light',
        eh_ativo: true,
        tokens: {
          bgApp: '#f8fafc',
          bgSurface: '#ffffff',
          bgSurfaceHover: '#f1f5f9',
          border: '#e2e8f0',
          textMain: '#0f172a',
          textSecondary: '#64748b',
          textMuted: '#94a3b8',
          primary: '#4f46e5',
          primaryHover: '#4338ca',
          primaryText: '#ffffff',
          accent: '#f59e0b',
          status: {
            success: '#10b981',
            danger: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6',
          },
        },
      },
      {
        id: 2,
        nome: 'Escuro Aranduê',
        modo: 'dark',
        eh_ativo: false,
        tokens: {
          bgApp: '#0f172a',
          bgSurface: '#1e293b',
          border: '#334155',
          textMain: '#f8fafc',
          textSecondary: '#94a3b8',
          primary: '#6366f1',
          accent: '#38bdf8',
        },
      },
    ];
  });

  it('deve fornecer o tema inicial e injetar variáveis CSS no root', async () => {
    render(
      <ThemeProvider>
        <ComponenteTeste />
      </ThemeProvider>
    );

    const elemento = await screen.findByTestId('nome-tema');
    expect(elemento.textContent).toBe('Claro Aranduê');
    expect(document.documentElement.style.getPropertyValue('--bg-app')).toBe('#f8fafc');
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#4f46e5');
  });

  it('deve inicializar com tema em cache no localStorage se disponível', async () => {
    const cachedTheme = {
      id: 2,
      nome: 'Escuro Aranduê',
      modo: 'dark',
      tokens: {
        bgApp: '#0f172a',
        primary: '#6366f1',
      },
    };
    localStorage.setItem('arandue_tema_ativo', JSON.stringify(cachedTheme));

    mockTemas[0].eh_ativo = false;
    mockTemas[1].eh_ativo = true;

    render(
      <ThemeProvider>
        <ComponenteTeste />
      </ThemeProvider>
    );

    // Imediatamente sincronizado sem FOUC
    expect(screen.getByTestId('nome-tema').textContent).toBe('Escuro Aranduê');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--bg-app')).toBe('#0f172a');

    await screen.findByTestId('nome-tema');
  });

  it('deve ativar um novo tema e atualizar CSS variables e classe dark', async () => {
    render(
      <ThemeProvider>
        <ComponenteTeste />
      </ThemeProvider>
    );

    await screen.findByTestId('nome-tema');

    await act(async () => {
      screen.getByTestId('btn-ativar').click();
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--bg-app')).toBe('#0f172a');
    expect(screen.getByTestId('nome-tema').textContent).toBe('Escuro Aranduê');
  });

  it('applyThemeToDOM deve injetar variáveis padrão quando tokens forem incompletos', () => {
    applyThemeToDOM({
      modo: 'dark',
      tokens: {},
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--bg-app')).toBe('#f8fafc');
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#4f46e5');
  });

  it('deve chamar uploadTema, gerarTemaIA, excluirTema e exportarTema', async () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/teste');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    const clickMock = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clickMock);

    render(
      <ThemeProvider>
        <ComponenteTeste />
      </ThemeProvider>
    );

    await screen.findByTestId('nome-tema');

    await act(async () => {
      screen.getByTestId('btn-upload').click();
    });

    await act(async () => {
      screen.getByTestId('btn-gerar').click();
    });

    await act(async () => {
      screen.getByTestId('btn-excluir').click();
    });

    await act(async () => {
      screen.getByTestId('btn-exportar').click();
    });

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalled();

    HTMLAnchorElement.prototype.click.mockRestore();
  });
});
