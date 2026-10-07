import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import Assistente from './Assistente';
import api from '../services/api';

vi.mock('../services/api', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe('Módulo do Assistente IA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('deve renderizar a interface do assistente com sidebar de conversas e sugestões iniciais', async () => {
    api.get.mockResolvedValueOnce({
      data: { sucesso: true, dados: [] },
    });

    render(<Assistente />);

    expect(screen.getByText(/assistente virtual mei/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nova conversa/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/como posso ajudar o seu negócio hoje\?/i)).toBeInTheDocument();
      expect(screen.getByText(/qual o limite de faturamento anual do mei\?/i)).toBeInTheDocument();
      expect(screen.getByText(/como emitir nota fiscal para pessoa física\?/i)).toBeInTheDocument();
    });

    // Rodapé legal obrigatório
    expect(
      screen.getByText(/orientação informativa baseada no documento oficial do mei\. não substitui assessoria contábil\./i)
    ).toBeInTheDocument();
  });

  test('deve listar conversas salvas na barra lateral e permitir selecionar uma conversa', async () => {
    const conversasMock = [
      { id: 101, titulo: 'Dúvida sobre DAS e boleto', atualizado_em: '2026-10-07T12:00:00Z' },
      { id: 102, titulo: 'Limite de faturamento anual', atualizado_em: '2026-10-07T13:00:00Z' },
    ];

    const mensagensMock = [
      { id: 1, papel: 'usuario', conteudo: 'Qual a data de vencimento do DAS?', fontes: [] },
      { id: 2, papel: 'assistente', conteudo: 'O DAS vence todo dia 20 de cada mês.', fontes: [{ pagina: 8, trecho: 'Vencimento dia 20' }] },
    ];

    api.get.mockImplementation((url) => {
      if (url === '/assistente/conversas') {
        return Promise.resolve({ data: { sucesso: true, dados: conversasMock } });
      }
      if (url === '/assistente/conversas/101/mensagens') {
        return Promise.resolve({ data: { sucesso: true, dados: mensagensMock } });
      }
      return Promise.reject(new Error('URL não encontrada'));
    });

    render(<Assistente />);

    await waitFor(() => {
      expect(screen.getByText('Dúvida sobre DAS e boleto')).toBeInTheDocument();
      expect(screen.getByText('Limite de faturamento anual')).toBeInTheDocument();
    });

    // Clica na primeira conversa
    fireEvent.click(screen.getByText('Dúvida sobre DAS e boleto'));

    await waitFor(() => {
      expect(screen.getByText('Qual a data de vencimento do DAS?')).toBeInTheDocument();
      expect(screen.getByText('O DAS vence todo dia 20 de cada mês.')).toBeInTheDocument();
      expect(screen.getByText(/pág\. 8/i)).toBeInTheDocument();
    });
  });

  test('deve enviar uma nova pergunta e exibir a resposta do assistente com badge de fonte', async () => {
    api.get.mockResolvedValueOnce({
      data: { sucesso: true, dados: [] },
    });

    api.post.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: {
          conversa_id: 201,
          mensagem: {
            id: 99,
            papel: 'assistente',
            conteudo: 'O limite anual de faturamento do MEI é de R$ 81.000,00.',
            fontes: [
              { pagina: 14, arquivo: 'perguntaomei.pdf', trecho: 'Limite proporcional e anual' },
            ],
            criado_em: new Date().toISOString(),
          },
        },
      },
    });

    render(<Assistente />);

    const input = screen.getByPlaceholderText(/digite sua dúvida contábil ou sobre seu negócio\.\.\./i);
    fireEvent.change(input, { target: { value: 'Qual o limite de faturamento do MEI?' } });

    const btnEnviar = screen.getByRole('button', { name: /enviar/i });
    fireEvent.click(btnEnviar);

    // Mensagem do usuário deve ser renderizada na tela imediatamente
    expect(screen.getByText('Qual o limite de faturamento do MEI?')).toBeInTheDocument();

    // Espera a resposta da API ser renderizada
    await waitFor(() => {
      expect(screen.getByText(/O limite anual de faturamento do MEI é de R\$ 81\.000,00\./i)).toBeInTheDocument();
      expect(screen.getByText(/pág\. 14/i)).toBeInTheDocument();
    });

    expect(api.post).toHaveBeenCalledWith('/assistente/mensagens', {
      conversa_id: null,
      mensagem: 'Qual o limite de faturamento do MEI?',
    });
  });

  test('deve tratar erro 503 com mensagem amigável e permitir tentar novamente', async () => {
    api.get.mockResolvedValueOnce({
      data: { sucesso: true, dados: [] },
    });

    api.post.mockRejectedValueOnce({
      response: {
        status: 503,
        data: { mensagem: 'Assistente IA temporariamente indisponível' },
      },
    });

    render(<Assistente />);

    const input = screen.getByPlaceholderText(/digite sua dúvida contábil ou sobre seu negócio\.\.\./i);
    fireEvent.change(input, { target: { value: 'Como funciona o desenquadramento?' } });

    const btnEnviar = screen.getByRole('button', { name: /enviar/i });
    fireEvent.click(btnEnviar);

    await waitFor(() => {
      expect(screen.getByText(/assistente ia temporariamente indisponível/i)).toBeInTheDocument();
    });
  });

  test('deve permitir excluir uma conversa existente', async () => {
    const conversasMock = [
      { id: 301, titulo: 'Conversa a ser deletada', atualizado_em: '2026-10-07T10:00:00Z' },
    ];

    api.get.mockImplementation((url) => {
      if (url === '/assistente/conversas') {
        return Promise.resolve({ data: { sucesso: true, dados: conversasMock } });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    api.delete.mockResolvedValueOnce({ status: 204 });

    render(<Assistente />);

    await waitFor(() => {
      expect(screen.getByText('Conversa a ser deletada')).toBeInTheDocument();
    });

    const btnExcluir = screen.getByLabelText(/excluir conversa/i);
    fireEvent.click(btnExcluir);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/assistente/conversas/301');
    });
  });
});
