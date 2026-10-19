import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, test, expect, vi } from 'vitest';
import Login from './Login';
import { AuthProvider } from '../context/AuthContext';

import { signInWithPopup } from 'firebase/auth';
import api from '../services/api';

const mockSignInWithGoogle = vi.fn();
let isNativePlatform = false;

vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      isNativePlatform: () => isNativePlatform,
    },
  };
});

vi.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: {
    signInWithGoogle: (...args) => mockSignInWithGoogle(...args),
  },
}));

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

// Mock do Firebase Auth
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
  getFirebaseAuth: () => ({}),
  getGoogleProvider: () => ({}),
}));

describe('Tela de Login', () => {
  test('deve renderizar campos de email, senha, botão do Google e botão entrar', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continuar com o google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  test('deve alternar a visibilidade da senha ao clicar no botão do olho', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    const inputSenha = screen.getByLabelText(/senha/i);
    expect(inputSenha).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByLabelText(/exibir caracteres/i);
    fireEvent.click(toggleBtn);
    expect(inputSenha).toHaveAttribute('type', 'text');

    const toggleBtnOcultar = screen.getByLabelText(/ocultar caracteres/i);
    fireEvent.click(toggleBtnOcultar);
    expect(inputSenha).toHaveAttribute('type', 'password');
  });

  test('deve exibir elementos de personalidade e modularidade (Livro Caixa, Notas Fiscais e Assistente)', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/Livro Caixa/i)).toBeInTheDocument();
    expect(screen.getByText(/Notas Fiscais/i)).toBeInTheDocument();
    expect(screen.getByText(/Assistente Virtual Aranduê/i)).toBeInTheDocument();
  });

  test('deve possuir isolamento de tema (theme-isolated) e desativar modo escuro temporariamente', () => {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme-mode', 'dark');

    const { unmount, container } = render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    const loginRoot = container.querySelector('.theme-isolated');
    expect(loginRoot).toBeInTheDocument();
    expect(loginRoot).toHaveStyle({ backgroundColor: 'rgb(255, 255, 255)' });

    // Modo escuro deve ser desativado temporariamente na tela de login
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Ao desmontar a tela de login, o tema anterior deve ser restaurado
    unmount();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('deve realizar login Google na Web via signInWithPopup quando Capacitor não for nativo', async () => {
    isNativePlatform = false;
    signInWithPopup.mockResolvedValueOnce({
      user: {
        email: 'usuario.web@mei.com',
        displayName: 'Usuário Web',
        photoURL: 'https://foto.com/perfil.jpg',
        uid: 'google-uid-web',
      },
    });

    api.post.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: {
          token: 'jwt-token-google-web',
          usuario: { id: 10, nome: 'Usuário Web', email: 'usuario.web@mei.com' },
        },
      },
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    const btnGoogle = screen.getByRole('button', { name: /continuar com o google/i });
    fireEvent.click(btnGoogle);

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalled();
      expect(mockSignInWithGoogle).not.toHaveBeenCalled();
      expect(api.post).toHaveBeenCalledWith('/auth/google', expect.objectContaining({
        email: 'usuario.web@mei.com',
      }));
    });
  });

  test('deve realizar login Google nativo via FirebaseAuthentication no Android/iOS', async () => {
    isNativePlatform = true;
    mockSignInWithGoogle.mockResolvedValueOnce({
      user: {
        email: 'usuario.mobile@mei.com',
        displayName: 'Usuário Mobile',
        photoUrl: 'https://foto.com/mobile.jpg',
        uid: 'google-uid-mobile',
      },
    });

    api.post.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: {
          token: 'jwt-token-google-mobile',
          usuario: { id: 11, nome: 'Usuário Mobile', email: 'usuario.mobile@mei.com' },
        },
      },
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    const btnGoogle = screen.getByRole('button', { name: /continuar com o google/i });
    fireEvent.click(btnGoogle);

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled();
      expect(api.post).toHaveBeenCalledWith('/auth/google', expect.objectContaining({
        email: 'usuario.mobile@mei.com',
      }));
    });
  });

  test('deve exibir mensagem amigável solicitando cadastro prévio quando o backend retornar erro 404', async () => {
    isNativePlatform = false;
    signInWithPopup.mockResolvedValueOnce({
      user: {
        email: 'novo.sem.cadastro@mei.com',
        displayName: 'Sem Cadastro',
      },
    });

    api.post.mockRejectedValueOnce({
      response: {
        status: 404,
        data: {
          sucesso: false,
          mensagem: 'Nenhum cadastro encontrado para este e-mail. Por favor, crie sua conta antes de acessar via Google.',
        },
      },
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    const btnGoogle = screen.getByRole('button', { name: /continuar com o google/i });
    fireEvent.click(btnGoogle);

    await waitFor(() => {
      expect(
        screen.getByText(/nenhum cadastro encontrado para este e-mail/i)
      ).toBeInTheDocument();
    });
  });

  test('não deve exibir mensagem de erro quando o usuário cancela o popup ou seletor do Google', async () => {
    isNativePlatform = false;
    signInWithPopup.mockRejectedValueOnce({
      code: 'auth/popup-closed-by-user',
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    const btnGoogle = screen.getByRole('button', { name: /continuar com o google/i });
    fireEvent.click(btnGoogle);

    await waitFor(() => {
      expect(screen.queryByText(/não foi possível conectar com o google/i)).not.toBeInTheDocument();
    });
  });

  test('deve ocultar a vitrine modular no mobile (hidden lg:flex) mantendo apenas o formulário', () => {
    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    const vitrineEsquerda = container.querySelector('.bg-stone-100\\/70');
    expect(vitrineEsquerda).toBeInTheDocument();
    expect(vitrineEsquerda).toHaveClass('hidden');
    expect(vitrineEsquerda).toHaveClass('lg:flex');
    expect(vitrineEsquerda).not.toHaveClass('w-full');
  });
});
