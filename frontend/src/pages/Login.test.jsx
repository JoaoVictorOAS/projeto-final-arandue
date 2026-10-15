import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, test, expect, vi } from 'vitest';
import Login from './Login';
import { AuthProvider } from '../context/AuthContext';

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
});
