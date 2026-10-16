import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, test, expect, vi } from 'vitest';
import Register from './Register';
import { AuthProvider } from '../context/AuthContext';

describe('Tela de Cadastro', () => {
  test('deve renderizar campos de nome, email, senha, confirmação de senha e botão de criação', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Register />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument();
    expect(screen.getByText(/já possui uma conta/i)).toBeInTheDocument();
  });

  test('deve exibir elementos de personalidade e modularidade (Livro Caixa, Notas Fiscais e Assistente)', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Register />
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
          <Register />
        </AuthProvider>
      </BrowserRouter>
    );

    const registerRoot = container.querySelector('.theme-isolated');
    expect(registerRoot).toBeInTheDocument();
    expect(registerRoot).toHaveStyle({ backgroundColor: 'rgb(255, 255, 255)' });

    // Modo escuro deve ser desativado temporariamente na tela de cadastro
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Ao desmontar a tela de cadastro, o tema anterior deve ser restaurado
    unmount();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('deve ocultar a vitrine modular no mobile (hidden lg:flex) mantendo apenas o formulário', () => {
    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <Register />
        </AuthProvider>
      </BrowserRouter>
    );

    const vitrineEsquerda = container.querySelector('.bg-stone-100\\/70');
    expect(vitrineEsquerda).toBeInTheDocument();
    expect(vitrineEsquerda).toHaveClass('hidden');
    expect(vitrineEsquerda).toHaveClass('lg:flex');
    expect(vitrineEsquerda).not.toHaveClass('w-full');
  });

  test('deve validar se as senhas coincidem antes de submeter', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Register />
        </AuthProvider>
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'João Silva' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'joao@teste.com' } });
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: '654321' } });

    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => {
      expect(screen.getByText(/as senhas informadas não coincidem/i)).toBeInTheDocument();
    });
  });
});
