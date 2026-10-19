import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import LandingPage from './LandingPage';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { ChatProvider } from '../context/ChatContext';
import { AppRoutes } from '../App';

// Mock da API para evitar chamadas de rede indesejadas durante os testes
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { sucesso: true, dados: [] } }),
    post: vi.fn().mockResolvedValue({ data: { sucesso: true, dados: {} } }),
    put: vi.fn().mockResolvedValue({ data: { sucesso: true, dados: {} } }),
    delete: vi.fn().mockResolvedValue({ data: { sucesso: true } }),
  },
}));

// Mock do Firebase para caso Login seja renderizado via redirecionamento
vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(() => ({
    setCustomParameters: vi.fn(),
  })),
  getAuth: vi.fn(),
}));

vi.mock('../services/firebase', () => ({
  auth: {},
  googleProvider: {},
}));

let isMobile = false;
vi.mock('../utils/device', () => ({
  isMobileDevice: () => isMobile,
  isMobileEnvironment: () => isMobile,
}));

describe('LandingPage - Estilo Desenhado à Mão', () => {
  beforeEach(() => {
    isMobile = false;
  });
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme-id');
    document.documentElement.removeAttribute('data-theme-mode');
  });

  test('deve renderizar o hero ilustrado, blocos assimétricos, anéis tracejados e CTAs de acesso', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <LandingPage />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /ARANDUÊ/i })).toBeInTheDocument();
    expect(screen.getByText(/VOCÊ FOCA NO SEU CORRE/i)).toBeInTheDocument();
    expect(screen.getByText(/MENTES CRIATIVAS/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /entrar/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /começar grátis|criar conta/i }).length).toBeGreaterThan(0);
  });

  test('deve renderizar os links editoriais de navegação e demonstração na landing page', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <LandingPage />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getAllByRole('link', { name: /como funciona/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /superpoderes ia/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /demonstração atendente ia/i }).length).toBeGreaterThan(0);
  });

  test('visitante não autenticado acessando a raiz / deve visualizar a LandingPage diretamente', async () => {
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('usuario');

    render(
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
              <AppRoutes />
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /ARANDUÊ/i })).toBeInTheDocument();
      expect(screen.getByText(/VOCÊ FOCA NO SEU CORRE/i)).toBeInTheDocument();
    });
  });

  test('acesso à rota pública /landing deve renderizar a LandingPage', async () => {
    render(
      <MemoryRouter initialEntries={['/landing']}>
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
              <AppRoutes />
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /ARANDUÊ/i })).toBeInTheDocument();
    });
  });

  test('visitante não autenticado acessando rota protegida (/clientes) deve ser redirecionado para /login', async () => {
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('usuario');

    render(
      <MemoryRouter initialEntries={['/clientes']}>
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
              <AppRoutes />
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
    });
  });

  test('dispositivo móvel não autenticado acessando raiz / deve ser redirecionado para /login e nunca para LandingPage', async () => {
    isMobile = true;
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('usuario');

    render(
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
              <AppRoutes />
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /superpoderes ia/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /demonstração atendente ia/i })).not.toBeInTheDocument();
    });
  });

  test('dispositivo móvel tentando acessar rota /landing diretamente deve ser redirecionado para /login', async () => {
    isMobile = true;

    render(
      <MemoryRouter initialEntries={['/landing']}>
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
              <AppRoutes />
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /superpoderes ia/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /demonstração atendente ia/i })).not.toBeInTheDocument();
    });
  });
});
