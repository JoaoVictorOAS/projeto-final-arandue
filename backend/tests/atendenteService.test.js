jest.mock('../src/repositories/atendenteRepository');
jest.mock('../src/repositories/clienteRepository');
jest.mock('../src/repositories/servicoRepository');
jest.mock('../src/repositories/agendamentoRepository');
jest.mock('../src/services/orcamentoService');
jest.mock('../src/services/agendamentoService');

const atendenteRepository = require('../src/repositories/atendenteRepository');
const clienteRepository = require('../src/repositories/clienteRepository');
const servicoRepository = require('../src/repositories/servicoRepository');
const orcamentoService = require('../src/services/orcamentoService');
const atendenteService = require('../src/services/atendenteService');

describe('atendenteService - Regras de Negócio e Guardrails Determinísticos', () => {
  const usuarioId = 10;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('atualizarConfiguracao', () => {
    test('deve validar tom_voz e garantir orcamento_min_valor <= orcamento_max_valor e desconto entre 0 e 100', async () => {
      atendenteRepository.obterOuCriarConfig.mockResolvedValue({
        usuario_id: usuarioId,
        nome_atendente: 'Atendente Virtual',
        tom_voz: 'AMIGAVEL',
        orcamento_min_valor: 50,
        orcamento_max_valor: 500,
        desconto_max_percentual: 5
      });

      await expect(
        atendenteService.atualizarConfiguracao(usuarioId, { tom_voz: 'AGRESSIVO' })
      ).rejects.toThrow(/Tom de voz inválido/i);

      await expect(
        atendenteService.atualizarConfiguracao(usuarioId, {
          orcamento_min_valor: 1000,
          orcamento_max_valor: 200
        })
      ).rejects.toThrow(/valor mínimo.*não pode ser maior que o valor máximo/i);

      await expect(
        atendenteService.atualizarConfiguracao(usuarioId, {
          desconto_max_percentual: 120
        })
      ).rejects.toThrow(/desconto máximo deve estar entre 0% e 100%/i);
    });

    test('deve atualizar configurações parciais preservando campos existentes', async () => {
      const configInicial = {
        usuario_id: usuarioId,
        slug_publico: 'mei-10',
        ativo: 1,
        nome_atendente: 'Bia',
        tom_voz: 'AMIGAVEL',
        permite_agendar: 1,
        permite_consultar_catalogo: 1,
        permite_gerar_orcamento: 1,
        permite_fechar_orcamento: 0,
        orcamento_min_valor: 50,
        orcamento_max_valor: 500,
        desconto_max_percentual: 5
      };
      atendenteRepository.obterOuCriarConfig.mockResolvedValue(configInicial);
      atendenteRepository.atualizarConfig.mockImplementation(async (uid, dados) => ({
        ...configInicial,
        ...dados
      }));

      const atualizado = await atendenteService.atualizarConfiguracao(usuarioId, {
        tom_voz: 'CONSULTIVO',
        permite_fechar_orcamento: true,
        orcamento_min_valor: 100,
        orcamento_max_valor: 800,
        desconto_max_percentual: 10
      });

      expect(atualizado.tom_voz).toBe('CONSULTIVO');
      expect(atualizado.permite_fechar_orcamento).toBe(true);
      expect(atualizado.orcamento_min_valor).toBe(100);
      expect(atualizado.orcamento_max_valor).toBe(800);
      expect(atualizado.desconto_max_percentual).toBe(10);
    });
  });

  describe('proporOuFecharOrcamentoCliente - Guardrails de Alçada (R$)', () => {
    const configPadrao = {
      usuario_id: usuarioId,
      ativo: 1,
      permite_gerar_orcamento: 1,
      permite_fechar_orcamento: 1,
      orcamento_min_valor: 100.0,
      orcamento_max_valor: 600.0,
      desconto_max_percentual: 10.0
    };

    test('aprova automaticamente (status APROVADO) quando valor total está dentro da faixa [min, max] e desconto <= teto', async () => {
      atendenteRepository.obterOuCriarConfig.mockResolvedValue(configPadrao);
      clienteRepository.listar.mockResolvedValue([{ id: 77, nome: 'Carlos', telefone: '11999998888' }]);
      servicoRepository.buscarPorId.mockResolvedValue({ id: 5, nome: 'Manutenção', preco: 300.0 });
      orcamentoService.criar.mockImplementation(async (payload) => ({
        id: 501,
        ...payload,
        subtotal: 300.0,
        total: 270.0
      }));

      const res = await atendenteService.proporOuFecharOrcamentoCliente(usuarioId, {
        nome_cliente: 'Carlos',
        telefone_cliente: '11999998888',
        itens: [{ servico_id: 5, quantidade: 1 }],
        desconto: 30.0, // 10% de 300
        fechar_automaticamente: true
      });

      expect(res.aprovado_automaticamente).toBe(true);
      expect(res.orcamento.status).toBe('APROVADO');
      expect(orcamentoService.criar).toHaveBeenCalledWith(
        expect.objectContaining({
          usuario_id: usuarioId,
          cliente_id: 77,
          status: 'APROVADO',
          desconto: 30.0
        })
      );
    });

    test('mantém status ENVIADO e aprovado_automaticamente=false quando valor total ultrapassa orcamento_max_valor', async () => {
      atendenteRepository.obterOuCriarConfig.mockResolvedValue(configPadrao);
      clienteRepository.listar.mockResolvedValue([{ id: 77, nome: 'Carlos', telefone: '11999998888' }]);
      servicoRepository.buscarPorId.mockResolvedValue({ id: 5, nome: 'Projeto Completo', preco: 900.0 });
      orcamentoService.criar.mockImplementation(async (payload) => ({
        id: 502,
        ...payload,
        subtotal: 900.0,
        total: 900.0
      }));

      const res = await atendenteService.proporOuFecharOrcamentoCliente(usuarioId, {
        nome_cliente: 'Carlos',
        telefone_cliente: '11999998888',
        itens: [{ servico_id: 5, quantidade: 1 }],
        desconto: 0,
        fechar_automaticamente: true
      });

      expect(res.aprovado_automaticamente).toBe(false);
      expect(res.orcamento.status).toBe('ENVIADO');
      expect(res.motivo_alcada).toMatch(/fora da faixa automática/i);
    });

    test('rejeita desconto acima de desconto_max_percentual configurado pelo MEI', async () => {
      atendenteRepository.obterOuCriarConfig.mockResolvedValue(configPadrao);
      clienteRepository.listar.mockResolvedValue([{ id: 77, nome: 'Carlos', telefone: '11999998888' }]);
      servicoRepository.buscarPorId.mockResolvedValue({ id: 5, nome: 'Manutenção', preco: 300.0 });

      await expect(
        atendenteService.proporOuFecharOrcamentoCliente(usuarioId, {
          nome_cliente: 'Carlos',
          telefone_cliente: '11999998888',
          itens: [{ servico_id: 5, quantidade: 1 }],
          desconto: 60.0, // 20% > 10% permitido
          fechar_automaticamente: true
        })
      ).rejects.toThrow(/desconto solicitado.*excede o limite máximo de 10%/i);
    });
  });

  describe('Limites de Agendamento (antecedencia_minima_dias) e Transbordo para Humano', () => {
    test('deve validar antecedencia_minima_dias e antecedencia_maxima_dias ao atualizar configuracao', async () => {
      const baseCfg = {
        usuario_id: usuarioId,
        nome_atendente: 'Lia',
        tom_voz: 'AMIGAVEL',
        orcamento_min_valor: 50,
        orcamento_max_valor: 500,
        desconto_max_percentual: 5,
        antecedencia_minima_dias: 1,
        antecedencia_maxima_dias: 30,
        transbordo_automatico: 1
      };
      atendenteRepository.obterOuCriarConfig.mockResolvedValue(baseCfg);
      atendenteRepository.atualizarConfig.mockImplementation(async (uid, dados) => ({
        ...baseCfg,
        ...dados
      }));

      await expect(
        atendenteService.atualizarConfiguracao(usuarioId, {
          antecedencia_minima_dias: 15,
          antecedencia_maxima_dias: 5
        })
      ).rejects.toThrow(/antecedência mínima.*não pode ser maior que a antecedência máxima/i);

      const salvo = await atendenteService.atualizarConfiguracao(usuarioId, {
        antecedencia_minima_dias: 3,
        antecedencia_maxima_dias: 45,
        transbordo_automatico: true,
        condicoes_retorno_humano: 'Urgências no mesmo dia ou serviços personalizados fora do catálogo'
      });

      expect(salvo.antecedencia_minima_dias).toBe(3);
      expect(salvo.antecedencia_maxima_dias).toBe(45);
      expect(salvo.transbordo_automatico).toBe(true);
      expect(salvo.condicoes_retorno_humano).toContain('Urgências no mesmo dia');
    });

    test('consultarDisponibilidadeAgenda bloqueia datas com antecedência menor que antecedencia_minima_dias', async () => {
      atendenteRepository.obterOuCriarConfig.mockResolvedValue({
        usuario_id: usuarioId,
        ativo: 1,
        permite_agendar: 1,
        horario_inicio: '08:00',
        horario_fim: '18:00',
        antecedencia_minima_dias: 3,
        antecedencia_maxima_dias: 60
      });

      // Data de hoje ou amanhã (< 3 dias de antecedência)
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const dataAmanha = amanha.toISOString().slice(0, 10);

      const disp = await atendenteService.consultarDisponibilidadeAgenda(usuarioId, dataAmanha);
      expect(disp.dentro_limite_antecedencia).toBe(false);
      expect(disp.antecedencia_minima_dias).toBe(3);
      expect(disp.horarios_disponiveis).toEqual([]);
      expect(disp.motivo_indisponibilidade).toMatch(/antecedência mínima de 3 dia/i);
    });

    test('agendarAtendimentoCliente fora da antecedência mínima ou fora do horário gera Atendimento Pendente para o humano', async () => {
      atendenteRepository.obterOuCriarConfig.mockResolvedValue({
        usuario_id: usuarioId,
        nome_atendente: 'Lia',
        ativo: 1,
        permite_agendar: 1,
        horario_inicio: '08:00',
        horario_fim: '18:00',
        antecedencia_minima_dias: 3,
        antecedencia_maxima_dias: 60,
        transbordo_automatico: 1
      });

      atendenteRepository.criarAtendimentoPendente = jest.fn().mockImplementation(async (dados) => ({
        id: 901,
        status: 'PENDENTE',
        lido_mobile: false,
        ...dados
      }));

      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const dataHoraAmanha = `${amanha.toISOString().slice(0, 10)} 10:00`;

      const resultado = await atendenteService.agendarAtendimentoCliente(usuarioId, {
        nome_cliente: 'Mariana',
        telefone_cliente: '11977776666',
        servico_id: 2,
        data_hora: dataHoraAmanha
      });

      expect(resultado.agendado).toBe(false);
      expect(resultado.requer_atendimento_humano).toBe(true);
      expect(resultado.atendimento_pendente).toBeDefined();
      expect(resultado.atendimento_pendente.id).toBe(901);
      expect(atendenteRepository.criarAtendimentoPendente).toHaveBeenCalledWith(
        expect.objectContaining({
          usuario_id: usuarioId,
          nome_cliente: 'Mariana',
          motivo: expect.stringMatching(/antecedência mínima de 3 dia/i)
        })
      );
    });

    test('solicitarAtendimentoHumano cria registro de Atendimento Pendente com alerta mobile', async () => {
      atendenteRepository.obterOuCriarConfig.mockResolvedValue({
        usuario_id: usuarioId,
        nome_atendente: 'Lia',
        ativo: 1
      });
      atendenteRepository.criarAtendimentoPendente = jest.fn().mockImplementation(async (dados) => ({
        id: 902,
        status: 'PENDENTE',
        lido_mobile: false,
        notificacao_titulo: 'Atendimento pendente',
        ...dados
      }));

      const res = await atendenteService.solicitarAtendimentoHumano(usuarioId, {
        nome_cliente: 'Pedro',
        telefone_cliente: '11966665555',
        motivo: 'Solicitou agendamento às 21h fora do expediente',
        resumo_conversa: 'Cliente precisa de atendimento noturno urgente.'
      });

      expect(res.atendimento_pendente.id).toBe(902);
      expect(res.notificacao_mobile.titulo).toBe('Atendimento pendente');
      expect(res.mensagem_cliente).toMatch(/encaminh|responsável|humano/i);
    });
  });

  describe('Alçada de Fechamento Automático de Orçamentos por Serviço (alcadas_por_servico)', () => {
    const configComAlcadaPorServico = {
      usuario_id: usuarioId,
      ativo: 1,
      permite_gerar_orcamento: 1,
      permite_fechar_orcamento: 1,
      orcamento_min_valor: 50.0,
      orcamento_max_valor: 300.0,
      desconto_max_percentual: 5.0,
      alcadas_por_servico: [
        {
          servico_id: 10,
          nome_servico: 'Instalação Completa',
          permite_fechar_orcamento: true,
          orcamento_min_valor: 400.0,
          orcamento_max_valor: 1500.0,
          desconto_max_percentual: 15.0
        },
        {
          servico_id: 20,
          nome_servico: 'Consultoria Sob Medida',
          permite_fechar_orcamento: false,
          orcamento_min_valor: 0.0,
          orcamento_max_valor: 0.0,
          desconto_max_percentual: 0.0
        }
      ]
    };

    test('aprova automaticamente serviço #10 quando está dentro da alçada específica do serviço (R$ 400 a R$ 1500, até 15% desc), mesmo acima da alçada geral', async () => {
      atendenteRepository.obterOuCriarConfig.mockResolvedValue(configComAlcadaPorServico);
      clienteRepository.listar.mockResolvedValue([{ id: 77, nome: 'Carlos', telefone: '11999998888' }]);
      servicoRepository.buscarPorId.mockResolvedValue({ id: 10, nome: 'Instalação Completa', preco: 1000.0 });
      orcamentoService.criar.mockImplementation(async (payload) => ({
        id: 601,
        ...payload,
        subtotal: 1000.0,
        total: 900.0
      }));

      const res = await atendenteService.proporOuFecharOrcamentoCliente(usuarioId, {
        nome_cliente: 'Carlos',
        telefone_cliente: '11999998888',
        itens: [{ servico_id: 10, quantidade: 1 }],
        desconto: 100.0, // 10% (acima do geral 5%, mas dentro dos 15% do serviço #10)
        fechar_automaticamente: true
      });

      expect(res.aprovado_automaticamente).toBe(true);
      expect(res.orcamento.status).toBe('APROVADO');
      expect(res.motivo_alcada).toMatch(/alçada específica do serviço|APROVADO automaticamente/i);
    });

    test('mantém ENVIADO quando serviço #10 fica fora da faixa específica do serviço ou quando serviço #20 bloqueia fechamento automático', async () => {
      atendenteRepository.obterOuCriarConfig.mockResolvedValue(configComAlcadaPorServico);
      clienteRepository.listar.mockResolvedValue([{ id: 77, nome: 'Carlos', telefone: '11999998888' }]);
      servicoRepository.buscarPorId.mockResolvedValue({ id: 20, nome: 'Consultoria Sob Medida', preco: 200.0 });
      orcamentoService.criar.mockImplementation(async (payload) => ({
        id: 602,
        ...payload,
        subtotal: 200.0,
        total: 200.0
      }));

      const res = await atendenteService.proporOuFecharOrcamentoCliente(usuarioId, {
        nome_cliente: 'Carlos',
        telefone_cliente: '11999998888',
        itens: [{ servico_id: 20, quantidade: 1 }],
        desconto: 0,
        fechar_automaticamente: true
      });

      expect(res.aprovado_automaticamente).toBe(false);
      expect(res.orcamento.status).toBe('ENVIADO');
      expect(res.motivo_alcada).toMatch(/Consultoria Sob Medida|#20|desativado|não permite fechamento automático/i);
    });

    test('configurarAlcadaServico adiciona ou atualiza a alçada de um serviço específico', async () => {
      atendenteRepository.obterOuCriarConfig.mockResolvedValue({
        usuario_id: usuarioId,
        orcamento_min_valor: 50,
        orcamento_max_valor: 500,
        desconto_max_percentual: 5,
        alcadas_por_servico: []
      });
      atendenteRepository.atualizarConfig.mockImplementation(async (uid, dados) => ({
        usuario_id: uid,
        ...dados
      }));

      const atualizado = await atendenteService.configurarAlcadaServico(usuarioId, 10, {
        nome_servico: 'Limpeza Técnica',
        permite_fechar_orcamento: true,
        orcamento_min_valor: 120,
        orcamento_max_valor: 450,
        desconto_max_percentual: 8
      });

      expect(atualizado.alcadas_por_servico).toHaveLength(1);
      expect(atualizado.alcadas_por_servico[0]).toEqual(
        expect.objectContaining({
          servico_id: 10,
          orcamento_min_valor: 120,
          orcamento_max_valor: 450,
          desconto_max_percentual: 8,
          permite_fechar_orcamento: true
        })
      );
    });
  });
});


