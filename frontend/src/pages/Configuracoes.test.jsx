import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, test, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Configuracoes from './Configuracoes';
import { ThemeProvider } from '../context/ThemeContext';
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

  test('deve exibir secao de Certificado Digital A1 com status ou formulario de upload', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/configuracoes') {
        return Promise.resolve({ data: mockConfigInicial });
      }
      if (url === '/configuracoes/certificado') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: { configurado: false, ativo: false },
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(<Configuracoes />);

    expect(await screen.findByText(/certificado digital icp-brasil/i)).toBeInTheDocument();
    expect(screen.getByText(/instalar certificado a1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha do certificado/i)).toBeInTheDocument();
  });

  test('deve exibir dados do certificado quando já estiver configurado', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/configuracoes') {
        return Promise.resolve({ data: mockConfigInicial });
      }
      if (url === '/configuracoes/certificado') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: {
              configurado: true,
              cnpj: '12345678000195',
              razaoSocial: 'MEI TESTE LTDA',
              validoAte: '2027-10-09T18:00:00Z',
              diasRestantes: 365,
              ativo: true,
              nomeArquivo: 'certificado.pfx',
            },
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(<Configuracoes />);

    expect(await screen.findByText(/certificado ativo e válido/i)).toBeInTheDocument();
    expect(screen.getByText(/MEI TESTE LTDA/i)).toBeInTheDocument();
    expect(screen.getByText(/12345678000195/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remover certificado/i })).toBeInTheDocument();
  });

  test('deve exibir card de Integração WhatsApp e permitir vincular número de celular', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/configuracoes') {
        return Promise.resolve({ data: mockConfigInicial });
      }
      if (url === '/assistente/whatsapp/status') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: {
              bot: { status: 'conectado', conectado: true, numero: '5511999990000', qrCode: null },
              usuario_whatsapp: null,
              usuario_whatsapp_verificado: false,
            },
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    api.post.mockResolvedValueOnce({
      data: {
        sucesso: true,
        mensagem: 'Número de WhatsApp vinculado com sucesso ao assistente!',
        dados: { whatsapp: '5511987654321', whatsapp_verificado: true },
      },
    });

    render(<Configuracoes />);

    expect(await screen.findByText(/integração whatsapp — assistente ia aranduê/i)).toBeInTheDocument();
    expect(screen.getByText(/gateway conectado/i)).toBeInTheDocument();

    const inputWpp = screen.getByLabelText(/seu número de whatsapp/i);
    fireEvent.change(inputWpp, { target: { value: '(11) 98765-4321' } });

    const btnVincular = screen.getByRole('button', { name: /vincular whatsapp/i });
    fireEvent.click(btnVincular);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/assistente/whatsapp/vincular', {
        telefone: '(11) 98765-4321',
      });
    });

    expect(await screen.findByText(/número de whatsapp vinculado com sucesso/i)).toBeInTheDocument();
  });

  it('deve renderizar a seção de Aparência e Temas do Sistema com opções de troca e IA', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/configuracoes') {
        return Promise.resolve({ data: mockConfigInicial });
      }
      if (url === '/configuracoes/temas') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: [
              {
                id: 'padrao-claro',
                slug: 'claro-arandue',
                nome: 'Claro Aranduê',
                modo: 'light',
                eh_sistema: true,
                eh_ativo: true,
                tokens: {
                  bgApp: '#f8fafc',
                  bgSurface: '#ffffff',
                  primary: '#4f46e5',
                  accent: '#f59e0b',
                },
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(
      <BrowserRouter>
        <ThemeProvider>
          <Configuracoes />
        </ThemeProvider>
      </BrowserRouter>
    );

    expect(await screen.findByText(/Aparência & Temas do Sistema/i)).toBeInTheDocument();
    expect(screen.getByText(/Alterar pelo Assistente/i)).toBeInTheDocument();
    expect(screen.getByText(/Importar Tema \(\.json\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Exportar Tema Ativo/i)).toBeInTheDocument();
    expect(screen.getByText('Claro Aranduê')).toBeInTheDocument();
  });

  it('deve permitir ativar um tema inativo da biblioteca', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/configuracoes') return Promise.resolve({ data: mockConfigInicial });
      if (url === '/configuracoes/temas') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: [
              {
                id: 'padrao-claro',
                slug: 'claro-arandue',
                nome: 'Claro Aranduê',
                modo: 'light',
                eh_sistema: true,
                eh_ativo: true,
                tokens: {
                  bgApp: '#f8fafc',
                  bgSurface: '#ffffff',
                  primary: '#4f46e5',
                  accent: '#f59e0b',
                },
              },
              {
                id: 2,
                slug: 'tema-barbearia',
                nome: 'Barbearia Retrô',
                modo: 'dark',
                eh_sistema: false,
                eh_ativo: false,
                tokens: {
                  bgApp: '#18181b',
                  bgSurface: '#27272a',
                  primary: '#d97706',
                  accent: '#f59e0b',
                },
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    api.put.mockImplementation((url) => {
      if (url.includes('/configuracoes/temas/')) {
        return Promise.resolve({
          data: {
            sucesso: true,
            mensagem: 'Tema ativado com sucesso!',
            dados: {
              id: 2,
              slug: 'tema-barbearia',
              nome: 'Barbearia Retrô',
              modo: 'dark',
              eh_ativo: true,
              tokens: {
                bgApp: '#18181b',
                bgSurface: '#27272a',
                primary: '#d97706',
                accent: '#f59e0b',
              },
            },
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true } });
    });

    render(
      <BrowserRouter>
        <ThemeProvider>
          <Configuracoes />
        </ThemeProvider>
      </BrowserRouter>
    );

    expect(await screen.findByText('Barbearia Retrô')).toBeInTheDocument();
    const btnAtivar = screen.getByRole('button', { name: /Ativar Tema/i });
    fireEvent.click(btnAtivar);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/configuracoes/temas/2/ativar');
    });
  });

  it('deve exibir popover orientando o usuário a alterar o tema via Assistente IA', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/configuracoes') return Promise.resolve({ data: mockConfigInicial });
      if (url === '/configuracoes/temas') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: [
              {
                id: 'padrao-claro',
                slug: 'claro-arandue',
                nome: 'Claro Aranduê',
                modo: 'light',
                eh_sistema: true,
                eh_ativo: true,
                tokens: {
                  bgApp: '#f8fafc',
                  bgSurface: '#ffffff',
                  primary: '#4f46e5',
                  accent: '#f59e0b',
                },
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(
      <BrowserRouter>
        <ThemeProvider>
          <Configuracoes />
        </ThemeProvider>
      </BrowserRouter>
    );

    const btnPopover = await screen.findByRole('button', { name: /Como alterar o tema pelo assistente/i });
    expect(btnPopover).toBeInTheDocument();

    fireEvent.click(btnPopover);

    expect(await screen.findByText(/Altere o tema com o Assistente IA/i)).toBeInTheDocument();
    expect(screen.getByText(/Você pode pedir diretamente ao/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir Assistente IA/i })).toBeInTheDocument();
  });

  it('deve permitir importar tema através de upload de arquivo .json', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/configuracoes') return Promise.resolve({ data: mockConfigInicial });
      if (url === '/configuracoes/temas') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: [],
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    api.post.mockImplementation((url) => {
      if (url === '/configuracoes/temas/upload') {
        return Promise.resolve({
          data: {
            sucesso: true,
            mensagem: 'Tema importado com sucesso!',
            dados: {
              id: 10,
              nome: 'Tema Arquivo Importado',
              slug: 'tema-arquivo-importado',
            },
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true } });
    });

    render(
      <BrowserRouter>
        <ThemeProvider>
          <Configuracoes />
        </ThemeProvider>
      </BrowserRouter>
    );

    expect(await screen.findByText(/Importar Tema \(\.json\)/i)).toBeInTheDocument();

    const fileInput = document.querySelector('input[type="file"][accept=".json"]');
    expect(fileInput).not.toBeNull();

    const file = new File(['{"nome":"Tema Arquivo Importado"}'], 'tema.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/configuracoes/temas/upload',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
    });
  });

  it('deve permitir excluir tema customizado com confirmação', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    api.get.mockImplementation((url) => {
      if (url === '/configuracoes') return Promise.resolve({ data: mockConfigInicial });
      if (url === '/configuracoes/temas') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: [
              {
                id: 55,
                slug: 'tema-deletavel',
                nome: 'Tema Deletável',
                modo: 'light',
                eh_sistema: false,
                eh_ativo: false,
                tokens: {
                  bgApp: '#ffffff',
                  bgSurface: '#f3f4f6',
                  primary: '#ec4899',
                  accent: '#8b5cf6',
                },
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    api.delete.mockResolvedValueOnce({
      data: { sucesso: true, mensagem: 'Tema removido com sucesso' },
    });

    render(
      <BrowserRouter>
        <ThemeProvider>
          <Configuracoes />
        </ThemeProvider>
      </BrowserRouter>
    );

    expect(await screen.findByText('Tema Deletável')).toBeInTheDocument();

    const btnExcluir = screen.getByTitle(/Excluir tema/i);
    fireEvent.click(btnExcluir);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/configuracoes/temas/55');
    });
  });

  it('deve permitir exportar o tema ativo chamando a função de download', async () => {
    // Mock createObjectURL e revokeObjectURL para jsdom
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-blob');
    window.URL.revokeObjectURL = vi.fn();

    api.get.mockImplementation((url) => {
      if (url === '/configuracoes') return Promise.resolve({ data: mockConfigInicial });
      if (url === '/configuracoes/temas') {
        return Promise.resolve({
          data: {
            sucesso: true,
            dados: [
              {
                id: 'padrao-claro',
                slug: 'claro-arandue',
                nome: 'Claro Aranduê',
                modo: 'light',
                eh_sistema: true,
                eh_ativo: true,
                tokens: {
                  bgApp: '#f8fafc',
                  bgSurface: '#ffffff',
                  primary: '#4f46e5',
                  accent: '#f59e0b',
                },
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { sucesso: true, dados: [] } });
    });

    render(
      <BrowserRouter>
        <ThemeProvider>
          <Configuracoes />
        </ThemeProvider>
      </BrowserRouter>
    );

    expect(await screen.findByText('Claro Aranduê')).toBeInTheDocument();

    const btnExportarAtivo = screen.getByRole('button', { name: /Exportar Tema Ativo/i });
    expect(btnExportarAtivo).toBeInTheDocument();
    fireEvent.click(btnExportarAtivo);

    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });
});
