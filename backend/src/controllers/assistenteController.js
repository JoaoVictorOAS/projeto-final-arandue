const assistenteService = require('../services/assistenteService');

const assistenteController = {
  async enviarMensagem(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { conversa_id, mensagem, assincrono, midia, tipo_midia } = req.body;
      const ehAssincrono = assincrono === true || req.query.assincrono === 'true' || req.query.async === 'true';

      const resultado = await assistenteService.enviarMensagem(usuario_id, {
        conversa_id: conversa_id ? Number(conversa_id) : undefined,
        mensagem,
        midia,
        tipo_midia,
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
  },

  async obterStatusWhatsApp(req, res) {
    try {
      const usuarioRepository = require('../repositories/usuarioRepository');
      const whatsappService = require('../services/whatsappService');
      const usuario = await usuarioRepository.buscarPorId(req.usuario.id);
      // Para usuários normais autenticados, nunca expõe qrCode ou chaves do gateway
      const statusBot = whatsappService.obterStatus(false);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Status do WhatsApp obtido com sucesso',
        dados: {
          bot: statusBot,
          usuario_whatsapp: usuario?.whatsapp || null,
          usuario_whatsapp_verificado: !!usuario?.whatsapp_verificado
        }
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao obter status do WhatsApp'
      });
    }
  },

  async vincularWhatsApp(req, res) {
    try {
      const usuarioRepository = require('../repositories/usuarioRepository');
      const { normalizarNumeroWhatsApp, validarNumeroWhatsApp } = require('../utils/phoneUtils');
      const { telefone } = req.body;

      if (!telefone || !validarNumeroWhatsApp(telefone)) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Número de telefone/WhatsApp inválido. Forneça DDD + número celular com 8 ou 9 dígitos.'
        });
      }

      const tel = normalizarNumeroWhatsApp(telefone);
      // Verifica se já está em uso por outro usuário
      const existente = await usuarioRepository.buscarPorTelefoneOuWhatsapp(tel.variacoes);
      if (existente && existente.id !== req.usuario.id) {
        return res.status(409).json({
          sucesso: false,
          mensagem: 'Este número de WhatsApp já está vinculado a outra conta MEI.'
        });
      }

      await usuarioRepository.atualizarWhatsapp(req.usuario.id, tel.comDdi, 1);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Número de WhatsApp vinculado com sucesso ao assistente!',
        dados: {
          whatsapp: tel.comDdi,
          formatado: tel.formatado,
          whatsapp_verificado: true
        }
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao vincular WhatsApp'
      });
    }
  },

  async resetarSessaoWhatsApp(req, res) {
    try {
      // Bloqueia qualquer token de tenant ou operador com escopo restrito do assistente
      if (req.usuario?.scope) {
        return res.status(403).json({
          sucesso: false,
          mensagem: 'Acesso negado: operação de reinicialização do WhatsApp requer privilégios administrativos da plataforma.'
        });
      }

      const whatsappService = require('../services/whatsappService');
      const novoStatus = await whatsappService.gerarNovoQrCode();

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Sessão do WhatsApp reiniciada com sucesso. Um novo QR Code foi gerado no terminal do servidor.',
        dados: novoStatus
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao gerar novo QR Code do WhatsApp'
      });
    }
  },

  async transcreverAudio(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { audio_base64, mime_type } = req.body;
      const resultado = await assistenteService.transcreverAudio(usuario_id, { audio_base64, mime_type });
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Áudio transcrito com sucesso',
        dados: resultado
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao transcrever áudio'
      });
    }
  },

  async analisarImagem(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { imagem_base64, mime_type, instrucao } = req.body;
      const resultado = await assistenteService.analisarImagem(usuario_id, { imagem_base64, mime_type, instrucao });
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Imagem analisada com sucesso',
        dados: resultado
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao analisar imagem'
      });
    }
  }
};

module.exports = assistenteController;
