const servicoRepository = require('../repositories/servicoRepository');

/**
 * Controller responsável pelas operações de Serviços e Produtos do MEI.
 */
const servicoController = {
  /**
   * GET /api/servicos
   * Lista todos os serviços do usuário autenticado com filtros de busca e categoria.
   */
  async listar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { busca, categoria } = req.query;

      const servicos = await servicoRepository.listar(usuario_id, { busca, categoria });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Serviços listados com sucesso',
        dados: servicos
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao listar serviços'
      });
    }
  },

  /**
   * GET /api/servicos/:id
   * Busca um serviço por ID pertencente ao usuário autenticado.
   */
  async buscarPorId(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      const servico = await servicoRepository.buscarPorId(id, usuario_id);

      if (!servico) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Serviço não encontrado'
        });
      }

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Serviço encontrado com sucesso',
        dados: servico
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao buscar serviço'
      });
    }
  },

  /**
   * POST /api/servicos
   * Cadastra um novo serviço para o usuário autenticado.
   */
  async criar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { nome, descricao, preco, categoria } = req.body;

      if (!nome || typeof nome !== 'string' || !nome.trim()) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'O nome do serviço é obrigatório'
        });
      }

      if (preco === undefined || preco === null || preco === '' || isNaN(Number(preco)) || Number(preco) < 0) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'O preço deve ser um valor numérico maior ou igual a zero'
        });
      }

      const novoServico = await servicoRepository.criar({
        usuario_id,
        nome: nome.trim(),
        descricao,
        preco: Number(preco),
        categoria
      });

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Serviço cadastrado com sucesso',
        dados: novoServico
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao cadastrar serviço'
      });
    }
  },

  /**
   * PUT /api/servicos/:id
   * Atualiza dados de um serviço existente pertencente ao usuário.
   */
  async atualizar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;
      const { nome, descricao, preco, categoria } = req.body;

      const servicoExistente = await servicoRepository.buscarPorId(id, usuario_id);
      if (!servicoExistente) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Serviço não encontrado'
        });
      }

      if (nome !== undefined && (typeof nome !== 'string' || !nome.trim())) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'O nome do serviço não pode ser vazio'
        });
      }

      if (preco !== undefined && (preco === null || preco === '' || isNaN(Number(preco)) || Number(preco) < 0)) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'O preço deve ser um valor numérico maior ou igual a zero'
        });
      }

      const servicoAtualizado = await servicoRepository.atualizar(id, usuario_id, {
        nome: nome !== undefined ? nome.trim() : servicoExistente.nome,
        descricao: descricao !== undefined ? descricao : servicoExistente.descricao,
        preco: preco !== undefined ? Number(preco) : servicoExistente.preco,
        categoria: categoria !== undefined ? categoria : servicoExistente.categoria
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Serviço atualizado com sucesso',
        dados: servicoAtualizado
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao atualizar serviço'
      });
    }
  },

  /**
   * DELETE /api/servicos/:id
   * Exclui (soft delete) um serviço do usuário autenticado.
   */
  async excluir(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      const servicoExistente = await servicoRepository.buscarPorId(id, usuario_id);
      if (!servicoExistente) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Serviço não encontrado'
        });
      }

      await servicoRepository.excluir(id, usuario_id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Serviço excluído com sucesso',
        dados: null
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao excluir serviço'
      });
    }
  }
};

module.exports = servicoController;
