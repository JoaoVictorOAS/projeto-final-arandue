const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/atendenteService');
jest.mock('../src/repositories/atendenteRepository');
jest.mock('../src/services/aiServiceClient');

const app = require('../src/app');
const atendenteService = require('../src/services/atendenteService');
const atendenteRepository = require('../src/repositories/atendenteRepository');
const aiServiceClient = require('../src/services/aiServiceClient');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_chave_jwt_recode_2026';

describe('Rotas de Atendente IA (/api/atendente)', () => {
  const usuarioId = 42;
  const tokenMei = jwt.sign({ id: usuarioId, nome: 'MEI Teste' }, JWT_SECRET, { expiresIn: '1h' });
  const tokenAssistente = jwt.sign({ id: usuarioId, scope: 'assistente:operator' }, JWT_SECRET, { expiresIn: '15m' });
  const tokenCliente = jwt.sign({ id: usuarioId, scope: 'atendente:customer' }, JWT_SECRET, { expiresIn: '15m' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/atendente/config retorna configurações do atendente para o MEI ou Assistente', async () => {
    atendenteService.obterConfiguracao.mockResolvedValue({
      usuario_id: usuarioId,
      nome_atendente: 'Lia',
      tom_voz: 'AMIGAVEL',
      orcamento_min_valor: 80,
      orcamento_max_valor: 900,
      desconto_max_percentual: 10
    });

    const res = await request(app)
      .get('/api/atendente/config')
      .set('Authorization', `Bearer ${tokenAssistente}`);

    expect(res.status).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.nome_atendente).toBe('Lia');
  });

  test('PUT /api/atendente/config permite ao MEI e ao Assistente (operator) ajustar tom e limites em R$', async () => {
    atendenteService.atualizarConfiguracao.mockResolvedValue({
      usuario_id: usuarioId,
      nome_atendente: 'Lia Pro',
      tom_voz: 'FORMAL',
      permite_fechar_orcamento: true,
      orcamento_min_valor: 150,
      orcamento_max_valor: 1200,
      desconto_max_percentual: 15
    });

    const res = await request(app)
      .put('/api/atendente/config')
      .set('Authorization', `Bearer ${tokenAssistente}`)
      .send({
        nome_atendente: 'Lia Pro',
        tom_voz: 'FORMAL',
        permite_fechar_orcamento: true,
        orcamento_min_valor: 150,
        orcamento_max_valor: 1200,
        desconto_max_percentual: 15
      });

    expect(res.status).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.tom_voz).toBe('FORMAL');
    expect(res.body.dados.orcamento_max_valor).toBe(1200);
  });

  test('Token atendente:customer é bloqueado se tentar alterar configurações do MEI ou acessar movimentações de caixa', async () => {
    const resConfig = await request(app)
      .put('/api/atendente/config')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({ orcamento_max_valor: 999999 });

    expect(resConfig.status).toBe(403);

    const resCaixa = await request(app)
      .get('/api/movimentacoes')
      .set('Authorization', `Bearer ${tokenCliente}`);

    expect(resCaixa.status).toBe(403);
  });

  test('POST /api/atendente/operacional/orcamento executa com token atendente:customer respeitando alçada', async () => {
    atendenteService.proporOuFecharOrcamentoCliente.mockResolvedValue({
      orcamento: { id: 88, status: 'APROVADO', total: 250 },
      aprovado_automaticamente: true,
      motivo_alcada: 'Orçamento fechado dentro da alçada'
    });

    const res = await request(app)
      .post('/api/atendente/operacional/orcamento')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({
        nome_cliente: 'Ana',
        telefone_cliente: '11988887777',
        itens: [{ servico_id: 1, quantidade: 1 }],
        fechar_automaticamente: true
      });

    expect(res.status).toBe(201);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.aprovado_automaticamente).toBe(true);
  });

  test('POST /api/atendente/publico/:slug/mensagem envia conversa ao ai-service com escopo atendente:customer', async () => {
    atendenteRepository.buscarConfigPorSlug.mockResolvedValue({
      usuario_id: usuarioId,
      slug_publico: 'atendimento-mei-42',
      ativo: true,
      nome_atendente: 'Lia',
      tom_voz: 'AMIGAVEL',
      permite_agendar: true,
      permite_consultar_catalogo: true,
      permite_gerar_orcamento: true,
      permite_fechar_orcamento: true,
      orcamento_min_valor: 100,
      orcamento_max_valor: 800,
      desconto_max_percentual: 10
    });

    aiServiceClient.enviarMensagemAtendente.mockResolvedValue({
      resposta: 'Olá! Temos horário às 14h e posso fechar seu orçamento por R$ 250.',
      tools_usadas: ['atendente_consultar_catalogo'],
      modelo: 'gemini-3-flash-preview',
      latencia_ms: 320
    });

    const res = await request(app)
      .post('/api/atendente/publico/atendimento-mei-42/mensagem')
      .send({
        mensagem: 'Qual o valor da limpeza e tem horário amanhã?',
        nome_cliente: 'João Cliente',
        telefone_cliente: '11977776666',
        historico: []
      });

    expect(res.status).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.resposta).toContain('R$ 250');
  });

  test('POST /api/atendente/operacional/solicitar-humano permite ao atendente criar Atendimento Pendente', async () => {
    atendenteService.solicitarAtendimentoHumano = jest.fn().mockResolvedValue({
      atendimento_pendente: {
        id: 301,
        nome_cliente: 'Fernanda',
        motivo: 'Agendamento fora do horário comercial',
        status: 'PENDENTE'
      },
      notificacao_mobile: {
        titulo: 'Atendimento pendente',
        corpo: 'Fernanda aguarda atendimento humano (Agendamento fora do horário comercial)'
      },
      mensagem_cliente: 'Sua solicitação foi encaminhada para o atendimento humano.'
    });

    const res = await request(app)
      .post('/api/atendente/operacional/solicitar-humano')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({
        nome_cliente: 'Fernanda',
        telefone_cliente: '11955554444',
        motivo: 'Agendamento fora do horário comercial',
        resumo_conversa: 'Pediu encaixe no domingo'
      });

    expect(res.status).toBe(201);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.notificacao_mobile.titulo).toBe('Atendimento pendente');
  });

  test('GET /api/atendente/pendencias lista atendimentos pendentes para o MEI mas bloqueia token atendente:customer', async () => {
    atendenteService.listarAtendimentosPendentes = jest.fn().mockResolvedValue({
      total_pendentes: 1,
      nao_lidos_mobile: 1,
      itens: [{ id: 301, nome_cliente: 'Fernanda', status: 'PENDENTE', motivo: 'Fora do horário' }]
    });

    const resBloqueado = await request(app)
      .get('/api/atendente/pendencias')
      .set('Authorization', `Bearer ${tokenCliente}`);
    expect(resBloqueado.status).toBe(403);

    const resMei = await request(app)
      .get('/api/atendente/pendencias')
      .set('Authorization', `Bearer ${tokenMei}`);
    expect(resMei.status).toBe(200);
    expect(resMei.body.dados.total_pendentes).toBe(1);
  });
});

