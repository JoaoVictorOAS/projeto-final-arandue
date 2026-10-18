import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AtendenteIA from './AtendenteIA';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('Módulo AtendenteIA - Configuração e Simulador do Atendente Pessoal do Cliente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar e exibir as configurações do atendente (tom de voz, faixa de orçamento e capacidades MCP)', async () => {
    api.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          nome_atendente: 'Lia Atendente',
          tom_voz: 'CONSULTIVO',
          mensagem_boas_vindas: 'Olá! Sou a Lia.',
          instrucoes_customizadas: 'Atendemos até as 18h.',
          orcamento_min_valor: 150,
          orcamento_max_valor: 1200,
          desconto_max_percentual: 10,
          antecedencia_minima_dias: 3,
          antecedencia_maxima_dias: 45,
          transbordo_automatico: true,
          condicoes_retorno_humano: 'Urgências no mesmo dia',
          permite_agendar: true,
          permite_consultar_catalogo: true,
          permite_gerar_orcamento: true,
          permite_fechar_orcamento: true,
          permite_gerar_cobranca_pix: false,
          ativo: true,
          slug_publico: 'atd-1-teste',
          total_pendentes: 0,
          itens: [],
        },
      },
    });

    render(
      <MemoryRouter>
        <AtendenteIA />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Lia Atendente')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('150')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1200')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Urgências no mesmo dia')).toBeInTheDocument();
    expect(screen.getByText(/Simulador ao Vivo: Lia Atendente/i)).toBeInTheDocument();
  });

  it('deve salvar alterações de faixa de orçamento, antecedência mínima e retorno ao humano via PUT /atendente/config', async () => {
    api.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          nome_atendente: 'Lia',
          tom_voz: 'AMIGAVEL',
          mensagem_boas_vindas: 'Olá!',
          orcamento_min_valor: 100,
          orcamento_max_valor: 500,
          desconto_max_percentual: 5,
          antecedencia_minima_dias: 1,
          antecedencia_maxima_dias: 60,
          transbordo_automatico: true,
          condicoes_retorno_humano: 'Horários indisponíveis',
          permite_agendar: true,
          permite_consultar_catalogo: true,
          permite_gerar_orcamento: true,
          permite_fechar_orcamento: true,
          permite_gerar_cobranca_pix: false,
          ativo: true,
          slug_publico: 'atd-1-teste',
          total_pendentes: 0,
          itens: [],
        },
      },
    });

    api.put.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: {
          nome_atendente: 'Lia Pro',
          tom_voz: 'DIRETO',
          orcamento_min_valor: 200,
          orcamento_max_valor: 900,
          desconto_max_percentual: 8,
          antecedencia_minima_dias: 3,
          antecedencia_maxima_dias: 60,
          slug_publico: 'atd-1-teste',
        },
      },
    });

    render(
      <MemoryRouter>
        <AtendenteIA />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Lia')).toBeInTheDocument();
    });

    const btnSalvar = screen.getByRole('button', { name: /Salvar Configurações/i });
    fireEvent.click(btnSalvar);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/atendente/config',
        expect.objectContaining({
          nome_atendente: 'Lia',
          orcamento_min_valor: 100,
          orcamento_max_valor: 500,
          antecedencia_minima_dias: 1,
        })
      );
      expect(screen.getByText(/Configurações do Atendente Pessoal salvas com sucesso!/i)).toBeInTheDocument();
    });
  });

  it('deve exibir a fila de Atendimento Pendente (retorno ao humano) e permitir concluir o atendimento', async () => {
    api.get.mockImplementation((url) => {
      if (url.startsWith('/atendente/pendencias')) {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: {
              total_pendentes: 1,
              nao_lidos_mobile: 1,
              itens: [
                {
                  id: 701,
                  nome_cliente: 'Marcos Silva',
                  telefone_cliente: '11988887777',
                  motivo: 'Tentou agendar com menos de 3 dias de antecedência',
                  resumo_conversa: 'Cliente precisa de encaixe para amanhã às 10h.',
                  status: 'PENDENTE',
                },
              ],
            },
          },
        });
      }
      return Promise.resolve({
        data: {
          sucesso: true,
          dados: {
            nome_atendente: 'Lia',
            tom_voz: 'AMIGAVEL',
            orcamento_min_valor: 100,
            orcamento_max_valor: 500,
            antecedencia_minima_dias: 3,
            slug_publico: 'atd-1-teste',
          },
        },
      });
    });

    api.patch.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: { id: 701, status: 'CONCLUIDO' },
      },
    });

    render(
      <MemoryRouter>
        <AtendenteIA />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Marcos Silva')).toBeInTheDocument();
      expect(screen.getByText(/Tentou agendar com menos de 3 dias de antecedência/i)).toBeInTheDocument();
    });

    const btnConcluir = screen.getByRole('button', { name: /Marcar Resolvido/i });
    fireEvent.click(btnConcluir);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/atendente/pendencias/701/status', {
        status: 'CONCLUIDO',
        lido_mobile: true,
      });
    });
  });

  it('deve exibir e permitir adicionar/editar Alçada de Fechamento Automático por Serviço', async () => {
    api.get.mockImplementation((url) => {
      if (url.startsWith('/servicos')) {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: [
              { id: 10, nome: 'Instalação Elétrica', preco: 800 },
              { id: 20, nome: 'Visita Técnica', preco: 150 },
            ],
          },
        });
      }
      if (url.startsWith('/atendente/pendencias')) {
        return Promise.resolve({
          data: { sucesso: true, dados: { total_pendentes: 0, itens: [] } },
        });
      }
      return Promise.resolve({
        data: {
          sucesso: true,
          dados: {
            nome_atendente: 'Lia',
            tom_voz: 'AMIGAVEL',
            orcamento_min_valor: 50,
            orcamento_max_valor: 300,
            desconto_max_percentual: 5,
            alcadas_por_servico: [
              {
                servico_id: 10,
                nome_servico: 'Instalação Elétrica',
                permite_fechar_orcamento: true,
                orcamento_min_valor: 400,
                orcamento_max_valor: 1500,
                desconto_max_percentual: 12,
              },
            ],
            slug_publico: 'atd-1-teste',
          },
        },
      });
    });

    api.put.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: {
          nome_atendente: 'Lia',
          alcadas_por_servico: [
            {
              servico_id: 10,
              nome_servico: 'Instalação Elétrica',
              permite_fechar_orcamento: true,
              orcamento_min_valor: 400,
              orcamento_max_valor: 1500,
              desconto_max_percentual: 12,
            },
          ],
        },
      },
    });

    render(
      <MemoryRouter>
        <AtendenteIA />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Alçada Específica por Serviço/i)).toBeInTheDocument();
      expect(screen.getByText('Instalação Elétrica')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('400')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1500')).toBeInTheDocument();

    const btnSalvar = screen.getByRole('button', { name: /Salvar Configurações/i });
    fireEvent.click(btnSalvar);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/atendente/config',
        expect.objectContaining({
          alcadas_por_servico: expect.arrayContaining([
            expect.objectContaining({
              servico_id: 10,
              orcamento_min_valor: 400,
              orcamento_max_valor: 1500,
              desconto_max_percentual: 12,
            }),
          ]),
        })
      );
    });
  });

  it('deve enviar mensagem no simulador ao vivo e exibir resposta do atendente', async () => {
    api.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          nome_atendente: 'Lia',
          tom_voz: 'AMIGAVEL',
          mensagem_boas_vindas: 'Olá!',
          orcamento_min_valor: 100,
          orcamento_max_valor: 500,
          desconto_max_percentual: 5,
          slug_publico: 'atd-1-teste',
          total_pendentes: 0,
          itens: [],
        },
      },
    });

    api.post.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: {
          resposta: 'Orçamento de R$ 250 aprovado automaticamente!',
          ferramentas_acionadas: ['atendente_fechar_orcamento_cliente'],
        },
      },
    });

    render(
      <MemoryRouter>
        <AtendenteIA />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Simule um cliente/i)).toBeInTheDocument();
    });

    const inputChat = screen.getByPlaceholderText(/Simule um cliente/i);
    fireEvent.change(inputChat, { target: { value: 'Quero fechar por R$ 250' } });

    const btnEnviar = screen.getByRole('button', { name: /Enviar/i });
    fireEvent.click(btnEnviar);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/atendente/publico/atd-1-teste/mensagem',
        expect.objectContaining({
          mensagem: 'Quero fechar por R$ 250',
        })
      );
      expect(screen.getByText('Orçamento de R$ 250 aprovado automaticamente!')).toBeInTheDocument();
    });
  });

  it('deve permitir configurar pergunta inicial como opcional e exibir estado vazio no simulador quando não definida', async () => {
    api.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          nome_atendente: 'Lia',
          tom_voz: 'AMIGAVEL',
          mensagem_boas_vindas: '',
          orcamento_min_valor: 100,
          orcamento_max_valor: 500,
          desconto_max_percentual: 5,
          slug_publico: 'atd-1-teste',
          total_pendentes: 0,
          itens: [],
        },
      },
    });

    render(
      <MemoryRouter>
        <AtendenteIA />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nenhuma mensagem inicial ativa')).toBeInTheDocument();
    });

    const checkboxMsgInicial = screen.getByLabelText(/Definir pergunta ou saudação inicial \(opcional\)/i);
    expect(checkboxMsgInicial).not.toBeChecked();

    // Ativa a mensagem inicial
    fireEvent.click(checkboxMsgInicial);
    expect(checkboxMsgInicial).toBeChecked();

    const inputMsg = screen.getByPlaceholderText(/Ex: Olá! Como posso ajudar você hoje\?/i);
    expect(inputMsg).toBeInTheDocument();
    fireEvent.change(inputMsg, { target: { value: 'Olá! Qual serviço você deseja?' } });

    expect(screen.getByDisplayValue('Olá! Qual serviço você deseja?')).toBeInTheDocument();
  });
});

