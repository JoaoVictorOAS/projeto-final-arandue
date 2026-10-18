const orcamentoService = require('../services/orcamentoService');
const { normalizarNumeroWhatsApp } = require('../utils/phoneUtils');

/**
 * Controller responsável pelas operações de Orçamentos do MEI.
 */
const orcamentoController = {
  /**
   * GET /api/orcamentos
   * Lista os orçamentos do MEI autenticado com filtros opcionais.
   */
  async listar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { status, cliente_id } = req.query;

      const orcamentos = await orcamentoService.listar(usuario_id, { status, cliente_id });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Orçamentos listados com sucesso',
        dados: orcamentos
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao listar orçamentos'
      });
    }
  },

  /**
   * GET /api/orcamentos/:id
   * Busca um orçamento por ID com sua lista de itens e dados do cliente.
   */
  async buscarPorId(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      const orcamento = await orcamentoService.buscarPorId(id, usuario_id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Orçamento encontrado com sucesso',
        dados: orcamento
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao buscar orçamento'
      });
    }
  },

  /**
   * POST /api/orcamentos
   * Cria um novo orçamento com múltiplos itens e cálculos auditados no servidor.
   */
  async criar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const {
        cliente_id,
        data_emissao,
        validade,
        status,
        desconto,
        observacoes,
        itens
      } = req.body;

      const novoOrcamento = await orcamentoService.criar({
        usuario_id,
        cliente_id,
        data_emissao,
        validade,
        status,
        desconto,
        observacoes,
        itens
      });

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Orçamento criado com sucesso',
        dados: novoOrcamento
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao cadastrar orçamento'
      });
    }
  },

  /**
   * PATCH /api/orcamentos/:id/status
   * PUT /api/orcamentos/:id/status
   * Altera o status do orçamento (ex: ENVIADO, APROVADO, RECUSADO, CANCELADO).
   */
  async atualizarStatus(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;
      const { status } = req.body;

      const orcamentoAtualizado = await orcamentoService.atualizarStatus(id, usuario_id, status);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Status do orçamento atualizado com sucesso',
        dados: orcamentoAtualizado
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao atualizar status do orçamento'
      });
    }
  },

  /**
   * DELETE /api/orcamentos/:id
   * Exclui um orçamento do MEI.
   */
  async excluir(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      await orcamentoService.excluir(id, usuario_id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Orçamento excluído com sucesso',
        dados: null
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao excluir orçamento'
      });
    }
  },

  /**
   * GET /api/orcamentos/:id/compartilhar
   * Prepara resumo texto formatado para WhatsApp + link whatsapp_link + proposta comercial detalhada.
   */
  async compartilhar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      const orcamento = await orcamentoService.buscarPorId(id, usuario_id);
      if (!orcamento) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Orçamento não encontrado'
        });
      }

      const clienteNome = orcamento.cliente_nome || (orcamento.cliente ? orcamento.cliente.nome : 'Cliente');
      const clienteTelefone = orcamento.cliente_telefone || (orcamento.cliente ? orcamento.cliente.telefone : '') || '';
      const itens = orcamento.itens || [];
      const totalFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(orcamento.total) || 0);

      let textoMensagem = `*PROPOSTA COMERCIAL - Orçamento #${id}*\n`;
      textoMensagem += `Cliente: ${clienteNome}\n`;
      textoMensagem += `Data: ${String(orcamento.data_emissao || '').split('T')[0].split('-').reverse().join('/')}\n\n`;
      textoMensagem += `*Itens:*\n`;
      itens.forEach((it, idx) => {
        const desc = it.descricao || it.servico_nome || `Item ${idx + 1}`;
        const sub = Number(it.subtotal || (it.quantidade * it.preco_unitario)) || 0;
        const subFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sub);
        textoMensagem += `• ${it.quantidade}x ${desc} (${subFmt})\n`;
      });
      if (Number(orcamento.desconto) > 0) {
        const descFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(orcamento.desconto));
        textoMensagem += `Desconto: -${descFmt}\n`;
      }
      textoMensagem += `\n*TOTAL: ${totalFmt}*\n`;
      if (orcamento.observacoes) {
        textoMensagem += `\nObs: ${orcamento.observacoes}\n`;
      }

      const telNorm = normalizarNumeroWhatsApp(clienteTelefone);
      const telefoneLimpo = telNorm.limpo ? (telNorm.limpo.startsWith('55') ? telNorm.limpo : `55${telNorm.limpo}`) : '';
      const whatsapp_link = telefoneLimpo
        ? `https://wa.me/${telefoneLimpo}?text=${encodeURIComponent(textoMensagem)}`
        : `https://wa.me/?text=${encodeURIComponent(textoMensagem)}`;

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Orçamento preparado para compartilhamento',
        dados: {
          orcamento_id: Number(id),
          cliente_nome: clienteNome,
          telefone: clienteTelefone,
          texto_mensagem: textoMensagem,
          whatsapp_link,
          proposta_comercial: orcamento
        }
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao compartilhar orçamento'
      });
    }
  }
};

module.exports = orcamentoController;
