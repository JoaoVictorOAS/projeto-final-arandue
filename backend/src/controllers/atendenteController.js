const atendenteService = require('../services/atendenteService');
const atendenteRepository = require('../repositories/atendenteRepository');
const aiServiceClient = require('../services/aiServiceClient');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * Controller responsável pela gestão do Agente Pessoal de Atendimento ao Cliente do MEI
 * e pelas rotas operacionais restritas do atendente.
 */
const atendenteController = {
  /**
   * GET /api/atendente/config
   * Obtém a configuração do atendente do MEI autenticado (acessível pelo MEI e pelo Assistente Copiloto).
   */
  async obterConfig(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const config = await atendenteService.obterConfiguracao(usuario_id);
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Configurações do atendente obtidas com sucesso',
        dados: config
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao obter configurações do atendente'
      });
    }
  },

  /**
   * PUT /api/atendente/config
   * Atualiza tom de voz, capacidades MCP, limites financeiros e limites de agendamento/retorno humano.
   */
  async atualizarConfig(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const configAtualizada = await atendenteService.atualizarConfiguracao(usuario_id, req.body || {});
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Configurações do atendente atualizadas com sucesso',
        dados: configAtualizada
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao atualizar configurações do atendente'
      });
    }
  },

  /**
   * PUT /api/atendente/config/servico/:servico_id
   * Configura ou remove a Alçada de Fechamento Automático de Orçamento para um serviço específico.
   */
  async configurarAlcadaServico(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { servico_id } = req.params;
      const configAtualizada = await atendenteService.configurarAlcadaServico(
        usuario_id,
        servico_id,
        req.body || {}
      );
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Alçada específica do serviço atualizada com sucesso',
        dados: configAtualizada
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao configurar alçada específica do serviço'
      });
    }
  },

  /**
   * GET /api/atendente/pendencias
   * Lista a fila de "Atendimento pendente" (transbordo humano) para o MEI e para o app mobile.
   */
  async listarPendencias(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { status } = req.query;
      const resultado = await atendenteService.listarAtendimentosPendentes(usuario_id, { status });
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Atendimentos pendentes listados com sucesso',
        dados: resultado
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao listar atendimentos pendentes'
      });
    }
  },

  /**
   * PATCH /api/atendente/pendencias/:id/status
   * Atualiza o status de um atendimento pendente (ex: CONCLUIDO, EM_ATENDIMENTO) e marca como lido no mobile.
   */
  async atualizarStatusPendencia(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;
      const { status, lido_mobile } = req.body || {};
      const atualizado = await atendenteService.atualizarStatusAtendimentoPendente(usuario_id, id, {
        status,
        lido_mobile
      });
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Status do atendimento pendente atualizado com sucesso',
        dados: atualizado
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao atualizar status do atendimento pendente'
      });
    }
  },

  /**
   * GET /api/atendente/operacional/catalogo
   * Consulta os serviços ativos e preços do MEI (usado pelo MCP do Atendente).
   */
  async consultarCatalogo(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { busca, categoria } = req.query;
      const servicos = await atendenteService.consultarCatalogoCliente(usuario_id, { busca, categoria });
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Catálogo consultado com sucesso',
        dados: servicos
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao consultar catálogo de serviços'
      });
    }
  },

  /**
   * GET /api/atendente/operacional/disponibilidade
   * Consulta horários livres na agenda do MEI sem expor dados de outros clientes.
   */
  async consultarDisponibilidade(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { data } = req.query;
      const disponibilidade = await atendenteService.consultarDisponibilidadeAgenda(usuario_id, data);
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Disponibilidade consultada com sucesso',
        dados: disponibilidade
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao consultar disponibilidade da agenda'
      });
    }
  },

  /**
   * POST /api/atendente/operacional/orcamento
   * Simula, envia ou fecha automaticamente um orçamento para o cliente final,
   * respeitando estritamente a faixa de valores (R$ min..max) e o teto de desconto do MEI.
   */
  async proporOuFecharOrcamento(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const resultado = await atendenteService.proporOuFecharOrcamentoCliente(usuario_id, req.body || {});
      return res.status(201).json({
        sucesso: true,
        mensagem: resultado.motivo_alcada || 'Orçamento processado com sucesso',
        dados: resultado
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao processar orçamento pelo atendente'
      });
    }
  },

  /**
   * POST /api/atendente/operacional/agendar
   * Agenda atendimento para o cliente final em horário livre (ou transborda ao humano se fora dos limites).
   */
  async agendarAtendimento(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const resultado = await atendenteService.agendarAtendimentoCliente(usuario_id, req.body || {});
      return res.status(201).json({
        sucesso: true,
        mensagem:
          resultado.agendado === false
            ? resultado.mensagem_cliente || 'Solicitação encaminhada ao atendimento humano'
            : 'Agendamento realizado com sucesso pelo atendente',
        dados: resultado
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao realizar agendamento pelo atendente'
      });
    }
  },

  /**
   * POST /api/atendente/operacional/solicitar-humano
   * Aciona o retorno ao humano ("Atendimento pendente") sempre que algo fugir da capacidade do agente.
   */
  async solicitarAtendimentoHumano(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const resultado = await atendenteService.solicitarAtendimentoHumano(usuario_id, req.body || {});
      return res.status(201).json({
        sucesso: true,
        mensagem: resultado.mensagem_cliente || 'Atendimento pendente registrado para o responsável humano',
        dados: resultado
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao encaminhar para atendimento humano'
      });
    }
  },

  /**
   * GET /api/atendente/publico/:slug
   * Retorna os metadados públicos do atendente do MEI (nome, boas-vindas, tom e status) para o link público.
   */
  async obterPerfilPublico(req, res) {
    try {
      const { slug } = req.params;
      const config = await atendenteRepository.buscarConfigPorSlug(slug);
      if (!config || !config.ativo) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Atendente virtual não encontrado ou temporariamente indisponível'
        });
      }

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Perfil público do atendente carregado',
        dados: {
          slug_publico: config.slug_publico,
          nome_atendente: config.nome_atendente,
          tom_voz: config.tom_voz,
          mensagem_boas_vindas: config.mensagem_boas_vindas,
          horario_inicio: config.horario_inicio,
          horario_fim: config.horario_fim,
          antecedencia_minima_dias: config.antecedencia_minima_dias ?? 0,
          antecedencia_maxima_dias: config.antecedencia_maxima_dias ?? 60
        }
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao carregar perfil público do atendente'
      });
    }
  },

  /**
   * POST /api/atendente/publico/:slug/mensagem
   * Recebe uma mensagem do cliente final (ou simulador do MEI), gera um token restrito
   * (scope: atendente:customer) e aciona o orquestrador leve no ai-service.
   */
  async enviarMensagemPublica(req, res) {
    try {
      const { slug } = req.params;
      const { mensagem, nome_cliente, telefone_cliente, cliente_nome, cliente_telefone, historico = [] } = req.body || {};

      if (!mensagem || typeof mensagem !== 'string' || !mensagem.trim()) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'A mensagem é obrigatória'
        });
      }

      const config = await atendenteRepository.buscarConfigPorSlug(slug);
      if (!config || !config.ativo) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Atendente virtual não encontrado ou desativado pelo estabelecimento'
        });
      }

      const customerToken = authMiddleware.generateScopedToken(
        config.usuario_id,
        'atendente:customer',
        '15m'
      );

      const nomeFinalCliente = nome_cliente || cliente_nome || 'Cliente';
      const telFinalCliente = telefone_cliente || cliente_telefone || '';

      const respostaAi = await aiServiceClient.enviarMensagemAtendente({
        tenant_id: config.usuario_id,
        tenant_token: customerToken,
        mensagem: mensagem.trim(),
        historico: Array.isArray(historico) ? historico.slice(-10) : [],
        config_atendente: {
          nome_atendente: config.nome_atendente,
          tom_voz: config.tom_voz,
          instrucoes_customizadas: config.instrucoes_customizadas || '',
          mensagem_boas_vindas: config.mensagem_boas_vindas || '',
          permite_agendar: Boolean(config.permite_agendar),
          permite_consultar_catalogo: Boolean(config.permite_consultar_catalogo),
          permite_gerar_orcamento: Boolean(config.permite_gerar_orcamento),
          permite_fechar_orcamento: Boolean(config.permite_fechar_orcamento),
          permite_gerar_cobranca_pix: Boolean(config.permite_gerar_cobranca_pix),
          orcamento_min_valor: Number(config.orcamento_min_valor ?? 0),
          orcamento_max_valor: Number(config.orcamento_max_valor ?? 500),
          desconto_max_percentual: Number(config.desconto_max_percentual ?? 0),
          horario_inicio: config.horario_inicio || '08:00',
          horario_fim: config.horario_fim || '18:00',
          antecedencia_minima_dias: Number(config.antecedencia_minima_dias ?? 0),
          antecedencia_maxima_dias: Number(config.antecedencia_maxima_dias ?? 60),
          transbordo_automatico: Boolean(config.transbordo_automatico ?? true),
          condicoes_retorno_humano: config.condicoes_retorno_humano || '',
          alcadas_por_servico: Array.isArray(config.alcadas_por_servico) ? config.alcadas_por_servico : []
        },
        cliente_contexto: {
          nome_cliente: String(nomeFinalCliente).trim(),
          telefone_cliente: String(telFinalCliente).trim()
        }
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Resposta do atendente gerada com sucesso',
        dados: {
          resposta: respostaAi.resposta,
          tools_usadas: respostaAi.tools_usadas || [],
          ferramentas_acionadas: respostaAi.tools_usadas || [],
          modelo: respostaAi.modelo || 'gemini',
          latencia_ms: respostaAi.latencia_ms || 0,
          atendente: {
            nome: config.nome_atendente,
            tom_voz: config.tom_voz
          }
        }
      });
    } catch (error) {
      const status = error.statusCode || 503;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao processar mensagem no atendente virtual'
      });
    }
  }
};

module.exports = atendenteController;
