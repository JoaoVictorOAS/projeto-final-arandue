const servicoRepository = require('../repositories/servicoRepository');
const assinaturaRepository = require('../repositories/assinaturaRepository');
const clienteRepository = require('../repositories/clienteRepository');
const cobrancaRepository = require('../repositories/cobrancaRepository');

const PERIODICIDADES_VALIDAS = ['SEMANAL', 'QUINZENAL', 'MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'];
const STATUS_ASSINATURA_VALIDOS = ['ATIVA', 'PAUSADA', 'CANCELADA'];

/**
 * Controller responsável pelas operações de Serviços, Produtos e Assinaturas Recorrentes do MEI.
 */
const servicoController = {
  /**
   * GET /api/servicos
   * Lista todos os serviços do usuário autenticado com filtros de busca, categoria e recorrência.
   */
  async listar(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { busca, categoria, recorrente } = req.query;

      const servicos = await servicoRepository.listar(usuario_id, { busca, categoria, recorrente });

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
      const { nome, descricao, preco, categoria, recorrente, periodicidade, dia_vencimento_padrao } = req.body;

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

      const isRecorrente = Boolean(recorrente);
      let perFinal = null;
      let diaVencFinal = null;

      if (isRecorrente) {
        if (periodicidade) {
          const perUpper = String(periodicidade).trim().toUpperCase();
          if (!PERIODICIDADES_VALIDAS.includes(perUpper)) {
            return res.status(400).json({
              sucesso: false,
              mensagem: `Periodicidade inválida: ${periodicidade}. Opções permitidas: ${PERIODICIDADES_VALIDAS.join(', ')}`
            });
          }
          perFinal = perUpper;
        } else {
          perFinal = 'MENSAL';
        }

        if (dia_vencimento_padrao !== undefined && dia_vencimento_padrao !== null && dia_vencimento_padrao !== '') {
          const diaNum = Number(dia_vencimento_padrao);
          if (isNaN(diaNum) || diaNum < 1 || diaNum > 31) {
            return res.status(400).json({
              sucesso: false,
              mensagem: 'O dia de vencimento padrão deve ser um número inteiro entre 1 e 31'
            });
          }
          diaVencFinal = Math.floor(diaNum);
        } else {
          diaVencFinal = 10;
        }
      }

      const novoServico = await servicoRepository.criar({
        usuario_id,
        nome: nome.trim(),
        descricao,
        preco: Number(preco),
        categoria,
        recorrente: isRecorrente,
        periodicidade: perFinal,
        dia_vencimento_padrao: diaVencFinal
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
      const { nome, descricao, preco, categoria, recorrente, periodicidade, dia_vencimento_padrao } = req.body;

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

      const dadosAtualizar = {
        nome: nome !== undefined ? nome.trim() : servicoExistente.nome,
        descricao: descricao !== undefined ? descricao : servicoExistente.descricao,
        preco: preco !== undefined ? Number(preco) : servicoExistente.preco,
        categoria: categoria !== undefined ? categoria : servicoExistente.categoria
      };

      if (recorrente !== undefined) {
        dadosAtualizar.recorrente = Boolean(recorrente);
        if (!dadosAtualizar.recorrente) {
          dadosAtualizar.periodicidade = null;
          dadosAtualizar.dia_vencimento_padrao = null;
        }
      }

      if (periodicidade !== undefined && (dadosAtualizar.recorrente !== false)) {
        if (periodicidade) {
          const perUpper = String(periodicidade).trim().toUpperCase();
          if (!PERIODICIDADES_VALIDAS.includes(perUpper)) {
            return res.status(400).json({
              sucesso: false,
              mensagem: `Periodicidade inválida: ${periodicidade}. Opções permitidas: ${PERIODICIDADES_VALIDAS.join(', ')}`
            });
          }
          dadosAtualizar.periodicidade = perUpper;
        } else {
          dadosAtualizar.periodicidade = null;
        }
      }

      if (dia_vencimento_padrao !== undefined && (dadosAtualizar.recorrente !== false)) {
        if (dia_vencimento_padrao !== null && dia_vencimento_padrao !== '') {
          const diaNum = Number(dia_vencimento_padrao);
          if (isNaN(diaNum) || diaNum < 1 || diaNum > 31) {
            return res.status(400).json({
              sucesso: false,
              mensagem: 'O dia de vencimento padrão deve ser um número inteiro entre 1 e 31'
            });
          }
          dadosAtualizar.dia_vencimento_padrao = Math.floor(diaNum);
        } else {
          dadosAtualizar.dia_vencimento_padrao = null;
        }
      }

      const servicoAtualizado = await servicoRepository.atualizar(id, usuario_id, dadosAtualizar);

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
  },

  // =========================================================================
  // GESTÃO DE ASSINATURAS RECORRENTES
  // =========================================================================

  /**
   * GET /api/servicos/assinaturas
   * Lista assinaturas do MEI autenticado com resumo de MRR e status.
   */
  async listarAssinaturas(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { status, cliente_id } = req.query;

      const assinaturas = await assinaturaRepository.listar(usuario_id, { status, cliente_id });
      const resumo = await assinaturaRepository.obterResumo(usuario_id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Assinaturas listadas com sucesso',
        dados: assinaturas,
        resumo
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao listar assinaturas'
      });
    }
  },

  /**
   * GET /api/servicos/assinaturas/:id
   * Busca uma assinatura por ID do usuário autenticado.
   */
  async buscarAssinaturaPorId(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      const assinatura = await assinaturaRepository.buscarPorId(id, usuario_id);
      if (!assinatura) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Assinatura não encontrada'
        });
      }

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Assinatura encontrada com sucesso',
        dados: assinatura
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao buscar assinatura'
      });
    }
  },

  /**
   * POST /api/servicos/assinaturas
   * Cadastra uma nova assinatura recorrente vinculando cliente e serviço.
   */
  async criarAssinatura(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const {
        cliente_id,
        servico_id,
        valor,
        periodicidade,
        dia_vencimento,
        data_inicio,
        proximo_vencimento,
        observacoes,
        status
      } = req.body;

      if (!cliente_id) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'O campo cliente_id é obrigatório'
        });
      }

      if (!servico_id) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'O campo servico_id é obrigatório'
        });
      }

      const servico = await servicoRepository.buscarPorId(servico_id, usuario_id);
      if (!servico) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Serviço não encontrado'
        });
      }

      const cliente = await clienteRepository.buscarPorId(cliente_id, usuario_id);
      if (!cliente) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Cliente não encontrado'
        });
      }

      // Herança de valores do serviço se não fornecidos
      const valorFinal = (valor !== undefined && valor !== null && valor !== '')
        ? Number(valor)
        : Number(servico.preco || 0);

      if (isNaN(valorFinal) || valorFinal < 0) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'O valor da assinatura deve ser um número maior ou igual a zero'
        });
      }

      const periodicidadeFinal = (periodicidade && String(periodicidade).trim())
        ? String(periodicidade).trim().toUpperCase()
        : (servico.periodicidade || 'MENSAL');

      if (!PERIODICIDADES_VALIDAS.includes(periodicidadeFinal)) {
        return res.status(400).json({
          sucesso: false,
          mensagem: `Periodicidade inválida: ${periodicidade}. Opções permitidas: ${PERIODICIDADES_VALIDAS.join(', ')}`
        });
      }

      const diaVencimentoFinal = (dia_vencimento !== undefined && dia_vencimento !== null && dia_vencimento !== '')
        ? Number(dia_vencimento)
        : (servico.dia_vencimento_padrao || 10);

      if (isNaN(diaVencimentoFinal) || diaVencimentoFinal < 1 || diaVencimentoFinal > 31) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'O dia de vencimento deve ser um número entre 1 e 31'
        });
      }

      const statusFinal = status ? String(status).trim().toUpperCase() : 'ATIVA';
      if (!STATUS_ASSINATURA_VALIDOS.includes(statusFinal)) {
        return res.status(400).json({
          sucesso: false,
          mensagem: `Status inválido: ${status}. Opções permitidas: ${STATUS_ASSINATURA_VALIDOS.join(', ')}`
        });
      }

      const novaAssinatura = await assinaturaRepository.criar({
        usuario_id,
        cliente_id: Number(cliente_id),
        servico_id: Number(servico_id),
        valor: valorFinal,
        periodicidade: periodicidadeFinal,
        dia_vencimento: diaVencimentoFinal,
        data_inicio,
        proximo_vencimento,
        observacoes,
        status: statusFinal
      });

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Assinatura cadastrada com sucesso',
        dados: novaAssinatura
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao cadastrar assinatura'
      });
    }
  },

  /**
   * PUT /api/servicos/assinaturas/:id
   * Atualiza dados de uma assinatura existente.
   */
  async atualizarAssinatura(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;
      const { valor, periodicidade, dia_vencimento, data_inicio, proximo_vencimento, status, observacoes } = req.body;

      const existente = await assinaturaRepository.buscarPorId(id, usuario_id);
      if (!existente) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Assinatura não encontrada'
        });
      }

      const dadosAtualizar = {};

      if (valor !== undefined) {
        const v = Number(valor);
        if (isNaN(v) || v < 0) {
          return res.status(400).json({
            sucesso: false,
            mensagem: 'O valor deve ser um número maior ou igual a zero'
          });
        }
        dadosAtualizar.valor = v;
      }

      if (periodicidade !== undefined) {
        const perUpper = String(periodicidade).trim().toUpperCase();
        if (!PERIODICIDADES_VALIDAS.includes(perUpper)) {
          return res.status(400).json({
            sucesso: false,
            mensagem: `Periodicidade inválida: ${periodicidade}. Opções permitidas: ${PERIODICIDADES_VALIDAS.join(', ')}`
          });
        }
        dadosAtualizar.periodicidade = perUpper;
      }

      if (dia_vencimento !== undefined) {
        const d = Number(dia_vencimento);
        if (isNaN(d) || d < 1 || d > 31) {
          return res.status(400).json({
            sucesso: false,
            mensagem: 'O dia de vencimento deve estar entre 1 e 31'
          });
        }
        dadosAtualizar.dia_vencimento = Math.floor(d);
      }

      if (data_inicio !== undefined) dadosAtualizar.data_inicio = data_inicio;
      if (proximo_vencimento !== undefined) dadosAtualizar.proximo_vencimento = proximo_vencimento;

      if (status !== undefined) {
        const stUpper = String(status).trim().toUpperCase();
        if (!STATUS_ASSINATURA_VALIDOS.includes(stUpper)) {
          return res.status(400).json({
            sucesso: false,
            mensagem: `Status inválido: ${status}. Opções permitidas: ${STATUS_ASSINATURA_VALIDOS.join(', ')}`
          });
        }
        dadosAtualizar.status = stUpper;
      }

      if (observacoes !== undefined) dadosAtualizar.observacoes = observacoes;

      const atualizada = await assinaturaRepository.atualizar(id, usuario_id, dadosAtualizar);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Assinatura atualizada com sucesso',
        dados: atualizada
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao atualizar assinatura'
      });
    }
  },

  /**
   * PATCH /api/servicos/assinaturas/:id/status
   * Altera apenas o status da assinatura (ATIVA, PAUSADA, CANCELADA).
   */
  async atualizarStatusAssinatura(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'O campo status é obrigatório'
        });
      }

      const stUpper = String(status).trim().toUpperCase();
      if (!STATUS_ASSINATURA_VALIDOS.includes(stUpper)) {
        return res.status(400).json({
          sucesso: false,
          mensagem: `Status inválido: ${status}. Opções permitidas: ${STATUS_ASSINATURA_VALIDOS.join(', ')}`
        });
      }

      const existente = await assinaturaRepository.buscarPorId(id, usuario_id);
      if (!existente) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Assinatura não encontrada'
        });
      }

      const atualizada = await assinaturaRepository.atualizarStatus(id, usuario_id, stUpper);

      return res.status(200).json({
        sucesso: true,
        mensagem: `Status da assinatura atualizado para ${stUpper}`,
        dados: atualizada
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao atualizar status da assinatura'
      });
    }
  },

  /**
   * POST /api/servicos/assinaturas/:id/gerar-cobranca
   * Gera automaticamente uma cobrança para o ciclo da assinatura e avança a data de próximo vencimento.
   */
  async gerarCobrancaAssinatura(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { id } = req.params;

      const assinatura = await assinaturaRepository.buscarPorId(id, usuario_id);
      if (!assinatura) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Assinatura não encontrada'
        });
      }

      if (assinatura.status === 'CANCELADA') {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Não é possível gerar cobrança para uma assinatura cancelada'
        });
      }

      const dataVencimentoCobranca = assinaturaRepository.formatarDataYMD(assinatura.proximo_vencimento);

      // Cria cobrança através do cobrancaRepository
      const cobranca = await cobrancaRepository.criar({
        usuario_id,
        cliente_id: assinatura.cliente_id,
        valor: Number(assinatura.valor),
        vencimento: dataVencimentoCobranca,
        status: 'PENDENTE',
        observacoes: `Assinatura #${assinatura.id} (${assinatura.servico_nome || 'Serviço Recorrente'}) - Ciclo ${assinatura.periodicidade}${assinatura.observacoes ? ` | ${assinatura.observacoes}` : ''}`
      });

      // Avança o próximo vencimento para o ciclo seguinte
      const novoProximoVencimento = assinaturaRepository.calcularProximoVencimento(
        assinatura.proximo_vencimento,
        assinatura.periodicidade,
        assinatura.dia_vencimento
      );

      const assinaturaAtualizada = await assinaturaRepository.atualizar(id, usuario_id, {
        proximo_vencimento: novoProximoVencimento
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cobrança gerada com sucesso e ciclo de assinatura atualizado',
        dados: {
          cobranca,
          assinatura: assinaturaAtualizada,
          proximo_vencimento: novoProximoVencimento
        }
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao gerar cobrança para a assinatura'
      });
    }
  }
};

module.exports = servicoController;
