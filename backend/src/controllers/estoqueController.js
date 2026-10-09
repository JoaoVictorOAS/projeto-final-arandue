const insumoRepository = require('../repositories/insumoRepository');
const fichaTecnicaRepository = require('../repositories/fichaTecnicaRepository');
const estoqueMovimentacaoRepository = require('../repositories/estoqueMovimentacaoRepository');
const estoqueService = require('../services/estoqueService');

/**
 * Controller REST para o Módulo de Estoque, Fichas Técnicas, Produção e Movimentações.
 * Suporta isolamento multi-tenant extraindo usuario_id de req.usuario.id.
 */
const estoqueController = {
  /**
   * GET /api/estoque/insumos
   * Lista insumos ativos do usuário autenticado com filtros opcionais.
   */
  async listarInsumos(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { busca, apenas_abaixo_minimo } = req.query;
      const insumos = await insumoRepository.listar(usuario_id, {
        busca,
        apenasAbaixoMinimo: apenas_abaixo_minimo === 'true'
      });
      return res.status(200).json({ sucesso: true, dados: insumos });
    } catch (err) {
      return res.status(500).json({ sucesso: false, mensagem: err.message });
    }
  },

  /**
   * POST /api/estoque/insumos
   * Cadastra novo insumo.
   */
  async cadastrarInsumo(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { nome, unidade_base, quantidade_atual, estoque_minimo, custo_unitario } = req.body;
      if (!nome || !unidade_base) {
        return res.status(400).json({ sucesso: false, mensagem: 'Nome e unidade_base são obrigatórios' });
      }
      const novo = await insumoRepository.criar({
        usuario_id,
        nome,
        unidade_base,
        quantidade_atual: Number(quantidade_atual) || 0,
        estoque_minimo: Number(estoque_minimo) || 0,
        custo_unitario: Number(custo_unitario) || 0
      });
      return res.status(201).json({ sucesso: true, dados: novo });
    } catch (err) {
      return res.status(500).json({ sucesso: false, mensagem: err.message });
    }
  },

  /**
   * POST /api/estoque/insumos/entrada
   * Registra compra/entrada de insumo com recálculo de custo médio ponderado e ledger.
   */
  async registrarEntrada(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const resultado = await estoqueService.registrarEntradaInsumo(usuario_id, req.body);
      return res.status(200).json({ sucesso: true, dados: resultado });
    } catch (err) {
      return res.status(400).json({ sucesso: false, mensagem: err.message });
    }
  },

  /**
   * GET /api/estoque/fichas-tecnicas/:servicoId
   * Obtém ficha técnica de um serviço específico com custo de ingredientes calculado.
   */
  async obterFichaTecnica(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { servicoId } = req.params;
      const ficha = await fichaTecnicaRepository.obterFichaPorServico(usuario_id, servicoId);

      let custoTotal = 0;
      for (const ing of ficha) {
        custoTotal += Number(ing.quantidade_necessaria) * Number(ing.custo_unitario);
      }

      return res.status(200).json({
        sucesso: true,
        dados: {
          servico_id: Number(servicoId),
          custo_ingredientes: Number(custoTotal.toFixed(2)),
          ingredientes: ficha
        }
      });
    } catch (err) {
      return res.status(500).json({ sucesso: false, mensagem: err.message });
    }
  },

  /**
   * POST /api/estoque/fichas-tecnicas
   * Substitui/salva a ficha técnica de um serviço.
   */
  async salvarFichaTecnica(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { servico_id, ingredientes } = req.body;
      const salva = await fichaTecnicaRepository.substituirFicha(usuario_id, servico_id, ingredientes);
      return res.status(200).json({ sucesso: true, dados: salva });
    } catch (err) {
      return res.status(400).json({ sucesso: false, mensagem: err.message });
    }
  },

  /**
   * POST /api/estoque/producao
   * Registra lote de produção, debitando insumos e incrementando produto pronto.
   */
  async registrarProducao(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { servico_id, quantidade } = req.body;
      const resultado = await estoqueService.registrarLoteProducao(usuario_id, servico_id, Number(quantidade));
      return res.status(200).json({ sucesso: true, dados: resultado });
    } catch (err) {
      return res.status(400).json({ sucesso: false, mensagem: err.message });
    }
  },

  /**
   * POST /api/estoque/simulacao
   * Simula capacidade produtiva e identifica gargalos de insumos.
   */
  async simular(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const resultado = await estoqueService.simularProducao(usuario_id, req.body);
      return res.status(200).json({ sucesso: true, dados: resultado });
    } catch (err) {
      return res.status(400).json({ sucesso: false, mensagem: err.message });
    }
  },

  /**
   * GET /api/estoque/movimentacoes
   * Lista histórico auditável de movimentações de estoque (kardex/ledger).
   */
  async listarMovimentacoes(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { tipo, limite } = req.query;
      const movs = await estoqueMovimentacaoRepository.listarMovimentacoes(usuario_id, { tipo, limite });
      return res.status(200).json({ sucesso: true, dados: movs });
    } catch (err) {
      return res.status(500).json({ sucesso: false, mensagem: err.message });
    }
  },

  /**
   * POST /api/estoque/insumos/parse-xml
   * Faz o parse de XML da NF-e para conferência prévia.
   */
  async parseXmlNota(req, res) {
    try {
      const { xml } = req.body;
      if (!xml || typeof xml !== 'string' || !xml.trim()) {
        return res.status(400).json({ sucesso: false, mensagem: 'O conteúdo XML da nota é obrigatório' });
      }
      const dados = await estoqueService.processarXmlNotaFiscal(xml);
      return res.status(200).json({ sucesso: true, dados });
    } catch (err) {
      return res.status(400).json({ sucesso: false, mensagem: err.message });
    }
  },

  /**
   * POST /api/estoque/insumos/entrada-nota
   * Registra compra e entrada de múltiplos insumos a partir de documento fiscal.
   */
  async registrarEntradaNota(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const resultado = await estoqueService.registrarEntradaLoteNotaFiscal(usuario_id, req.body);
      return res.status(200).json({ sucesso: true, dados: resultado });
    } catch (err) {
      return res.status(400).json({ sucesso: false, mensagem: err.message });
    }
  },

  /**
   * POST /api/estoque/insumos/ocr-foto
   * Extrai dados de produtos a partir da foto ou imagem da nota fiscal via IA multimodal.
   */
  async ocrFotoNota(req, res) {
    try {
      const { imagem_base64, mime_type } = req.body;
      if (!imagem_base64) {
        return res.status(400).json({ sucesso: false, mensagem: 'A imagem da nota fiscal é obrigatória' });
      }
      const aiServiceClient = require('../services/aiServiceClient');
      const resultado = await aiServiceClient.extrairDadosNotaFiscal({ imagem_base64, mime_type });
      return res.status(200).json({ sucesso: true, dados: resultado });
    } catch (err) {
      return res.status(500).json({ sucesso: false, mensagem: err.message });
    }
  }
};

module.exports = estoqueController;
