import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import AdaptiveParagraph from './AdaptiveParagraph';

describe('Componente AdaptiveParagraph - Regra de Popover para 3+ Linhas', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockLineHeightAndHeight = (lineHeightPx, scrollHeightPx) => {
    const origGetComputedStyle = window.getComputedStyle;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
      const orig = origGetComputedStyle(el);
      return {
        ...orig,
        getPropertyValue: (prop) => (prop === 'line-height' ? `${lineHeightPx}px` : orig.getPropertyValue(prop)),
        fontSize: '14px',
        lineHeight: `${lineHeightPx}px`,
      };
    });

    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return scrollHeightPx;
      },
    });
  };

  test('renderiza como parágrafo normal quando o texto tem 1 ou 2 linhas', () => {
    // 40px / 20px = 2 linhas (dentro do limite)
    mockLineHeightAndHeight(20, 40);

    render(
      <AdaptiveParagraph className="text-sm text-gray-500">
        Texto curto de duas linhas.
      </AdaptiveParagraph>
    );

    expect(screen.getByText('Texto curto de duas linhas.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ver mais/i })).not.toBeInTheDocument();
  });

  test('transforma em popover quando o texto quebra para 3 ou mais linhas', () => {
    // 65px / 20px = 3.25 linhas (>= 3 linhas)
    mockLineHeightAndHeight(20, 65);

    render(
      <AdaptiveParagraph className="text-sm text-gray-500">
        Texto longo descritivo que quebrou para três linhas ou mais no dispositivo pequeno.
      </AdaptiveParagraph>
    );

    // Deve exibir o botão de popover para não quebrar a tela
    const trigger = screen.getByRole('button', { name: /ver mais/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Ao clicar no botão, deve abrir o popover flutuante
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/informações/i)).toBeInTheDocument();

    // Fecha o popover ao clicar no botão fechar
    const closeBtn = screen.getByRole('button', { name: /fechar informações/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('fecha o popover com a tecla Escape', () => {
    mockLineHeightAndHeight(20, 70);

    render(
      <AdaptiveParagraph className="text-sm text-gray-500">
        Texto longo de teste.
      </AdaptiveParagraph>
    );

    const trigger = screen.getByRole('button', { name: /ver mais/i });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Pressiona Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
