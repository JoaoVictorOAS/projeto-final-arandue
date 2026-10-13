const assistenteService = require('../services/assistenteService');

const assistenteController = {
  async enviarMensagem(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { conversa_id, mensagem, assincrono } = req.body;
      const ehAssincrono = assincrono === true || req.query.assincrono === 'true' || req.query.async === 'true';

      const resultado = await assistenteService.enviarMensagem(usuario_id, {
        conversa_id: conversa_id ? Number(conversa_id) : undefined,
        mensagem,
        assincrono: ehAssincrono
      });

      const statusCode = ehAssincrono ? 202 : 200;
      const msgRetorno = ehAssincrono ? 'Mensagem em processamento' : 'Resposta do assistente processada com sucesso';

      return res.status(statusCode).json({
        sucesso: true,
        mensagem: msgRetorno,
        dados: resultado
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao processar mensagem com o assistente'
      });
    }
  },

  async consultarStatusMensagem(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const mensagem_id = Number(req.params.id);

      const dados = await assistenteService.buscarStatusMensagem(mensagem_id, usuario_id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Status da mensagem consultado com sucesso',
        dados
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao consultar status da mensagem'
      });
    }
  },

  async listarConversas(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const conversas = await assistenteService.listarConversas(usuario_id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Conversas listadas com sucesso',
        dados: conversas
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao listar conversas'
      });
    }
  },

  async listarMensagens(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const conversa_id = Number(req.params.id);

      const mensagens = await assistenteService.listarMensagens(conversa_id, usuario_id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Mensagens listadas com sucesso',
        dados: mensagens
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao listar mensagens'
      });
    }
  },

  async excluirConversa(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const conversa_id = Number(req.params.id);

      await assistenteService.excluirConversa(conversa_id, usuario_id);

      return res.status(204).send();
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao excluir conversa'
      });
    }
  }
};

module.exports = assistenteController;
