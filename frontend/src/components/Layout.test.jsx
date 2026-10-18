import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Layout from './Layout';
import { AuthProvider } from '../context/AuthContext';
import { ChatProvider } from '../context/ChatContext';
import { ThemeProvider } from '../context/ThemeContext';

describe('Layout - Suporte ao Tema Dinâmico', () => {
  it('deve renderizar a estrutura principal com container dinâmico de tema', () => {
    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <ChatProvider>
            <ThemeProvider>
              <Layout />
            </ThemeProvider>
          </ChatProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    const mainWrapper = container.querySelector('.theme-app-wrapper');
    expect(mainWrapper).not.toBeNull();
    expect(mainWrapper.style.backgroundColor).toBe('var(--bg-app)');
    expect(mainWrapper.style.color).toBe('var(--text-main)');

    const header = container.querySelector('header');
    expect(header).not.toBeNull();
    expect(header.style.backgroundColor).toBe('var(--bg-surface)');
    expect(header.style.borderColor).toBe('var(--border-color)');

    const nav = container.querySelector('aside nav');
    expect(nav).not.toBeNull();

    const main = container.querySelector('main');
    expect(main).toHaveClass('p-4', 'sm:p-6', 'lg:p-8');
  });

  it('deve remover padding externo no mobile quando a rota for /assistente', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/assistente']}>
        <AuthProvider>
          <ChatProvider>
            <ThemeProvider>
              <Layout />
            </ThemeProvider>
          </ChatProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    const main = container.querySelector('main');
    expect(main).not.toBeNull();
    expect(main).toHaveClass('p-0', 'md:p-6', 'lg:p-8');
    expect(main).not.toHaveClass('p-4');
  });
});
