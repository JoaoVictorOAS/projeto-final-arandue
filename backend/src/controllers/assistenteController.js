const assistenteService = require('../services/assistenteService');

const assistenteController = {
  async enviarMensagem(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { conversa_id, mensagem } = req.body;

      const resultado = await assistenteService.enviarMensagem(usuario_id, {
        conversa_id: conversa_id ? Number(conversa_id) : undefined,
        mensagem
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Resposta do assistente processada com sucesso',
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
