const bcrypt = require('bcryptjs');
const pool = require('../config/database');

/**
 * Script de Seed Multi-Tenant para o Sistema Aranduê MEI.
 * Popula 5 perfis distintos de MEI com dados realistas, históricos financeiros,
 * agendamentos, clientes, orçamentos, estoque e dashboards customizados.
 */

// Senha unificada para facilitar o acesso e testes em qualquer perfil
const SENHA_PADRAO = 'admin123';

const MEIS_DATA = [
  // =========================================================================
  // MEI 1: Prestação de Serviços Elétricos (MEI Principal / Demo)
  // =========================================================================
  {
    nome: 'João Victor (MEI Demo - Eletricista)',
    email: 'admin@mei.com',
    config: {
      razao_social: 'João Victor Eletricidade MEI',
      nome_fantasia: 'JV Soluções Elétricas',
      cnpj: '12.345.678/0001-90',
      inscricao_municipal: '12345678',
      cep: '01310-100',
      logradouro: 'Avenida Paulista',
      numero: '1000',
      bairro: 'Bela Vista',
      municipio: 'São Paulo',
      uf: 'SP',
      codigo_municipio_ibge: '3550308',
      email_comercial: 'contato@jveletrica.com.br',
      telefone_comercial: '(11) 98765-4321',
    },
    servicos: [
      { nome: 'Instalação Elétrica Residencial Padrão', preco: 250.0, categoria: 'Elétrica', descricao: 'Instalação ou troca de circuitos elétricos, interruptores e luminárias.' },
      { nome: 'Troca de Fiação e Quadro de Disjuntores', preco: 450.0, categoria: 'Elétrica', descricao: 'Substituição completa de fiação antiga com montagem de quadro com DR e DPS.' },
      { nome: 'Manutenção Preventiva de Ar-Condicionado', preco: 180.0, categoria: 'Climatização', descricao: 'Higienização de serpentina, limpeza de filtros, verificação de pressão do gás.' },
      { nome: 'Instalação de Ponto de Tomada 220V', preco: 90.0, categoria: 'Elétrica', descricao: 'Puxada de circuito exclusivo com disjuntor dedicado para torneira ou ar.' },
      { nome: 'Consultoria Técnica de Eficiência Energética', preco: 350.0, categoria: 'Consultoria', descricao: 'Diagnóstico de sobrecarga, dimensionamento de carga e redução de consumo.' },
      { nome: 'Instalação de Padrão de Entrada Bifásico', preco: 650.0, categoria: 'Elétrica', descricao: 'Montagem de poste padrão homologado pela concessionária.' },
    ],
    clientes: [
      { nome: 'Carlos Eduardo Santos', telefone: '(11) 98765-4321', email: 'carlos.santos@email.com', endereco: 'Rua das Flores, 142 - Apto 31, São Paulo - SP', observacoes: 'Cliente preferencial. Atendimento sempre no período da tarde.' },
      { nome: 'Mariana Souza Lima', telefone: '(11) 91234-5678', email: 'mariana.souza@comercio.com', endereco: 'Av. Paulista, 1000 - Sala 402, São Paulo - SP', observacoes: 'Loja comercial. Emitir recibo detalhado.' },
      { nome: 'Roberto Mendes de Oliveira', telefone: '(11) 97777-8888', email: 'roberto@construtora.com', endereco: 'Rua Bela Cintra, 850, São Paulo - SP', observacoes: 'Reforma em andamento. Contato com o mestre de obras.' },
      { nome: 'Beatriz Albuquerque', telefone: '(11) 96543-2109', email: 'beatriz@escritorio.adv.br', endereco: 'Rua Vergueiro, 500 - Conjunto 12, São Paulo - SP', observacoes: 'Indicação de Carlos Eduardo.' },
      { nome: 'Condomínio Edifício Solar', telefone: '(11) 93333-2222', email: 'sindico@edificiosolar.com.br', endereco: 'Rua Augusta, 1200, São Paulo - SP', observacoes: 'Contrato de manutenção predial recorrente.' },
      { nome: 'Oficina do Marcão', telefone: '(11) 94444-5555', email: 'marcao@oficina.com.br', endereco: 'Av. do Estado, 4500, São Paulo - SP', observacoes: 'Instalação de maquinário industrial 220V/380V.' },
    ],
    insumos: [
      { nome: 'Cabo Flexível 2,5mm 750V (m)', unidade_base: 'un', quantidade_atual: 150, estoque_minimo: 30, custo_unitario: 2.80 },
      { nome: 'Disjuntor Bipolar DIN 20A', unidade_base: 'un', quantidade_atual: 12, estoque_minimo: 4, custo_unitario: 18.50 },
      { nome: 'Fita Isolante 20m 3M', unidade_base: 'un', quantidade_atual: 8, estoque_minimo: 2, custo_unitario: 8.90 },
      { nome: 'Conector Wago 3 Vias', unidade_base: 'un', quantidade_atual: 45, estoque_minimo: 10, custo_unitario: 3.50 },
    ],
    // Faturamento anual ~R$ 48.000 (margem segura ~59% do teto)
    faturamentoTarget: 48000,
    dashboards: [
      {
        nome: 'Principal',
        descricao: 'Visão consolidada e métricas principais do negócio',
        eh_padrao: 1,
        widgets: [
          { titulo: 'Faturamento vs Limite MEI', tipo_grafico: 'radial_gauge', metrica: 'limite_mei', periodo: 'ano_atual', largura: 2 },
          { titulo: 'Fluxo de Caixa Mensal', tipo_grafico: 'bar', metrica: 'fluxo_caixa', periodo: 'ultimos_6_meses', largura: 1 },
          { titulo: 'Despesas por Categoria', tipo_grafico: 'donut', metrica: 'despesas_categoria', periodo: 'ano_atual', largura: 1 },
        ],
      },
      {
        nome: 'Projeções e Futuro',
        descricao: 'Análise de recebimentos previstos e atendimentos futuros',
        eh_padrao: 0,
        widgets: [
          { titulo: 'Projeção Financeira (Próximos 6 Meses)', tipo_grafico: 'bar', metrica: 'projecao_financeira', periodo: 'proximos_6_meses', largura: 2 },
          { titulo: 'Tendência de Receita Futura', tipo_grafico: 'line', metrica: 'projecao_financeira', periodo: 'proximos_3_meses', largura: 1 },
          { titulo: 'Status das Cobranças', tipo_grafico: 'donut', metrica: 'cobrancas_status', periodo: 'ano_atual', largura: 1 },
        ],
      },
    ],
  },

  // =========================================================================
  // MEI 2: Confeitaria Artesanal e Doceria (Produção + Ficha Técnica)
  // =========================================================================
  {
    nome: 'Mariana Santos (Confeitaria Artesanal)',
    email: 'confeitaria@mei.com',
    config: {
      razao_social: 'Mariana Silva Santos Confeitaria MEI',
      nome_fantasia: 'Mari Bolos & Confeitaria Gourmet',
      cnpj: '23.456.789/0001-01',
      inscricao_municipal: '87654321',
      cep: '80010-000',
      logradouro: 'Rua XV de Novembro',
      numero: '500',
      bairro: 'Centro',
      municipio: 'Curitiba',
      uf: 'PR',
      codigo_municipio_ibge: '4106902',
      email_comercial: 'encomendas@maridoces.com.br',
      telefone_comercial: '(41) 98888-1111',
    },
    servicos: [
      { nome: 'Bolo de Festa Red Velvet 2kg', preco: 160.0, categoria: 'Bolos', descricao: 'Massa aveludada com recheio tradicional de cream cheese.' },
      { nome: 'Bolo Chocolate Belga com Morango 2kg', preco: 180.0, categoria: 'Bolos', descricao: 'Brigadeiro belga 54%, morangos frescos e massa chiffon.' },
      { nome: 'Caixa Brigadeiros Gourmet 50un', preco: 110.0, categoria: 'Doces', descricao: 'Sortidos: tradicional, pistache, ninho com nutella e churros.' },
      { nome: 'Kit Festa Completo 20 Pessoas', preco: 380.0, categoria: 'Kits', descricao: 'Bolo 2kg + 100 docinhos gourmet + 100 salgadinhos assados.' },
      { nome: 'Torta Holandesa Especial', preco: 95.0, categoria: 'Tortas', descricao: 'Creme holandês clássico com cobertura de ganache de chocolate meio amargo.' },
      { nome: 'Cento de Doces Finos para Casamento', preco: 220.0, categoria: 'Doces Finos', descricao: 'Caminha de nozes, trufa de limão siciliano e copinho physalis.' },
    ],
    clientes: [
      { nome: 'Patrícia Buffets & Decorações', telefone: '(41) 99111-2222', email: 'patricia@buffetfestas.com.br', endereco: 'Rua Sete de Setembro, 200, Curitiba - PR', observacoes: 'Parceira frequente para eventos corporativos e casamentos.' },
      { nome: 'Juliana Aniversários Infantis', telefone: '(41) 99222-3333', email: 'juliana.festas@gmail.com', endereco: 'Av. Batel, 1500, Curitiba - PR', observacoes: 'Encomendas sempre com 7 dias de antecedência.' },
      { nome: 'Renata Noivas & Cerimonial', telefone: '(41) 99333-4444', email: 'contato@renatacerimonial.com.br', endereco: 'Rua Comendador Araújo, 340, Curitiba - PR', observacoes: 'Exige degustação prévia dos doces finos.' },
      { nome: 'Colégio Integrado de Curitiba', telefone: '(41) 99444-5555', email: 'eventos@colegiointegrado.edu.br', endereco: 'Rua Brigadeiro Franco, 800, Curitiba - PR', observacoes: 'Festas de formatura e dias temáticos escolares.' },
      { nome: 'Fernando Silva (Cliente VIP)', telefone: '(41) 99555-6666', email: 'fernando.silva@empresa.com.br', endereco: 'Rua Marechal Deodoro, 600, Curitiba - PR', observacoes: 'Encomenda bolos mensais de aniversário da equipe.' },
    ],
    insumos: [
      { nome: 'Leite Condensado Moça 395g', unidade_base: 'un', quantidade_atual: 40, estoque_minimo: 10, custo_unitario: 5.80 },
      { nome: 'Farinha de Trigo Especial 1kg', unidade_base: 'g', quantidade_atual: 20000, estoque_minimo: 5000, custo_unitario: 0.0055 },
      { nome: 'Chocolate em Pó 50% Cacau Melken', unidade_base: 'g', quantidade_atual: 6000, estoque_minimo: 1500, custo_unitario: 0.038 },
      { nome: 'Manteiga Extra sem Sal', unidade_base: 'g', quantidade_atual: 4000, estoque_minimo: 1000, custo_unitario: 0.042 },
      { nome: 'Morango Fresco Selecionado', unidade_base: 'g', quantidade_atual: 3000, estoque_minimo: 800, custo_unitario: 0.026 },
      { nome: 'Caixa de Transporte para Bolo', unidade_base: 'un', quantidade_atual: 25, estoque_minimo: 5, custo_unitario: 4.50 },
    ],
    fichasTecnicas: [
      { servicoNome: 'Bolo Chocolate Belga com Morango 2kg', insumos: [
        { insumoNome: 'Leite Condensado Moça 395g', qtd: 4 },
        { insumoNome: 'Farinha de Trigo Especial 1kg', qtd: 500 },
        { insumoNome: 'Chocolate em Pó 50% Cacau Melken', qtd: 250 },
        { insumoNome: 'Manteiga Extra sem Sal', qtd: 150 },
        { insumoNome: 'Morango Fresco Selecionado', qtd: 400 },
        { insumoNome: 'Caixa de Transporte para Bolo', qtd: 1 },
      ]},
      { servicoNome: 'Caixa Brigadeiros Gourmet 50un', insumos: [
        { insumoNome: 'Leite Condensado Moça 395g', qtd: 3 },
        { insumoNome: 'Chocolate em Pó 50% Cacau Melken', qtd: 120 },
        { insumoNome: 'Manteiga Extra sem Sal', qtd: 60 },
      ]},
    ],
    faturamentoTarget: 39500,
    dashboards: [
      {
        nome: 'Principal',
        descricao: 'Visão consolidada de vendas e fluxo de caixa da confeitaria',
        eh_padrao: 1,
        widgets: [
          { titulo: 'Faturamento Anual MEI', tipo_grafico: 'radial_gauge', metrica: 'limite_mei', periodo: 'ano_atual', largura: 2 },
          { titulo: 'Fluxo de Caixa', tipo_grafico: 'area', metrica: 'fluxo_caixa', periodo: 'ultimos_6_meses', largura: 1 },
          { titulo: 'Produtos Mais Vendidos', tipo_grafico: 'bar', metrica: 'top_servicos', periodo: 'ano_atual', largura: 1 },
        ],
      },
      {
        nome: 'Custos e Despesas',
        descricao: 'Gestão de despesas com insumos e embalagens',
        eh_padrao: 0,
        widgets: [
          { titulo: 'Distribuição de Custos', tipo_grafico: 'donut', metrica: 'despesas_categoria', periodo: 'ano_atual', largura: 1 },
          { titulo: 'Funil de Encomendas', tipo_grafico: 'bar', metrica: 'funil_orcamentos', periodo: 'mes_atual', largura: 1 },
          { titulo: 'Previsão de Receita (Próximos 3 Meses)', tipo_grafico: 'bar', metrica: 'projecao_financeira', periodo: 'proximos_3_meses', largura: 2 },
        ],
      },
    ],
  },

  // =========================================================================
  // MEI 3: Salão de Beleza & Barbearia (Alto Volume de Atendimentos)
  // =========================================================================
  {
    nome: 'Lucas Oliveira (Barbearia & Estética)',
    email: 'barbearia@mei.com',
    config: {
      razao_social: 'Lucas Oliveira Barbearia MEI',
      nome_fantasia: 'Navalha de Ouro Barber Shop',
      cnpj: '34.567.890/0001-12',
      inscricao_municipal: '55667788',
      cep: '30130-000',
      logradouro: 'Avenida Afonso Pena',
      numero: '1500',
      bairro: 'Funcionários',
      municipio: 'Belo Horizonte',
      uf: 'MG',
      codigo_municipio_ibge: '3106200',
      email_comercial: 'contato@navalhaouro.com.br',
      telefone_comercial: '(31) 97777-3333',
    },
    servicos: [
      { nome: 'Corte Masculino Degradê / Fade', preco: 45.0, categoria: 'Cabelo', descricao: 'Corte moderno na tesoura e máquina com finalização com pomada matte.' },
      { nome: 'Barboterapia com Toalha Quente', preco: 40.0, categoria: 'Barba', descricao: 'Esfoliação facial, hidratação de barba com toalha vaporizada e navalhete.' },
      { nome: 'Combo Completo Cabelo + Barba', preco: 75.0, categoria: 'Combos', descricao: 'Corte estilizado + barba completa com design e hidratação.' },
      { nome: 'Selagem Capilar e Alinhamento', preco: 90.0, categoria: 'Tratamentos', descricao: 'Tratamento anti-frizz e redução de volume com produtos nobres.' },
      { nome: 'Pigmentação de Barba e Contorno', preco: 35.0, categoria: 'Barba', descricao: 'Camuflagem de fios brancos e definição precisa de linhas da barba.' },
      { nome: 'Assinatura Mensal Clube do Corte', preco: 130.0, categoria: 'Assinaturas', descricao: 'Cortes ilimitados no mês com horário preferencial agendado.' },
    ],
    clientes: [
      { nome: 'Felipe Alvarenga', telefone: '(31) 98111-0001', email: 'felipe.alvarenga@gmail.com', endereco: 'Rua da Bahia, 300, Belo Horizonte - MG', observacoes: 'Corte a cada 15 dias sem falta.' },
      { nome: 'Gabriel Medina Rocha', telefone: '(31) 98222-0002', email: 'gabriel.medina@yahoo.com', endereco: 'Av. Cristóvão Colombo, 450, Belo Horizonte - MG', observacoes: 'Barba semanal e degrade alto.' },
      { nome: 'Thiago Martins Costa', telefone: '(31) 98333-0003', email: 'thiago.costa@empresa.com.br', endereco: 'Rua Paraíba, 800, Belo Horizonte - MG', observacoes: 'Assinante do Clube do Corte.' },
      { nome: 'Leonardo Souza Dias', telefone: '(31) 98444-0004', email: 'leo.souza@gmail.com', endereco: 'Rua Sergipe, 600, Belo Horizonte - MG', observacoes: 'Gosta de atendimento no final do dia.' },
      { nome: 'Matheus Cunha Santos', telefone: '(31) 98555-0005', email: 'matheus.cunha@hotmail.com', endereco: 'Av. Getúlio Vargas, 1200, Belo Horizonte - MG', observacoes: 'Selagem a cada 2 meses.' },
      { nome: 'André Villas-Boas', telefone: '(31) 98666-0006', email: 'andre.villas@advocacia.com.br', endereco: 'Rua Guajajaras, 950, Belo Horizonte - MG', observacoes: 'Cliente pontual.' },
    ],
    insumos: [
      { nome: 'Lâminas Descartáveis Derby (caixa 100un)', unidade_base: 'un', quantidade_atual: 15, estoque_minimo: 3, custo_unitario: 28.00 },
      { nome: 'Pomada Modeladora Efeito Matte 150g', unidade_base: 'un', quantidade_atual: 20, estoque_minimo: 5, custo_unitario: 22.50 },
      { nome: 'Óleo para Barba Hidratante 30ml', unidade_base: 'un', quantidade_atual: 12, estoque_minimo: 4, custo_unitario: 18.00 },
      { nome: 'Shampoo Antirresíduo 1L', unidade_base: 'un', quantidade_atual: 6, estoque_minimo: 2, custo_unitario: 35.00 },
    ],
    // Faturamento próximo ao limite do MEI: ~R$ 69.800 (86% do teto - Alerta Âmbar!)
    faturamentoTarget: 69800,
    dashboards: [
      {
        nome: 'Alerta de Faturamento & Teto',
        descricao: 'Acompanhamento do teto anual do MEI e controle de crescimento',
        eh_padrao: 1,
        widgets: [
          { titulo: 'Teto MEI (Atenção ao Limite)', tipo_grafico: 'radial_gauge', metrica: 'limite_mei', periodo: 'ano_atual', largura: 2 },
          { titulo: 'Evolução Mensal de Cortes', tipo_grafico: 'line', metrica: 'fluxo_caixa', periodo: 'ultimos_6_meses', largura: 1 },
          { titulo: 'Novos Clientes no Mês', tipo_grafico: 'bar', metrica: 'novos_clientes', periodo: 'ultimos_6_meses', largura: 1 },
        ],
      },
      {
        nome: 'Agenda e Previsões',
        descricao: 'Previsões de fluxo e atendimentos da barbearia',
        eh_padrao: 0,
        widgets: [
          { titulo: 'Previsão de Atendimentos (Próximos 30 Dias)', tipo_grafico: 'bar', metrica: 'projecao_financeira', periodo: 'proximos_30_dias', largura: 2 },
          { titulo: 'Serviços Mais Procurados', tipo_grafico: 'bar', metrica: 'top_servicos', periodo: 'ano_atual', largura: 1 },
          { titulo: 'Despesas com Produtos', tipo_grafico: 'donut', metrica: 'despesas_categoria', periodo: 'ano_atual', largura: 1 },
        ],
      },
    ],
  },

  // =========================================================================
  // MEI 4: Mecânica de Motos e Oficina Rápida (Serviços + Peças)
  // =========================================================================
  {
    nome: 'Rodrigo Pires (Mecânica e Moto Peças)',
    email: 'mecanica@mei.com',
    config: {
      razao_social: 'Rodrigo Pires Manutenção de Motocicletas MEI',
      nome_fantasia: 'RP Moto Garage & Oficina',
      cnpj: '45.678.901/0001-23',
      inscricao_municipal: '99887766',
      cep: '20260-000',
      logradouro: 'Rua Conde de Bonfim',
      numero: '750',
      bairro: 'Tijuca',
      municipio: 'Rio de Janeiro',
      uf: 'RJ',
      codigo_municipio_ibge: '3304557',
      email_comercial: 'contato@rpmotogarage.com.br',
      telefone_comercial: '(21) 98765-9999',
    },
    servicos: [
      { nome: 'Troca de Óleo e Filtro de Motor', preco: 60.0, categoria: 'Manutenção', descricao: 'Troca de óleo lubrificante mineral ou sintético com anel de vedação.' },
      { nome: 'Revisão Geral de Freios e Relação', preco: 150.0, categoria: 'Revisão', descricao: 'Limpeza, lubrificação de cabos, sangria de fluido e ajuste da corrente.' },
      { nome: 'Limpeza e Regulagem de Injeção Eletrônica', preco: 130.0, categoria: 'Injeção', descricao: 'Diagnóstico por scanner e descarbonização do corpo de borboleta.' },
      { nome: 'Troca de Pneu Traseiro com Balanceamento', preco: 80.0, categoria: 'Pneus', descricao: 'Montagem de pneu novo, câmara de ar e balanceamento estático.' },
      { nome: 'Socorro Mecânico e Reboque Urbano', preco: 180.0, categoria: 'Emergência', descricao: 'Resgate de moto com pane elétrica ou mecânica na região metropolitana.' },
      { nome: 'Revisão Elétrica e Troca de Estator', preco: 140.0, categoria: 'Elétrica', descricao: 'Teste de bateria, regulador de voltagem e fiação principal.' },
    ],
    clientes: [
      { nome: 'Marcelo Motoboy Express', telefone: '(21) 99111-8888', email: 'marcelo.express@entregas.com.br', endereco: 'Rua Haddock Lobo, 200, Rio de Janeiro - RJ', observacoes: 'Frota de 4 motos de entrega. Manutenção quinzenal.' },
      { nome: 'Associação dos Entregadores da Tijuca', telefone: '(21) 99222-7777', email: 'contato@entregadorestijuca.org', endereco: 'Praça Saenz Peña, 50, Rio de Janeiro - RJ', observacoes: 'Tabela conveniada com desconto de 10% em mão de obra.' },
      { nome: 'Vinícius Pacheco', telefone: '(21) 99333-6666', email: 'vinicius.pacheco@globo.com', endereco: 'Rua Mariz e Barros, 400, Rio de Janeiro - RJ', observacoes: 'Moto esportiva Honda CB500.' },
      { nome: 'Tiago Santos Oliveira', telefone: '(21) 99444-5555', email: 'tiago.santos@gmail.com', endereco: 'Rua São Francisco Xavier, 300, Rio de Janeiro - RJ', observacoes: 'Yamaha Fazer 250 de uso diário.' },
    ],
    insumos: [
      { nome: 'Óleo Motor Motul 10W40 Semissintético 1L', unidade_base: 'ml', quantidade_atual: 15000, estoque_minimo: 4000, custo_unitario: 0.038 },
      { nome: 'Pastilha de Freio Cobreq Dianteira', unidade_base: 'un', quantidade_atual: 12, estoque_minimo: 4, custo_unitario: 24.00 },
      { nome: 'Vela de Ignição NGK Resistiva', unidade_base: 'un', quantidade_atual: 10, estoque_minimo: 3, custo_unitario: 16.50 },
      { nome: 'Kit Relação Transmissão DID (Coroa/Pinhão/Corrente)', unidade_base: 'un', quantidade_atual: 5, estoque_minimo: 2, custo_unitario: 88.00 },
    ],
    faturamentoTarget: 34000,
    dashboards: [
      {
        nome: 'Visão Geral da Oficina',
        descricao: 'Acompanhamento financeiro e status de pagamentos',
        eh_padrao: 1,
        widgets: [
          { titulo: 'Termômetro Anual MEI', tipo_grafico: 'radial_gauge', metrica: 'limite_mei', periodo: 'ano_atual', largura: 2 },
          { titulo: 'Entradas e Saídas', tipo_grafico: 'bar', metrica: 'fluxo_caixa', periodo: 'ultimos_6_meses', largura: 1 },
          { titulo: 'Inadimplência e Cobranças', tipo_grafico: 'donut', metrica: 'cobrancas_status', periodo: 'ano_atual', largura: 1 },
        ],
      },
      {
        nome: 'Previsões de Recebimento',
        descricao: 'Projeções futuras e fluxo de caixa projetado',
        eh_padrao: 0,
        widgets: [
          { titulo: 'Recebimentos Projetados (Próximos 60 Dias)', tipo_grafico: 'line', metrica: 'projecao_financeira', periodo: 'proximos_60_dias', largura: 2 },
          { titulo: 'Serviços Campeões', tipo_grafico: 'bar', metrica: 'top_servicos', periodo: 'ano_atual', largura: 1 },
          { titulo: 'Despesas da Oficina', tipo_grafico: 'donut', metrica: 'despesas_categoria', periodo: 'ano_atual', largura: 1 },
        ],
      },
    ],
  },

  // =========================================================================
  // MEI 5: Consultoria em TI e Redes (Alerta Vermelho de Limite MEI > 90%)
  // =========================================================================
  {
    nome: 'Camila Fernandes (Consultoria em TI)',
    email: 'suporte.ti@mei.com',
    config: {
      razao_social: 'Camila Fernandes Tecnologia MEI',
      nome_fantasia: 'ByteSeg Soluções em TI & Cloud',
      cnpj: '56.789.012/0001-34',
      inscricao_municipal: '11223344',
      cep: '88015-000',
      logradouro: 'Rua Bocaiúva',
      numero: '900',
      bairro: 'Centro',
      municipio: 'Florianópolis',
      uf: 'SC',
      codigo_municipio_ibge: '4205407',
      email_comercial: 'contato@byteseg.com.br',
      telefone_comercial: '(48) 98888-7777',
    },
    servicos: [
      { nome: 'Contrato Mensal de Suporte e Monitoramento', preco: 850.0, categoria: 'Suporte Recorrente', descricao: 'Monitoramento de servidores, helpdesk remoto ilimitado e gestão de patches.' },
      { nome: 'Implantação de Servidor Local e Backup em Nuvem', preco: 1800.0, categoria: 'Infraestrutura', descricao: 'Instalação de NAS, configuração de RAID e sincronização segura com AWS S3.' },
      { nome: 'Auditoria de Segurança da Informação e LGPD', preco: 2200.0, categoria: 'Consultoria', descricao: 'Análise de vulnerabilidades, inventário de dados sensíveis e relatório técnico.' },
      { nome: 'Configuração de Firewall e VPN Corporativa', preco: 650.0, categoria: 'Segurança', descricao: 'Configuração de regras de proteção e acesso remoto criptografado para colaboradores.' },
      { nome: 'Otimização de Parque de Máquinas (Até 10 PCs)', preco: 500.0, categoria: 'Manutenção', descricao: 'Limpeza de software malicioso, upgrade para SSD e clonagem de sistema.' },
    ],
    clientes: [
      { nome: 'Clínica Médica Vida & Saúde', telefone: '(48) 99111-3333', email: 'adm@clinicavidaesaude.med.br', endereco: 'Av. Trompowsky, 200, Florianópolis - SC', observacoes: 'Contrato recorrente mensal de suporte + conformidade LGPD.' },
      { nome: 'Advocacia Mendes & Associados', telefone: '(48) 99222-4444', email: 'mendes@mendesadvogados.com.br', endereco: 'Rua Felipe Schmidt, 600, Florianópolis - SC', observacoes: 'Servidor de arquivos com sigilo absoluto e backup redundante.' },
      { nome: 'Contabilidade Horizonte Sul', telefone: '(48) 99333-5555', email: 'diretoria@horizontesul.cnt.br', endereco: 'Rua Tenente Silveira, 450, Florianópolis - SC', observacoes: 'Contrato corporativo há mais de 2 anos.' },
      { nome: 'Studio de Arquitetura Forma', telefone: '(48) 99444-6666', email: 'projetos@studioforma.arq.br', endereco: 'Rua Almirante Lamego, 700, Florianópolis - SC', observacoes: 'Estações gráficas de alta performance para renderização 3D.' },
    ],
    insumos: [
      { nome: 'Patch Cord Cat6 Furukawa 2m', unidade_base: 'un', quantidade_atual: 25, estoque_minimo: 5, custo_unitario: 14.50 },
      { nome: 'Conector RJ45 Macho Cat6 (pacote 50un)', unidade_base: 'un', quantidade_atual: 4, estoque_minimo: 1, custo_unitario: 38.00 },
      { nome: 'SSD Kingston 480GB SATA III', unidade_base: 'un', quantidade_atual: 6, estoque_minimo: 2, custo_unitario: 165.00 },
    ],
    // Faturamento próximo a estourar o MEI: ~R$ 75.200 (92.8% do teto - Alerta Vermelho de Desenquadramento!)
    faturamentoTarget: 75200,
    dashboards: [
      {
        nome: 'Alerta Fiscal e Teto Anual',
        descricao: 'Monitoramento crítico do teto MEI e planejamento de transição para ME',
        eh_padrao: 1,
        widgets: [
          { titulo: 'Teto MEI (Alerta de Desenquadramento)', tipo_grafico: 'radial_gauge', metrica: 'limite_mei', periodo: 'ano_atual', largura: 2 },
          { titulo: 'Projeção de Contratos (Próximos 12 Meses)', tipo_grafico: 'area', metrica: 'projecao_financeira', periodo: 'proximos_12_meses', largura: 2 },
          { titulo: 'Serviços de Maior Receita', tipo_grafico: 'bar', metrica: 'top_servicos', periodo: 'ano_atual', largura: 1 },
          { titulo: 'Status de Cobranças Recorrentes', tipo_grafico: 'donut', metrica: 'cobrancas_status', periodo: 'ano_atual', largura: 1 },
        ],
      },
    ],
  },
];

/**
 * Função utilitária para formatar datas no padrão SQL 'YYYY-MM-DD'
 */
function formatarDataSql(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Função utilitária para formatar data e hora no padrão SQL 'YYYY-MM-DD HH:mm:ss'
 */
function formatarDataHoraSql(data, hora = '10:00:00') {
  return `${formatarDataSql(data)} ${hora}`;
}

async function seed() {
  const connection = await pool.getConnection();
  try {
    console.log('================================================================');
    console.log('🌱 INICIANDO SEED MULTI-TENANT DE DADOS PARA DIVERSOS MEIs');
    console.log('================================================================\n');

    await connection.beginTransaction();

    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth(); // 0 a 11

    const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);

    for (const mei of MEIS_DATA) {
      console.log(`\n🏢 Processando MEI: ${mei.nome} (${mei.email})...`);

      // 1. Limpeza de dados prévios deste e-mail
      const [existingUsers] = await connection.execute(
        'SELECT id FROM usuarios WHERE email = ?',
        [mei.email]
      );

      if (existingUsers.length > 0) {
        const userId = existingUsers[0].id;
        console.log(`   🧹 Removendo registros antigos (ID: ${userId})...`);
        await connection.execute('DELETE FROM movimentacoes WHERE usuario_id = ?', [userId]);
        await connection.execute('DELETE FROM cobrancas WHERE usuario_id = ?', [userId]);
        await connection.execute('DELETE FROM agendamentos WHERE usuario_id = ?', [userId]);
        await connection.execute(
          'DELETE FROM orcamento_itens WHERE orcamento_id IN (SELECT id FROM orcamentos WHERE usuario_id = ?)',
          [userId]
        );
        await connection.execute('DELETE FROM orcamentos WHERE usuario_id = ?', [userId]);
        await connection.execute('DELETE FROM estoque_movimentacoes WHERE usuario_id = ?', [userId]);
        await connection.execute('DELETE FROM fichas_tecnicas WHERE usuario_id = ?', [userId]);
        await connection.execute('DELETE FROM insumos WHERE usuario_id = ?', [userId]);
        await connection.execute('DELETE FROM mei_configuracoes WHERE usuario_id = ?', [userId]);
        await connection.execute('DELETE FROM dashboard_widgets WHERE usuario_id = ?', [userId]);
        await connection.execute('DELETE FROM dashboards_usuario WHERE usuario_id = ?', [userId]);
        await connection.execute('DELETE FROM notas_fiscais WHERE usuario_id = ?', [userId]);
        await connection.execute('DELETE FROM conversas WHERE usuario_id = ?', [userId]);
        await connection.execute('DELETE FROM servicos WHERE usuario_id = ?', [userId]);
        await connection.execute('DELETE FROM clientes WHERE usuario_id = ?', [userId]);
        await connection.execute('DELETE FROM usuarios WHERE id = ?', [userId]);
      }

      // 2. Cria Usuário MEI
      const [userRes] = await connection.execute(
        'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
        [mei.nome, mei.email, senhaHash]
      );
      const usuarioId = userRes.insertId;
      console.log(`   ✅ Usuário criado com ID: ${usuarioId}`);

      // 3. Cadastra Configurações Cadastrais e Fiscais
      if (mei.config) {
        await connection.execute(
          `INSERT INTO mei_configuracoes (
            usuario_id, razao_social, nome_fantasia, cnpj, inscricao_municipal,
            cep, logradouro, numero, bairro, municipio, uf, codigo_municipio_ibge,
            email_comercial, telefone_comercial, ambiente_fiscal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'HOMOLOGACAO')`,
          [
            usuarioId, mei.config.razao_social, mei.config.nome_fantasia, mei.config.cnpj,
            mei.config.inscricao_municipal, mei.config.cep, mei.config.logradouro,
            mei.config.numero, mei.config.bairro, mei.config.municipio, mei.config.uf,
            mei.config.codigo_municipio_ibge, mei.config.email_comercial, mei.config.telefone_comercial
          ]
        );
        console.log(`   ✅ Dados cadastrais e fiscais configurados`);
      }

      // 4. Cadastra Serviços
      const servicoIds = {};
      for (const s of mei.servicos) {
        const [res] = await connection.execute(
          `INSERT INTO servicos (usuario_id, nome, descricao, preco, categoria, ativo)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [usuarioId, s.nome, s.descricao, s.preco, s.categoria]
        );
        servicoIds[s.nome] = res.insertId;
      }
      console.log(`   ✅ ${mei.servicos.length} Serviços cadastrados no catálogo`);

      // 5. Cadastra Clientes
      const clienteIds = {};
      for (const c of mei.clientes) {
        const [res] = await connection.execute(
          `INSERT INTO clientes (usuario_id, nome, telefone, email, endereco, observacoes, ativo)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [usuarioId, c.nome, c.telefone, c.email, c.endereco, c.observacoes]
        );
        clienteIds[c.nome] = res.insertId;
      }
      console.log(`   ✅ ${mei.clientes.length} Clientes cadastrados`);

      // 6. Cadastra Insumos (se houver)
      const insumoIds = {};
      if (mei.insumos && mei.insumos.length > 0) {
        for (const ins of mei.insumos) {
          const [res] = await connection.execute(
            `INSERT INTO insumos (usuario_id, nome, unidade_base, quantidade_atual, estoque_minimo, custo_unitario, ativo)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [usuarioId, ins.nome, ins.unidade_base, ins.quantidade_atual, ins.estoque_minimo, ins.custo_unitario]
          );
          insumoIds[ins.nome] = res.insertId;
        }
        console.log(`   ✅ ${mei.insumos.length} Insumos de estoque cadastrados`);
      }

      // 7. Cadastra Fichas Técnicas (se houver)
      if (mei.fichasTecnicas && mei.fichasTecnicas.length > 0) {
        for (const ft of mei.fichasTecnicas) {
          const sId = servicoIds[ft.servicoNome];
          if (sId) {
            for (const item of ft.insumos) {
              const iId = insumoIds[item.insumoNome];
              if (iId) {
                await connection.execute(
                  `INSERT INTO fichas_tecnicas (usuario_id, servico_id, insumo_id, quantidade_necessaria)
                   VALUES (?, ?, ?, ?)`,
                  [usuarioId, sId, iId, item.qtd]
                );
              }
            }
          }
        }
        console.log(`   ✅ Fichas técnicas vinculadas`);
      }

      // 8. Gera Orçamentos, Agendamentos e Cobranças (Passados e Futuros)
      // Garantir cadeia líquida exigida por testes para o admin@mei.com
      const c1Nome = mei.clientes[0].nome;
      const c2Nome = mei.clientes[1].nome;
      const c3Nome = mei.clientes[2]?.nome || c1Nome;
      const c4Nome = mei.clientes[3]?.nome || c2Nome;

      const s1Nome = mei.servicos[0].nome;
      const s2Nome = mei.servicos[1]?.nome || s1Nome;
      const s3Nome = mei.servicos[2]?.nome || s1Nome;

      const s1Preco = mei.servicos[0].preco;
      const s2Preco = mei.servicos[1]?.preco || s1Preco;
      const s3Preco = mei.servicos[2]?.preco || s1Preco;

      const dataHa10Dias = new Date(hoje);
      dataHa10Dias.setDate(hoje.getDate() - 10);
      const strDataHa10Dias = formatarDataSql(dataHa10Dias);

      const dataHa3Dias = new Date(hoje);
      dataHa3Dias.setDate(hoje.getDate() - 3);
      const strDataHa3Dias = formatarDataSql(dataHa3Dias);

      const strDataHoje = formatarDataSql(hoje);

      const dataEm5Dias = new Date(hoje);
      dataEm5Dias.setDate(hoje.getDate() + 5);
      const strDataEm5Dias = formatarDataSql(dataEm5Dias);

      const dataEm15Dias = new Date(hoje);
      dataEm15Dias.setDate(hoje.getDate() + 15);
      const strDataEm15Dias = formatarDataSql(dataEm15Dias);

      const dataEm30Dias = new Date(hoje);
      dataEm30Dias.setDate(hoje.getDate() + 30);
      const strDataEm30Dias = formatarDataSql(dataEm30Dias);

      const dataEm60Dias = new Date(hoje);
      dataEm60Dias.setDate(hoje.getDate() + 60);
      const strDataEm60Dias = formatarDataSql(dataEm60Dias);

      // --- Orçamento 1 (APROVADO -> Concluído -> PAGO -> Livro Caixa) ---
      const totalOrc1 = s1Preco + s2Preco;
      const [resOrc1] = await connection.execute(
        `INSERT INTO orcamentos (usuario_id, cliente_id, data_emissao, validade, status, subtotal, desconto, total, observacoes)
         VALUES (?, ?, ?, ?, 'APROVADO', ?, 0.00, ?, 'Orçamento aprovado e executado com sucesso.')`,
        [usuarioId, clienteIds[c1Nome], strDataHa10Dias, strDataEm15Dias, totalOrc1, totalOrc1]
      );
      const orc1Id = resOrc1.insertId;
      await connection.execute(
        `INSERT INTO orcamento_itens (orcamento_id, servico_id, quantidade, preco_unitario, subtotal)
         VALUES (?, ?, 1, ?, ?), (?, ?, 1, ?, ?)`,
        [orc1Id, servicoIds[s1Nome], s1Preco, s1Preco, orc1Id, servicoIds[s2Nome], s2Preco, s2Preco]
      );

      // Agendamento 1 Concluído
      const [resAg1] = await connection.execute(
        `INSERT INTO agendamentos (usuario_id, cliente_id, orcamento_id, servico_id, data_hora, status, observacoes)
         VALUES (?, ?, ?, ?, ?, 'CONCLUIDO', 'Atendimento concluído conforme especificações do cliente.')`,
        [usuarioId, clienteIds[c1Nome], orc1Id, servicoIds[s1Nome], formatarDataHoraSql(dataHa3Dias, '09:00:00')]
      );
      const ag1Id = resAg1.insertId;

      // Cobrança 1 Paga
      const [resCob1] = await connection.execute(
        `INSERT INTO cobrancas (usuario_id, cliente_id, agendamento_id, orcamento_id, valor, vencimento, status, data_pagamento, observacoes)
         VALUES (?, ?, ?, ?, ?, ?, 'PAGO', ?, 'Pagamento recebido integral via Pix.')`,
        [usuarioId, clienteIds[c1Nome], ag1Id, orc1Id, totalOrc1, strDataHa3Dias, strDataHa3Dias]
      );
      const cob1Id = resCob1.insertId;

      // Movimentação Caixa da Cobrança 1
      await connection.execute(
        `INSERT INTO movimentacoes (usuario_id, cobranca_id, tipo, categoria, valor, data_movimentacao, descricao)
         VALUES (?, ?, 'ENTRADA', 'Recebimento de Cobrança', ?, ?, ?)`,
        [usuarioId, cob1Id, totalOrc1, strDataHa3Dias, `Recebimento ref. cobrança #${cob1Id} (${c1Nome})`]
      );

      // --- Orçamento 2 (APROVADO -> Concluído -> Cobrança PENDENTE nos próximos dias) ---
      const totalOrc2 = s1Preco;
      const [resOrc2] = await connection.execute(
        `INSERT INTO orcamentos (usuario_id, cliente_id, data_emissao, validade, status, subtotal, desconto, total, observacoes)
         VALUES (?, ?, ?, ?, 'APROVADO', ?, 0.00, ?, 'Serviço concluído, aguardando liquidação.')`,
        [usuarioId, clienteIds[c2Nome], strDataHa3Dias, strDataEm15Dias, totalOrc2, totalOrc2]
      );
      const orc2Id = resOrc2.insertId;
      await connection.execute(
        `INSERT INTO orcamento_itens (orcamento_id, servico_id, quantidade, preco_unitario, subtotal)
         VALUES (?, ?, 1, ?, ?)`,
        [orc2Id, servicoIds[s1Nome], s1Preco, s1Preco]
      );

      const [resAg2] = await connection.execute(
        `INSERT INTO agendamentos (usuario_id, cliente_id, orcamento_id, servico_id, data_hora, status, observacoes)
         VALUES (?, ?, ?, ?, ?, 'CONCLUIDO', 'Serviço realizado perfeitamente.')`,
        [usuarioId, clienteIds[c2Nome], orc2Id, servicoIds[s1Nome], formatarDataHoraSql(hoje, '11:00:00')]
      );
      const ag2Id = resAg2.insertId;

      // Cobrança a vencer em 5 dias (Futura)
      await connection.execute(
        `INSERT INTO cobrancas (usuario_id, cliente_id, agendamento_id, orcamento_id, valor, vencimento, status, observacoes)
         VALUES (?, ?, ?, ?, ?, ?, 'PENDENTE', 'Aguardando compensação bancária.')`,
        [usuarioId, clienteIds[c2Nome], ag2Id, orc2Id, totalOrc2, strDataEm5Dias]
      );

      // --- Orçamento 3 (ENVIADO / Negociação) ---
      const totalOrc3 = s3Preco * 2;
      const [resOrc3] = await connection.execute(
        `INSERT INTO orcamentos (usuario_id, cliente_id, data_emissao, validade, status, subtotal, desconto, total, observacoes)
         VALUES (?, ?, ?, ?, 'ENVIADO', ?, 0.00, ?, 'Proposta enviada ao cliente via WhatsApp.')`,
        [usuarioId, clienteIds[c3Nome], strDataHoje, strDataEm15Dias, totalOrc3, totalOrc3]
      );
      const orc3Id = resOrc3.insertId;
      await connection.execute(
        `INSERT INTO orcamento_itens (orcamento_id, servico_id, quantidade, preco_unitario, subtotal)
         VALUES (?, ?, 2, ?, ?)`,
        [orc3Id, servicoIds[s3Nome], s3Preco, totalOrc3]
      );

      // --- Orçamento 4 (RASCUNHO) ---
      const [resOrc4] = await connection.execute(
        `INSERT INTO orcamentos (usuario_id, cliente_id, data_emissao, validade, status, subtotal, desconto, total, observacoes)
         VALUES (?, ?, ?, ?, 'RASCUNHO', ?, 0.00, ?, 'Rascunho de proposta preliminar.')`,
        [usuarioId, clienteIds[c4Nome], strDataHoje, strDataEm30Dias, s2Preco, s2Preco]
      );
      const orc4Id = resOrc4.insertId;
      await connection.execute(
        `INSERT INTO orcamento_itens (orcamento_id, servico_id, quantidade, preco_unitario, subtotal)
         VALUES (?, ?, 1, ?, ?)`,
        [orc4Id, servicoIds[s2Nome], s2Preco, s2Preco]
      );

      // --- Cobranças Futuras Adicionais (para alimentar a métrica projecao_financeira) ---
      // Cobrança a vencer em 30 dias
      await connection.execute(
        `INSERT INTO cobrancas (usuario_id, cliente_id, agendamento_id, orcamento_id, valor, vencimento, status, observacoes)
         VALUES (?, ?, NULL, NULL, ?, ?, 'PENDENTE', 'Parcela 1/2 prevista para o próximo mês.')`,
        [usuarioId, clienteIds[c3Nome], (s2Preco * 1.5).toFixed(2), strDataEm30Dias]
      );

      // Cobrança a vencer em 60 dias
      await connection.execute(
        `INSERT INTO cobrancas (usuario_id, cliente_id, agendamento_id, orcamento_id, valor, vencimento, status, observacoes)
         VALUES (?, ?, NULL, NULL, ?, ?, 'PENDENTE', 'Parcela 2/2 prevista para 60 dias.')`,
        [usuarioId, clienteIds[c3Nome], (s2Preco * 1.5).toFixed(2), strDataEm60Dias]
      );

      // Cobrança Atrasada (para testar indicador de atraso)
      await connection.execute(
        `INSERT INTO cobrancas (usuario_id, cliente_id, agendamento_id, orcamento_id, valor, vencimento, status, observacoes)
         VALUES (?, ?, NULL, NULL, ?, ?, 'ATRASADO', 'Cobrança vencida. Lembrete enviado por WhatsApp.')`,
        [usuarioId, clienteIds[c4Nome], (s1Preco * 0.8).toFixed(2), strDataHa10Dias]
      );

      // --- Agendamentos Futuros com Serviços Vinculados (para alimentar projecao_financeira) ---
      // Agendamento Confirmado em 5 dias
      await connection.execute(
        `INSERT INTO agendamentos (usuario_id, cliente_id, servico_id, data_hora, status, observacoes)
         VALUES (?, ?, ?, ?, 'CONFIRMADO', 'Atendimento confirmado no local do cliente.')`,
        [usuarioId, clienteIds[c1Nome], servicoIds[s2Nome], formatarDataHoraSql(dataEm5Dias, '14:00:00')]
      );

      // Agendamento Confirmado em 15 dias
      await connection.execute(
        `INSERT INTO agendamentos (usuario_id, cliente_id, servico_id, data_hora, status, observacoes)
         VALUES (?, ?, ?, ?, 'CONFIRMADO', 'Serviço agendado e confirmado.')`,
        [usuarioId, clienteIds[c2Nome], servicoIds[s3Nome], formatarDataHoraSql(dataEm15Dias, '10:30:00')]
      );

      // Agendamento Pendente em 30 dias
      await connection.execute(
        `INSERT INTO agendamentos (usuario_id, cliente_id, servico_id, data_hora, status, observacoes)
         VALUES (?, ?, ?, ?, 'PENDENTE', 'Aguardando confirmação de horário do cliente.')`,
        [usuarioId, clienteIds[c3Nome], servicoIds[s1Nome], formatarDataHoraSql(dataEm30Dias, '15:00:00')]
      );

      console.log(`   ✅ Orçamentos, Agendamentos e Cobranças (Passados e Futuros) gerados`);

      // 9. Gera Histórico Financeiro Realista no Ano (Distribuição de Movimentações)
      // Ajusta o montante de entradas para bater próximo do faturamentoTarget do MEI
      const target = mei.faturamentoTarget || 40000;
      const mesesPassados = Math.max(1, mesAtual); // quantos meses do ano já se passaram
      const mediaMensal = target / (mesAtual + 1);

      let totalFaturadoAcumulado = totalOrc1; // Já incluímos orc1 pago

      for (let m = 0; m <= mesAtual; m++) {
        // Gera 2 a 4 entradas por mês
        const qtdEntradasMes = m === mesAtual ? 2 : 3;
        for (let i = 1; i <= qtdEntradasMes; i++) {
          const dia = Math.min(28, i * 7 + (m % 3));
          const dataMov = new Date(anoAtual, m, dia);
          if (dataMov > hoje) continue;

          // Valor proporcional com variação orgânica
          const variacao = 0.8 + ((m * 7 + i * 11) % 40) / 100; // entre 0.8 e 1.2
          const valorEntrada = Number(((mediaMensal / qtdEntradasMes) * variacao).toFixed(2));
          const clienteRef = mei.clientes[(m + i) % mei.clientes.length].nome;
          const servicoRef = mei.servicos[(m + i) % mei.servicos.length].nome;

          await connection.execute(
            `INSERT INTO movimentacoes (usuario_id, cobranca_id, tipo, categoria, valor, data_movimentacao, descricao)
             VALUES (?, NULL, 'ENTRADA', 'Serviço', ?, ?, ?)`,
            [usuarioId, valorEntrada, formatarDataSql(dataMov), `Recebimento à vista: ${servicoRef} (${clienteRef})`]
          );
          totalFaturadoAcumulado += valorEntrada;
        }

        // Gera Saídas Fixas e Variáveis do mês
        // Saída Fixa 1: DAS-MEI (sempre perto do dia 20)
        const dataDas = new Date(anoAtual, m, 20);
        if (dataDas <= hoje) {
          await connection.execute(
            `INSERT INTO movimentacoes (usuario_id, cobranca_id, tipo, categoria, valor, data_movimentacao, descricao)
             VALUES (?, NULL, 'SAIDA', 'DAS-MEI', 75.00, ?, 'Pagamento Documento de Arrecadação do MEI (DAS)')`,
            [usuarioId, formatarDataSql(dataDas)]
          );
        }

        // Saída 2: Materiais / Insumos
        const dataInsumos = new Date(anoAtual, m, 8);
        if (dataInsumos <= hoje) {
          const valorMat = Number((180 + ((m * 13) % 150)).toFixed(2));
          await connection.execute(
            `INSERT INTO movimentacoes (usuario_id, cobranca_id, tipo, categoria, valor, data_movimentacao, descricao)
             VALUES (?, NULL, 'SAIDA', 'Material', ?, ?, 'Reposição de insumos e consumíveis de trabalho')`,
            [usuarioId, valorMat, formatarDataSql(dataInsumos)]
          );
        }

        // Saída 3: Transporte / Combustível
        const dataTransp = new Date(anoAtual, m, 16);
        if (dataTransp <= hoje) {
          const valorTransp = Number((90 + ((m * 17) % 80)).toFixed(2));
          await connection.execute(
            `INSERT INTO movimentacoes (usuario_id, cobranca_id, tipo, categoria, valor, data_movimentacao, descricao)
             VALUES (?, NULL, 'SAIDA', 'Transporte', ?, ?, 'Combustível e passagens para visitas e atendimentos')`,
            [usuarioId, valorTransp, formatarDataSql(dataTransp)]
          );
        }

        // Saída 4: Energia / Infraestrutura
        const dataEnergia = new Date(anoAtual, m, 25);
        if (dataEnergia <= hoje) {
          const valorEnergia = Number((110 + ((m * 9) % 70)).toFixed(2));
          await connection.execute(
            `INSERT INTO movimentacoes (usuario_id, cobranca_id, tipo, categoria, valor, data_movimentacao, descricao)
             VALUES (?, NULL, 'SAIDA', 'Utilidades', ?, ?, 'Fatura mensal de energia e internet comercial')`,
            [usuarioId, valorEnergia, formatarDataSql(dataEnergia)]
          );
        }
      }

      console.log(`   ✅ Livro Caixa populado: Faturamento anual aproximado de R$ ${totalFaturadoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

      // 10. Cria Dashboards Customizados e seus Widgets
      if (mei.dashboards && mei.dashboards.length > 0) {
        let dashOrdem = 0;
        for (const dash of mei.dashboards) {
          const [resDash] = await connection.execute(
            `INSERT INTO dashboards_usuario (usuario_id, nome, descricao, eh_padrao, ordem)
             VALUES (?, ?, ?, ?, ?)`,
            [usuarioId, dash.nome, dash.descricao, dash.eh_padrao, dashOrdem++]
          );
          const dashboardId = resDash.insertId;

          let widgetOrdem = 0;
          for (const w of dash.widgets) {
            await connection.execute(
              `INSERT INTO dashboard_widgets (
                dashboard_id, usuario_id, titulo, tipo_grafico, metrica, periodo, largura, ordem
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                dashboardId,
                usuarioId,
                w.titulo,
                w.tipo_grafico,
                w.metrica,
                w.periodo,
                w.largura,
                widgetOrdem++,
              ]
            );
          }
        }
        console.log(`   ✅ ${mei.dashboards.length} Dashboards com widgets analíticos configurados`);
      }
    }

    await connection.commit();
    console.log('\n================================================================');
    console.log('🎉 SEED MULTI-TENANT CONCLUÍDO COM ÊXITO!');
    console.log('================================================================');
    console.log('🔑 MEIs DISPONÍVEIS PARA TESTES (TODOS COM SENHA: ' + SENHA_PADRAO + '):');
    MEIS_DATA.forEach((m, idx) => {
      console.log(`\n  ${idx + 1}. ${m.nome}`);
      console.log(`     📧 Login: ${m.email}`);
      console.log(`     🔒 Senha: ${SENHA_PADRAO}`);
      console.log(`     💼 Perfil: ${m.config?.nome_fantasia || 'MEI'} | ${m.config?.municipio}-${m.config?.uf}`);
      console.log(`     🎯 Faturamento Estimado: R$ ${m.faturamentoTarget.toLocaleString('pt-BR')}`);
    });
    console.log('\n================================================================\n');
  } catch (err) {
    await connection.rollback();
    console.error('❌ Erro durante o seed do banco de dados:', err);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

seed();
