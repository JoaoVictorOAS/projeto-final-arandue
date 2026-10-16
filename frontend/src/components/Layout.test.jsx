import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
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
  });
});
