/**
 * Controller do Módulo Fiscal — Endpoints REST para emissão, consulta,
 * DANFE e cancelamento de notas fiscais (NFS-e, NF-e, NFC-e).
 */

const fiscalEngine = require('../services/fiscal/fiscalEngine');

const notaFiscalController = {
  /**
   * POST /api/notas-fiscais/nfse
   * Emite Nota Fiscal de Serviços Eletrônica (NFS-e Nacional).
   */
  async emitirNfse(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const resultado = await fiscalEngine.emitirNfse(usuarioId, req.body);

      return res.status(201).json({
        sucesso: true,
        mensagem: 'NFS-e emitida com sucesso',
        dados: {
          ...resultado.nota,
          ...resultado
        }
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao emitir NFS-e'
      });
    }
  },

  /**
   * POST /api/notas-fiscais/nfe
   * Emite Nota Fiscal Eletrônica de Produtos (NF-e Modelo 55).
   */
  async emitirNfe(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const resultado = await fiscalEngine.emitirNfe(usuarioId, req.body);

      return res.status(201).json({
        sucesso: true,
        mensagem: 'NF-e emitida com sucesso',
        dados: {
          ...resultado.nota,
          ...resultado
        }
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao emitir NF-e'
      });
    }
  },

  /**
   * POST /api/notas-fiscais/nfce
   * Emite Nota Fiscal de Consumidor Eletrônica (NFC-e Modelo 65 - Varejo).
   */
  async emitirNfce(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const resultado = await fiscalEngine.emitirNfce(usuarioId, req.body);

      return res.status(201).json({
        sucesso: true,
        mensagem: 'NFC-e emitida com sucesso',
        dados: {
          ...resultado.nota,
          ...resultado
        }
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao emitir NFC-e'
      });
    }
  },

  /**
   * GET /api/notas-fiscais
   * Lista o histórico de notas fiscais do MEI autenticado com filtros.
   */
  async listar(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const notas = await fiscalEngine.listarNotasFiscais(usuarioId, req.query);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Notas fiscais listadas com sucesso',
        dados: notas
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao listar notas fiscais'
      });
    }
  },

  /**
   * GET /api/notas-fiscais/:id
   * Consulta os dados detalhados de uma nota fiscal por ID ou chave.
   */
  async buscarPorId(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { id } = req.params;
      const resultado = await fiscalEngine.consultarNotaFiscal(usuarioId, id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Nota fiscal consultada com sucesso',
        dados: {
          ...resultado.nota,
          ...resultado
        }
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao consultar nota fiscal'
      });
    }
  },

  /**
   * GET /api/notas-fiscais/:id/danfe
   * Retorna o documento auxiliar (DANFE simplificado) em HTML ou JSON.
   */
  async obterDanfe(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { id } = req.params;
      const resultado = await fiscalEngine.consultarNotaFiscal(usuarioId, id);

      const aceitaHtml = req.headers.accept && req.headers.accept.includes('text/html');
      const querHtml = req.query.formato === 'html';

      if (aceitaHtml || querHtml) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(resultado.danfe);
      }

      return res.status(200).json({
        sucesso: true,
        mensagem: 'DANFE gerado com sucesso',
        dados: {
          danfe: resultado.danfe
        }
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao obter DANFE'
      });
    }
  },

  /**
   * POST /api/notas-fiscais/:id/cancelar
   * Cancela uma nota fiscal autorizada com justificativa legal.
   */
  async cancelar(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { id } = req.params;
      const { motivo } = req.body || {};
      const resultado = await fiscalEngine.cancelarNotaFiscal(usuarioId, id, motivo);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Nota fiscal cancelada com sucesso',
        dados: {
          ...resultado.nota,
          ...resultado
        }
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao cancelar nota fiscal'
      });
    }
  }
};

module.exports = notaFiscalController;
