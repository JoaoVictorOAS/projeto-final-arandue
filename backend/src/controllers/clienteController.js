const clienteRepository = require('../repositories/clienteRepository');

/**
 * Controller responsável pelas operações de Clientes do MEI.
 */
const clienteController = {
  /**
   * GET /api/clientes
   * Lista todos os clientes do usuário autenticado com busca opcional.
   */
  async listar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { busca } = req.query;

      const clientes = await clienteRepository.listar(usuario_id, busca);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Clientes listados com sucesso',
        dados: clientes
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao listar clientes'
      });
    }
  },

  /**
   * GET /api/clientes/:id
   * Busca um cliente por ID pertencente ao usuário autenticado.
   */
  async buscarPorId(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      const cliente = await clienteRepository.buscarPorId(id, usuario_id);

      if (!cliente) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Cliente não encontrado'
        });
      }

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cliente encontrado com sucesso',
        dados: cliente
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao buscar cliente'
      });
    }
  },

  /**
   * POST /api/clientes
   * Cadastra um novo cliente para o usuário autenticado.
   */
  async criar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { nome, telefone, email, endereco, observacoes } = req.body;

      if (!nome || typeof nome !== 'string' || !nome.trim()) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'O nome do cliente é obrigatório'
        });
      }

      const novoCliente = await clienteRepository.criar({
        usuario_id,
        nome: nome.trim(),
        telefone,
        email,
        endereco,
        observacoes
      });

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Cliente cadastrado com sucesso',
        dados: novoCliente
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao cadastrar cliente'
      });
    }
  },

  /**
   * PUT /api/clientes/:id
   * Atualiza dados de um cliente existente pertencente ao usuário.
   */
  async atualizar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;
      const { nome, telefone, email, endereco, observacoes } = req.body;

      const clienteExistente = await clienteRepository.buscarPorId(id, usuario_id);
      if (!clienteExistente) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Cliente não encontrado'
        });
      }

      if (nome !== undefined && (typeof nome !== 'string' || !nome.trim())) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'O nome do cliente não pode ser vazio'
        });
      }

      const clienteAtualizado = await clienteRepository.atualizar(id, usuario_id, {
        nome: nome !== undefined ? nome.trim() : clienteExistente.nome,
        telefone: telefone !== undefined ? telefone : clienteExistente.telefone,
        email: email !== undefined ? email : clienteExistente.email,
        endereco: endereco !== undefined ? endereco : clienteExistente.endereco,
        observacoes: observacoes !== undefined ? observacoes : clienteExistente.observacoes
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cliente atualizado com sucesso',
        dados: clienteAtualizado
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao atualizar cliente'
      });
    }
  },

  /**
   * DELETE /api/clientes/:id
   * Exclui (soft delete) um cliente do usuário autenticado.
   */
  async excluir(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      const clienteExistente = await clienteRepository.buscarPorId(id, usuario_id);
      if (!clienteExistente) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Cliente não encontrado'
        });
      }

      await clienteRepository.excluir(id, usuario_id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cliente excluído com sucesso',
        dados: null
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao excluir cliente'
      });
    }
  }
};

module.exports = clienteController;
