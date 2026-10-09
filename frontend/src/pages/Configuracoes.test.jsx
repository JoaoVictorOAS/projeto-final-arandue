import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import Configuracoes from './Configuracoes';
import api from '../services/api';

vi.mock('../services/api', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe('Módulo de Configurações — MEI & SEFAZ Multi-Estado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockConfigInicial = {
    sucesso: true,
    dados: {
      id: 1,
      usuario_id: 1,
      razao_social: 'João Silva MEI',
      nome_fantasia: 'Silva Serviços Técnicos',
      cnpj: '12.345.678/0001-90',
      inscricao_estadual: 'ISENTO',
      inscricao_municipal: '123456',
      cep: '01001-000',
      logradouro: 'Praça da Sé',
      numero: '100',
      complemento: 'Sala 1',
      bairro: 'Sé',
      municipio: 'São Paulo',
      uf: 'SP',
      codigo_municipio_ibge: '3550308',
      email_comercial: 'contato@silva.com',
      telefone_comercial: '(11) 98765-4321',
      ambiente_fiscal: 'HOMOLOGACAO',
      serie_nfse: 1,
      serie_nfe: 1,
      serie_nfce: 1,
      configurado: true,
    },
  };

  test('deve renderizar os cards e carregar os dados iniciais de configuracoes via api.get', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/configuracoes') {
        return Promise.resolve({ data: mockConfigInicial });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(<Configuracoes />);

    // Verifica loading e depois carregamento
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /configurações do mei/i })).toBeInTheDocument();
    });

    // Cards esperados
    expect(screen.getByText(/busca rápida de cnpj/i)).toBeInTheDocument();
    expect(screen.getByText(/dados da empresa/i)).toBeInTheDocument();
    expect(screen.getByText(/domicílio fiscal e localização/i)).toBeInTheDocument();
    expect(screen.getByText(/parâmetros fiscais/i)).toBeInTheDocument();

    // Campos preenchidos com os dados iniciais
    expect(screen.getByDisplayValue('João Silva MEI')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Silva Serviços Técnicos')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Praça da Sé')).toBeInTheDocument();
    expect(screen.getByDisplayValue('São Paulo')).toBeInTheDocument();

    // Badge SEFAZ para SP
    expect(screen.getByText(/🏛️ Autorizador Fiscal: SEFAZ SP \(cUF 35\)/i)).toBeInTheDocument();

    // Botão de salvar
    expect(screen.getByRole('button', { name: /salvar configurações/i })).toBeInTheDocument();
  });

  test('deve consultar CNPJ na BrasilAPI e preencher os campos do formulário automaticamente', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/configuracoes') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: {
              ...mockConfigInicial.dados,
              cnpj: '',
              razao_social: '',
              nome_fantasia: '',
              uf: '',
            },
          },
        });
      }
      if (url.includes('/configuracoes/cnpj/')) {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: {
              cnpj: '98765432000199',
              razao_social: 'Nova Empresa MEI Ltda',
              nome_fantasia: 'Nova Empresa',
              cep: '88010000',
              logradouro: 'Rua Felipe Schmidt',
              numero: '500',
              complemento: 'Andar 2',
              bairro: 'Centro',
              municipio: 'Florianópolis',
              uf: 'SC',
              codigo_municipio_ibge: '4205407',
              telefone: '48999998888',
              email: 'fiscal@novaempresa.com',
            },
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(<Configuracoes />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/digite o cnpj/i)).toBeInTheDocument();
    });

    const inputBusca = screen.getByPlaceholderText(/digite o cnpj/i);
    const btnBuscar = screen.getByRole('button', { name: /buscar cnpj/i });

    fireEvent.change(inputBusca, { target: { value: '98.765.432/0001-99' } });
    fireEvent.click(btnBuscar);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/configuracoes/cnpj/98765432000199');
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Nova Empresa MEI Ltda')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Nova Empresa')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Rua Felipe Schmidt')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Florianópolis')).toBeInTheDocument();
      expect(screen.getByDisplayValue('88010000')).toBeInTheDocument();
    });

    // Badge SEFAZ atualizado dinamicamente para SC (SVRS)
    expect(screen.getByText(/🏛️ Autorizador Fiscal: SVRS \(cUF 42\)/i)).toBeInTheDocument();
  });

  test('deve atualizar o badge SEFAZ em tempo real ao selecionar outro estado no dropdown', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/configuracoes') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: {
              ...mockConfigInicial.dados,
              uf: 'SP',
            },
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(<Configuracoes />);

    await waitFor(() => {
      expect(screen.getByText(/🏛️ Autorizador Fiscal: SEFAZ SP \(cUF 35\)/i)).toBeInTheDocument();
    });

    const selectUf = screen.getByLabelText(/estado \(uf\)/i);

    // Altera para SC
    fireEvent.change(selectUf, { target: { value: 'SC' } });
    expect(screen.getByText(/🏛️ Autorizador Fiscal: SVRS \(cUF 42\)/i)).toBeInTheDocument();

    // Altera para MG (Próprio)
    fireEvent.change(selectUf, { target: { value: 'MG' } });
    expect(screen.getByText(/🏛️ Autorizador Fiscal: SEFAZ MG \(cUF 31\)/i)).toBeInTheDocument();

    // Altera para MA (SVAN)
    fireEvent.change(selectUf, { target: { value: 'MA' } });
    expect(screen.getByText(/🏛️ Autorizador Fiscal: SVAN \(cUF 21\)/i)).toBeInTheDocument();
  });

  test('deve submeter o formulário chamando api.put e exibir feedback de sucesso', async () => {
    api.get.mockResolvedValue({ data: mockConfigInicial });
    api.put.mockResolvedValue({
      data: {
        sucesso: true,
        mensagem: 'Configurações salvas com sucesso',
        dados: mockConfigInicial.dados,
      },
    });

    render(<Configuracoes />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('João Silva MEI')).toBeInTheDocument();
    });

    const btnSalvar = screen.getByRole('button', { name: /salvar configurações/i });
    fireEvent.click(btnSalvar);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/configuracoes',
        expect.objectContaining({
          razao_social: 'João Silva MEI',
          cnpj: expect.stringContaining('12345678000190'),
          uf: 'SP',
          municipio: 'São Paulo',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/configurações salvas com sucesso/i)).toBeInTheDocument();
    });
  });

  test('deve exibir mensagem de erro se a consulta de CNPJ falhar', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/configuracoes') {
        return Promise.resolve({ data: mockConfigInicial });
      }
      if (url.includes('/configuracoes/cnpj/')) {
        return Promise.reject({
          response: {
            data: {
              sucesso: false,
              mensagem: 'CNPJ não encontrado na base da Receita Federal',
            },
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(<Configuracoes />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/digite o cnpj/i)).toBeInTheDocument();
    });

    const inputBusca = screen.getByPlaceholderText(/digite o cnpj/i);
    const btnBuscar = screen.getByRole('button', { name: /buscar cnpj/i });

    fireEvent.change(inputBusca, { target: { value: '00.000.000/0001-00' } });
    fireEvent.click(btnBuscar);

    await waitFor(() => {
      expect(screen.getByText(/cnpj não encontrado na base da receita federal/i)).toBeInTheDocument();
    });
  });
});
