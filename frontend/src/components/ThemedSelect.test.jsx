import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import ThemedSelect from './ThemedSelect';

describe('Componente ThemedSelect - Bottom Sheet e Dropdown Tátil', () => {
  const sampleOptions = [
    { value: 'opcao_1', label: 'Primeira Opção' },
    { value: 'opcao_2', label: 'Segunda Opção' },
    { value: 'opcao_3', label: 'Terceira Opção' },
  ];

  const manyOptions = [
    { value: 'sp', label: 'São Paulo' },
    { value: 'rj', label: 'Rio de Janeiro' },
    { value: 'mg', label: 'Minas Gerais' },
    { value: 'ba', label: 'Bahia' },
    { value: 'sc', label: 'Santa Catarina' },
    { value: 'rs', label: 'Rio Grande do Sul' },
  ];

  test('renderiza o gatilho com placeholder quando nenhum valor estiver selecionado', () => {
    render(
      <ThemedSelect
        id="teste-select"
        name="teste"
        placeholder="Selecione um item..."
        options={sampleOptions}
      />
    );

    const trigger = screen.getByRole('button', { name: /selecione um item\.\.\./i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('renderiza o rótulo da opção selecionada no gatilho', () => {
    render(
      <ThemedSelect
        id="teste-select"
        name="teste"
        value="opcao_2"
        options={sampleOptions}
      />
    );

    expect(screen.getByRole('button', { name: /segunda opção/i })).toBeInTheDocument();
  });

  test('abre a gaveta/modal ao clicar no gatilho e exibe as opções', () => {
    render(
      <ThemedSelect
        id="teste-select"
        name="teste"
        label="Meu Campo de Seleção"
        options={sampleOptions}
      />
    );

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Meu Campo de Seleção')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /primeira opção/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /segunda opção/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /terceira opção/i })).toBeInTheDocument();
  });

  test('seleciona uma opção e dispara onChange com evento compatível com formulários', () => {
    const handleChange = vi.fn();

    render(
      <ThemedSelect
        id="teste-select"
        name="cliente_id"
        value=""
        onChange={handleChange}
        options={sampleOptions}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: /terceira opção/i }));

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          name: 'cliente_id',
          value: 'opcao_3',
        }),
      })
    );

    // O dialog deve ser fechado após a seleção
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('exibe barra de pesquisa quando há mais de 5 opções e filtra em tempo real', () => {
    render(
      <ThemedSelect
        id="estados"
        name="estado"
        label="Selecione o Estado"
        options={manyOptions}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    const searchInput = screen.getByPlaceholderText(/buscar opções\.\.\./i);
    expect(searchInput).toBeInTheDocument();

    // Digita "Minas"
    fireEvent.change(searchInput, { target: { value: 'Minas' } });

    expect(screen.getByRole('button', { name: /minas gerais/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /são paulo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /bahia/i })).not.toBeInTheDocument();
  });

  test('fecha a gaveta ao pressionar Escape ou clicar no botão fechar', () => {
    render(
      <ThemedSelect
        id="teste-select"
        name="teste"
        options={sampleOptions}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText(/fechar seleção/i);
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('suporta options passadas como tags <option> filhas (children)', () => {
    const handleChange = vi.fn();

    render(
      <ThemedSelect id="categoria" name="categoria" value="servicos" onChange={handleChange}>
        <option value="produtos">Produtos Físicos</option>
        <option value="servicos">Serviços Especializados</option>
      </ThemedSelect>
    );

    expect(screen.getByRole('button', { name: /serviços especializados/i })).toBeInTheDocument();
  });
});
