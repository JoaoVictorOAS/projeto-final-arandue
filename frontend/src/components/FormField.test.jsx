import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import FormField from './FormField';

describe('Componente FormField', () => {
  test('renderiza input de texto padrão com rótulo e required', () => {
    render(<FormField label="Nome Completo" name="nome" required />);

    expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeRequired();
  });

  test('renderiza textarea quando as="textarea"', () => {
    render(<FormField as="textarea" label="Observações" name="obs" />);

    expect(screen.getByLabelText(/observações/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveProperty('tagName', 'TEXTAREA');
  });

  test('integra ThemedSelect quando as="select" e permite seleção com evento onChange', () => {
    const handleChange = vi.fn();
    const options = [
      { value: 'ativa', label: 'Assinatura Ativa' },
      { value: 'pausada', label: 'Assinatura Pausada' },
    ];

    render(
      <FormField
        as="select"
        label="Status da Assinatura"
        name="status"
        options={options}
        value="ativa"
        onChange={handleChange}
      />
    );

    // O gatilho do ThemedSelect deve exibir o label selecionado
    const trigger = screen.getByRole('button', { name: /assinatura ativa/i });
    expect(trigger).toBeInTheDocument();

    // Ao clicar, abre o Bottom Sheet / Dialog
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Clica na opção "Assinatura Pausada"
    fireEvent.click(screen.getByRole('button', { name: /assinatura pausada/i }));

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          name: 'status',
          value: 'pausada',
        }),
      })
    );
  });

  test('exibe mensagem de erro acessível quando prop error for informada', () => {
    render(
      <FormField
        label="Email"
        name="email"
        error="Formato de email inválido"
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/formato de email inválido/i);
  });
});
