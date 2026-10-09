const pool = require('../config/database');
const insumoRepository = require('../repositories/insumoRepository');
const fichaTecnicaRepository = require('../repositories/fichaTecnicaRepository');
const estoqueMovimentacaoRepository = require('../repositories/estoqueMovimentacaoRepository');
const { converterParaUnidadeBase, calcularCustoMedioPonderado, formatarGrandezaAmigavel } = require('../utils/conversorUnidades');
const { simularCapacidade } = require('./simuladorProducaoService');

const estoqueService = {
  /**
   * Registra compra/entrada de insumo com recálculo de CMP e integração ao Livro Caixa.
   */
  async registrarEntradaInsumo(usuario_id, {
    insumo_id,
    nome,
    unidade_base,
    quantidade,
    unidade,
    custo_total = null,
    lancar_no_caixa = true
  }) {
    const qtdNum = Number(quantidade);
    if (isNaN(qtdNum) || qtdNum <= 0) {
      throw new Error('A quantidade de entrada deve ser maior que zero.');
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let insumo = null;
      if (insumo_id) {
        insumo = await insumoRepository.buscarPorId(insumo_id, usuario_id, conn);
      } else if (nome) {
        insumo = await insumoRepository.buscarPorNome(nome, usuario_id, conn);
      }

      if (!insumo && nome && unidade_base) {
        insumo = await insumoRepository.criar({
          usuario_id,
          nome,
          unidade_base,
          quantidade_atual: 0,
          estoque_minimo: 0,
          custo_unitario: 0
        }, conn);
      }

      if (!insumo) {
        throw new Error('Insumo não encontrado. Forneça o insumo_id ou nome e unidade_base para cadastrar.');
      }

      const qtdBase = converterParaUnidadeBase(quantidade, unidade || insumo.unidade_base, insumo.unidade_base);
      const custoTotalNum = custo_total !== null && custo_total !== undefined ? Number(custo_total) : null;
      const custoNovoUnitario = (custoTotalNum !== null && qtdBase > 0)
        ? custoTotalNum / qtdBase
        : Number(insumo.custo_unitario);

      const novoCMP = (custoTotalNum !== null)
        ? calcularCustoMedioPonderado(insumo.quantidade_atual, insumo.custo_unitario, qtdBase, custoNovoUnitario)
        : Number(insumo.custo_unitario);

      const novaQtdTotal = Number(insumo.quantidade_atual) + qtdBase;

      await insumoRepository.atualizarSaldoECusto(insumo.id, usuario_id, novaQtdTotal, novoCMP, conn);

      // Integração opcional com o Livro Caixa
      let movFinanceiraId = null;
      if (lancar_no_caixa && custoTotalNum && custoTotalNum > 0) {
        const [finRes] = await conn.query(
          `INSERT INTO movimentacoes (usuario_id, tipo, categoria, valor, data_movimentacao, descricao)
           VALUES (?, 'SAIDA', 'Insumos/Matéria-Prima', ?, CURDATE(), ?)`,
          [usuario_id, custoTotalNum, `Compra de insumo: ${insumo.nome}`]
        );
        movFinanceiraId = finRes.insertId;
      }

      // Registro no Ledger
      const movEstoque = await estoqueMovimentacaoRepository.registrarMovimentacao({
        usuario_id,
        insumo_id: insumo.id,
        tipo: 'ENTRADA_COMPRA',
        quantidade: qtdBase,
        custo_total: custoTotalNum,
        movimentacao_financeira_id: movFinanceiraId,
        motivo: `Entrada de ${formatarGrandezaAmigavel(qtdBase, insumo.unidade_base)}`
      }, conn);

      await conn.commit();

      return {
        insumo_id: insumo.id,
        nome: insumo.nome,
        saldo_anterior: Number(insumo.quantidade_atual),
        saldo_atual: novaQtdTotal,
        saldo_formatado: formatarGrandezaAmigavel(novaQtdTotal, insumo.unidade_base),
        custo_unitario_atual: novoCMP,
        movimentacao_financeira_id: movFinanceiraId,
        movimentacao_estoque_id: movEstoque.id
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /**
   * Baixa estoque automaticamente quando um orçamento é aprovado.
   */
  async processarAprovacaoOrcamento(orcamentoId, usuario_id, externalConn = null) {
    const conn = externalConn || await pool.getConnection();
    const shouldManageTransaction = !externalConn;

    try {
      if (shouldManageTransaction) await conn.beginTransaction();

      // Busca os itens do orçamento
      const [itens] = await conn.query(
        `SELECT oi.servico_id, oi.quantidade, s.nome AS nome_servico, s.controla_estoque_pronto, s.estoque_pronto_atual
         FROM orcamento_itens oi
         JOIN servicos s ON oi.servico_id = s.id
         WHERE oi.orcamento_id = ? AND s.usuario_id = ?`,
        [orcamentoId, usuario_id]
      );

      for (const item of itens) {
        const qtdVendida = Number(item.quantidade);

        if (item.controla_estoque_pronto) {
          // Baixa produto pronto
          await conn.query(
            'UPDATE servicos SET estoque_pronto_atual = estoque_pronto_atual - ? WHERE id = ? AND usuario_id = ?',
            [qtdVendida, item.servico_id, usuario_id]
          );

          await estoqueMovimentacaoRepository.registrarMovimentacao({
            usuario_id,
            servico_id: item.servico_id,
            tipo: 'SAIDA_VENDA',
            quantidade: qtdVendida,
            orcamento_id: orcamentoId,
            motivo: `Venda de produto pronto (Orçamento #${orcamentoId})`
          }, conn);
        } else {
          // Sob encomenda: abate insumos da ficha técnica
          const ficha = await fichaTecnicaRepository.obterFichaPorServico(usuario_id, item.servico_id, conn);

          for (const ing of ficha) {
            const debito = Number(ing.quantidade_necessaria) * qtdVendida;
            await insumoRepository.debitarSaldo(ing.insumo_id, usuario_id, debito, conn);

            await estoqueMovimentacaoRepository.registrarMovimentacao({
              usuario_id,
              insumo_id: ing.insumo_id,
              tipo: 'SAIDA_VENDA',
              quantidade: debito,
              orcamento_id: orcamentoId,
              motivo: `Consumo sob encomenda para ${qtdVendida}x ${item.nome_servico} (Orçamento #${orcamentoId})`
            }, conn);
          }
        }
      }

      if (shouldManageTransaction) await conn.commit();
      return true;
    } catch (err) {
      if (shouldManageTransaction) await conn.rollback();
      throw err;
    } finally {
      if (shouldManageTransaction) conn.release();
    }
  },

  /**
   * Estorna baixa de estoque quando orçamento for cancelado.
   */
  async estornarOrcamento(orcamentoId, usuario_id, externalConn = null) {
    const conn = externalConn || await pool.getConnection();
    const shouldManageTransaction = !externalConn;

    try {
      if (shouldManageTransaction) await conn.beginTransaction();

      // Checagem de idempotência: se o orçamento já foi estornado, não duplica créditos ou movimentações
      const [estornoExistente] = await conn.query(
        'SELECT id FROM estoque_movimentacoes WHERE orcamento_id = ? AND usuario_id = ? AND tipo = "AJUSTE_INVENTARIO" LIMIT 1',
        [orcamentoId, usuario_id]
      );
      if (estornoExistente.length > 0) {
        if (shouldManageTransaction) await conn.commit();
        return true;
      }

      const [movs] = await conn.query(
        'SELECT * FROM estoque_movimentacoes WHERE orcamento_id = ? AND usuario_id = ? AND tipo = "SAIDA_VENDA"',
        [orcamentoId, usuario_id]
      );

      for (const mov of movs) {
        if (mov.insumo_id) {
          await insumoRepository.creditarSaldo(mov.insumo_id, usuario_id, Number(mov.quantidade), conn);
        } else if (mov.servico_id) {
          await conn.query(
            'UPDATE servicos SET estoque_pronto_atual = estoque_pronto_atual + ? WHERE id = ? AND usuario_id = ?',
            [Number(mov.quantidade), mov.servico_id, usuario_id]
          );
        }
        await estoqueMovimentacaoRepository.registrarMovimentacao({
          usuario_id,
          insumo_id: mov.insumo_id,
          servico_id: mov.servico_id,
          tipo: 'AJUSTE_INVENTARIO',
          quantidade: Number(mov.quantidade),
          orcamento_id: orcamentoId,
          motivo: `Estorno por cancelamento do Orçamento #${orcamentoId}`
        }, conn);
      }

      if (shouldManageTransaction) await conn.commit();
      return true;
    } catch (err) {
      if (shouldManageTransaction) await conn.rollback();
      throw err;
    } finally {
      if (shouldManageTransaction) conn.release();
    }
  },

  /**
   * Registra batelada de produção (transforma insumos em produto pronto).
   */
  async registrarLoteProducao(usuario_id, servico_id, quantidadeLote) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [servicos] = await conn.query(
        'SELECT * FROM servicos WHERE id = ? AND usuario_id = ? LIMIT 1',
        [servico_id, usuario_id]
      );
      if (servicos.length === 0) throw new Error('Produto/Serviço não encontrado');
      const servico = servicos[0];

      const ficha = await fichaTecnicaRepository.obterFichaPorServico(usuario_id, servico_id, conn);
      if (ficha.length === 0) throw new Error('O produto não possui ficha técnica/receita cadastrada');

      const qtdLoteNum = Number(quantidadeLote);
      if (isNaN(qtdLoteNum) || qtdLoteNum <= 0) {
        throw new Error('Quantidade do lote inválida');
      }

      // Validação de saldo prévio
      for (const ing of ficha) {
        const necessita = Number(ing.quantidade_necessaria) * qtdLoteNum;
        if (Number(ing.saldo_insumo) < necessita) {
          throw new Error(`Estoque insuficiente de '${ing.nome_insumo}'. Disponível: ${formatarGrandezaAmigavel(ing.saldo_insumo, ing.unidade_base)}, necessário: ${formatarGrandezaAmigavel(necessita, ing.unidade_base)}`);
        }
      }

      // Baixa insumos
      for (const ing of ficha) {
        const debito = Number(ing.quantidade_necessaria) * qtdLoteNum;
        await insumoRepository.debitarSaldo(ing.insumo_id, usuario_id, debito, conn);

        await estoqueMovimentacaoRepository.registrarMovimentacao({
          usuario_id,
          insumo_id: ing.insumo_id,
          tipo: 'SAIDA_PRODUCAO',
          quantidade: debito,
          motivo: `Produção de ${qtdLoteNum}x ${servico.nome}`
        }, conn);
      }

      // Alimenta produto pronto
      await conn.query(
        'UPDATE servicos SET controla_estoque_pronto = 1, estoque_pronto_atual = estoque_pronto_atual + ? WHERE id = ? AND usuario_id = ?',
        [qtdLoteNum, servico_id, usuario_id]
      );

      await estoqueMovimentacaoRepository.registrarMovimentacao({
        usuario_id,
        servico_id,
        tipo: 'ENTRADA_PRODUCAO',
        quantidade: qtdLoteNum,
        motivo: `Lote de produção finalizado: ${qtdLoteNum} unidades`
      }, conn);

      await conn.commit();
      return {
        servico_id,
        nome: servico.nome,
        quantidade_produzida: qtdLoteNum
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /**
   * Executa a simulação produtiva.
   */
  async simularProducao(usuario_id, { servico_id, insumos_informados = null, usar_estoque_atual = false }) {
    const ficha = await fichaTecnicaRepository.obterFichaPorServico(usuario_id, servico_id);
    if (ficha.length === 0) {
      throw new Error('Produto não possui ficha técnica cadastrada para simulação');
    }

    let insumosDisponiveis = [];

    if (usar_estoque_atual) {
      insumosDisponiveis = ficha.map(ing => ({
        insumo_id: ing.insumo_id,
        quantidade_base: Number(ing.saldo_insumo)
      }));
    } else if (Array.isArray(insumos_informados) && insumos_informados.length > 0) {
      // Normaliza itens informados
      for (const inf of insumos_informados) {
        let insumo = null;
        if (inf.insumo_id) {
          insumo = ficha.find(f => f.insumo_id === Number(inf.insumo_id));
        } else if (inf.nome) {
          insumo = ficha.find(f => f.nome_insumo.toLowerCase() === inf.nome.trim().toLowerCase());
        }

        if (insumo) {
          const qtdBase = converterParaUnidadeBase(inf.quantidade, inf.unidade || insumo.unidade_base, insumo.unidade_base);
          insumosDisponiveis.push({
            insumo_id: insumo.insumo_id,
            quantidade_base: qtdBase
          });
        }
      }
    }

    return simularCapacidade({
      ingredientesFicha: ficha,
      insumosDisponiveis
    });
  },

  /**
   * Processa arquivo XML de NF-e e retorna dados pré-formatados.
   */
  async processarXmlNotaFiscal(xmlString) {
    const leitorXmlNfe = require('./fiscal/leitorXmlNfe');
    return leitorXmlNfe.parse(xmlString);
  },

  /**
   * Registra compra e entrada de múltiplos insumos a partir de documento fiscal (XML, Foto ou Lote).
   */
  async registrarEntradaLoteNotaFiscal(usuario_id, {
    fornecedor = null,
    numero_documento = null,
    itens = [],
    lancar_no_caixa = true
  }) {
    if (!Array.isArray(itens) || itens.length === 0) {
      throw new Error('A lista de itens da nota fiscal não pode estar vazia.');
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let valorTotalNota = 0;
      const itensProcessados = [];

      for (const item of itens) {
        const { nome, insumo_id, quantidade, unidade, custo_total, valor_total } = item;
        const qtdNum = Number(quantidade);
        if (isNaN(qtdNum) || qtdNum <= 0) continue;

        let insumo = null;
        if (insumo_id) {
          insumo = await insumoRepository.buscarPorId(insumo_id, usuario_id, conn);
        } else if (nome) {
          insumo = await insumoRepository.buscarPorNome(nome, usuario_id, conn);
        }

        // Se o insumo não existe, determina unidade base apropriada e cria
        if (!insumo && nome) {
          const uNormalizada = (unidade || 'un').toLowerCase();
          const unidade_base = ['kg', 'g'].includes(uNormalizada) ? 'g' : ['l', 'ml'].includes(uNormalizada) ? 'ml' : 'un';
          insumo = await insumoRepository.criar({
            usuario_id,
            nome: nome.trim(),
            unidade_base,
            quantidade_atual: 0,
            estoque_minimo: 0,
            custo_unitario: 0
          }, conn);
        }

        if (!insumo) continue;

        const qtdBase = converterParaUnidadeBase(qtdNum, unidade || insumo.unidade_base, insumo.unidade_base);
        const custoItem = Number(custo_total || valor_total || 0);
        valorTotalNota += custoItem;

        const custoNovoUnitario = (custoItem > 0 && qtdBase > 0)
          ? custoItem / qtdBase
          : Number(insumo.custo_unitario);

        const novoCMP = (custoItem > 0)
          ? calcularCustoMedioPonderado(insumo.quantidade_atual, insumo.custo_unitario, qtdBase, custoNovoUnitario)
          : Number(insumo.custo_unitario);

        const novaQtdTotal = Number(insumo.quantidade_atual) + qtdBase;

        await insumoRepository.atualizarSaldoECusto(insumo.id, usuario_id, novaQtdTotal, novoCMP, conn);

        const motivoLedger = `Entrada via NF ${numero_documento || 'S/N'}${fornecedor ? ` (${fornecedor})` : ''}`;
        await estoqueMovimentacaoRepository.registrarMovimentacao({
          usuario_id,
          insumo_id: insumo.id,
          tipo: 'ENTRADA_COMPRA',
          quantidade: qtdBase,
          custo_total: custoItem,
          motivo: motivoLedger
        }, conn);

        itensProcessados.push({
          insumo_id: insumo.id,
          nome: insumo.nome,
          quantidade_adicionada: qtdBase,
          unidade_base: insumo.unidade_base,
          novo_saldo: novaQtdTotal,
          novo_cmp: novoCMP
        });
      }

      // Lançamento consolidado no Livro Caixa
      let movFinanceiraId = null;
      if (lancar_no_caixa && valorTotalNota > 0) {
        const descCaixa = `Compra NF ${numero_documento || 'S/N'}${fornecedor ? ` - ${fornecedor}` : ''}`;
        const [finRes] = await conn.query(
          `INSERT INTO movimentacoes (usuario_id, tipo, categoria, valor, data_movimentacao, descricao)
           VALUES (?, 'SAIDA', 'Materiais & Insumos', ?, CURDATE(), ?)`,
          [usuario_id, valorTotalNota, descCaixa]
        );
        movFinanceiraId = finRes.insertId;
      }

      await conn.commit();

      return {
        total_itens_processados: itensProcessados.length,
        valor_total_nota: Number(valorTotalNota.toFixed(2)),
        movimentacao_caixa_id: movFinanceiraId,
        itens: itensProcessados
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
};

module.exports = estoqueService;
