const cobrancaService = require('../services/cobrancaService');
const financeiroService = require('../services/financeiroService');
const { gerarPayloadPix } = require('../utils/pixPayload');
const pool = require('../config/database');
const { normalizarNumeroWhatsApp } = require('../utils/phoneUtils');

async function obterDadosConfiguracaoPix(usuario_id, reqUsuario) {
  let chave = '';
  let nome = reqUsuario?.nome || 'MEI';
  let cidade = 'BRASILIA';

  try {
    const [rows] = await pool.execute('SELECT * FROM mei_configuracoes WHERE usuario_id = ?', [usuario_id]);
    if (rows.length > 0) {
      const cfg = rows[0];
      chave = cfg.chave_pix || cfg.cnpj || cfg.email_comercial || cfg.telefone_comercial || '';
      nome = cfg.razao_social || nome;
      cidade = cfg.municipio || cidade;
    }
  } catch {
    // ignore
  }

  if (!chave) {
    chave = reqUsuario?.email || '00000000000';
  }

  return { chave, nome, cidade };
}

/**
 * Controller responsável pelas operações de Cobranças do MEI.
 */
const cobrancaController = {
  /**
   * GET /api/cobrancas
   * Lista cobranças do MEI autenticado com filtros opcionais.
   */
  async listar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { status, cliente_id } = req.query;

      const cobrancas = await financeiroService.listarCobrancas(usuario_id, {
        status,
        cliente_id
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cobranças listadas com sucesso',
        dados: cobrancas
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao listar cobranças'
      });
    }
  },

  /**
   * GET /api/cobrancas/:id
   * Busca cobrança por ID.
   */
  async buscarPorId(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      const cobranca = await financeiroService.buscarCobrancaPorId(id, usuario_id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cobrança encontrada com sucesso',
        dados: cobranca
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao buscar cobrança'
      });
    }
  },

  /**
   * POST /api/cobrancas
   * Registra uma nova cobrança vinculada a um agendamento concluído ou cliente.
   */
  async criar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const {
        cliente_id,
        orcamento_id,
        agendamento_id,
        valor,
        vencimento,
        status,
        observacoes
      } = req.body;

      let novaCobranca;
      if (agendamento_id) {
        novaCobranca = await cobrancaService.criar({
          usuario_id,
          agendamento_id,
          vencimento,
          observacoes
        });
      } else {
        novaCobranca = await financeiroService.criarCobranca({
          usuario_id,
          cliente_id,
          orcamento_id,
          agendamento_id,
          valor,
          vencimento,
          status,
          observacoes
        });
      }

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Cobrança cadastrada com sucesso',
        dados: novaCobranca
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao cadastrar cobrança'
      });
    }
  },

  /**
   * PUT /api/cobrancas/:id
   * Atualiza dados de uma cobrança existente.
   */
  async atualizar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;
      const dados = req.body;

      const cobrancaAtualizada = await financeiroService.atualizarCobranca(id, usuario_id, dados);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cobrança atualizada com sucesso',
        dados: cobrancaAtualizada
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao atualizar cobrança'
      });
    }
  },

  /**
   * PATCH ou PUT /api/cobrancas/:id/pagar
   * Dá baixa na cobrança como PAGO e gera movimentação de entrada no Livro Caixa.
   */
  async darBaixa(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;
      const { data_pagamento, gerar_movimentacao_caixa } = req.body || {};

      const cobrancaBaixada = await financeiroService.darBaixaCobranca(id, usuario_id, {
        data_pagamento,
        gerar_movimentacao_caixa: gerar_movimentacao_caixa !== undefined
          ? Boolean(gerar_movimentacao_caixa)
          : true
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cobrança baixada com sucesso',
        dados: cobrancaBaixada
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao baixar cobrança'
      });
    }
  },

  /**
   * DELETE /api/cobrancas/:id
   * Remove uma cobrança do sistema.
   */
  async excluir(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      await financeiroService.excluirCobranca(id, usuario_id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cobrança excluída com sucesso'
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao excluir cobrança'
      });
    }
  },

  /**
   * GET /api/cobrancas/:id/pix
   * Gera o BR Code Pix Copia-e-Cola para a cobrança.
   */
  async gerarPix(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      const cobranca = await financeiroService.buscarCobrancaPorId(id, usuario_id);
      if (!cobranca) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Cobrança não encontrada'
        });
      }

      const { chave, nome, cidade } = await obterDadosConfiguracaoPix(usuario_id, req.usuario);
      const txid = `COB${id}`;
      const valor = Number(cobranca.valor) || 0;

      const resultadoPix = gerarPayloadPix({
        chave,
        nomeRecebedor: nome,
        cidadeRecebedor: cidade,
        valor,
        txid,
        descricao: `Cobranca #${id}`
      });

      return res.status(200).json({
        sucesso: true,
        dados: {
          cobranca_id: Number(id),
          valor,
          vencimento: cobranca.vencimento || cobranca.data_vencimento,
          cliente_nome: cobranca.cliente_nome || (cobranca.cliente ? cobranca.cliente.nome : 'Cliente'),
          pix_copia_e_cola: resultadoPix.payload_pix,
          chave_pix: resultadoPix.chave_utilizada,
          txid: resultadoPix.txid
        }
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao gerar Pix da cobrança'
      });
    }
  },

  /**
   * POST /api/cobrancas/:id/lembrete-whatsapp
   * Prepara mensagem amigável de lembrete de cobrança com Pix Copia-e-Cola e link do WhatsApp.
   */
  async enviarLembreteWhatsapp(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      const cobranca = await financeiroService.buscarCobrancaPorId(id, usuario_id);
      if (!cobranca) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Cobrança não encontrada'
        });
      }

      const { chave, nome, cidade } = await obterDadosConfiguracaoPix(usuario_id, req.usuario);
      const txid = `COB${id}`;
      const valor = Number(cobranca.valor) || 0;

      const resultadoPix = gerarPayloadPix({
        chave,
        nomeRecebedor: nome,
        cidadeRecebedor: cidade,
        valor,
        txid,
        descricao: `Cobranca #${id}`
      });

      const clienteNome = cobranca.cliente_nome || (cobranca.cliente ? cobranca.cliente.nome : 'Cliente');
      const clienteTelefone = cobranca.cliente_telefone || (cobranca.cliente ? cobranca.cliente.telefone : '') || '';
      const vencimentoStr = cobranca.vencimento || cobranca.data_vencimento ? String(cobranca.vencimento || cobranca.data_vencimento).split('T')[0].split('-').reverse().join('/') : '—';
      const valorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

      const textoMensagem = `Olá, ${clienteNome}! Tudo bem? 😊\n\nPassando para enviar o lembrete da sua cobrança:\n• Valor: ${valorFmt}\n• Vencimento: ${vencimentoStr}\n\n💳 *Pix Copia e Cola* (basta colar no app do seu banco):\n\`${resultadoPix.payload_pix}\`\n\nObrigado pela preferência!`;

      const telNorm = normalizarNumeroWhatsApp(clienteTelefone);
      const telefoneLimpo = telNorm.limpo ? (telNorm.limpo.startsWith('55') ? telNorm.limpo : `55${telNorm.limpo}`) : '';
      const whatsapp_link = telefoneLimpo
        ? `https://wa.me/${telefoneLimpo}?text=${encodeURIComponent(textoMensagem)}`
        : `https://wa.me/?text=${encodeURIComponent(textoMensagem)}`;

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Lembrete de cobrança preparado com sucesso',
        dados: {
          cobranca_id: Number(id),
          cliente_nome: clienteNome,
          telefone: clienteTelefone,
          texto_mensagem: textoMensagem,
          pix_copia_e_cola: resultadoPix.payload_pix,
          whatsapp_link
        }
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao preparar lembrete de WhatsApp'
      });
    }
  }
};

module.exports = cobrancaController;
