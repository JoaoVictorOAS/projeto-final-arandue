const pool = require('../../src/config/database');
const estoqueService = require('../../src/services/estoqueService');
const insumoRepository = require('../../src/repositories/insumoRepository');
const fichaTecnicaRepository = require('../../src/repositories/fichaTecnicaRepository');

describe('estoqueService - Integrador de Estoque, Produção e Compras', () => {
  let usuarioId;
  let insumoId;
  let servicoProntoId;
  let servicoEncomendaId;

  beforeAll(async () => {
    const [uRes] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['Service Teste', `teste_service_${Date.now()}@teste.com`, 'hash']
    );
    usuarioId = uRes.insertId;

    const insumo = await insumoRepository.criar({
      usuario_id: usuarioId,
      nome: 'Queijo Mussarela',
      unidade_base: 'g',
      quantidade_atual: 1000,
      estoque_minimo: 500,
      custo_unitario: 0.035
    });
    insumoId = insumo.id;

    // Cria produto pronto (pronta entrega)
    const [spRes] = await pool.query(
      `INSERT INTO servicos (usuario_id, nome, preco, controla_estoque_pronto, estoque_pronto_atual, estoque_pronto_minimo)
       VALUES (?, 'Bolo Vulcão', 60.00, 1, 5, 2)`,
      [usuarioId]
    );
    servicoProntoId = spRes.insertId;

    // Cria serviço sob encomenda com ficha técnica
    const [seRes] = await pool.query(
      `INSERT INTO servicos (usuario_id, nome, preco, controla_estoque_pronto, estoque_pronto_atual, estoque_pronto_minimo)
       VALUES (?, 'Pizza de Mussarela', 45.00, 0, 0, 0)`,
      [usuarioId]
    );
    servicoEncomendaId = seRes.insertId;

    // Vincula insumo à pizza (300g por pizza)
    await fichaTecnicaRepository.substituirFicha(usuarioId, servicoEncomendaId, [
      { insumo_id: insumoId, quantidade_necessaria: 300 }
    ]);
  });

  afterAll(async () => {
    if (usuarioId) {
      await pool.query('DELETE FROM estoque_movimentacoes WHERE usuario_id = ?', [usuarioId]);
      await pool.query('DELETE FROM orcamento_itens WHERE orcamento_id IN (SELECT id FROM orcamentos WHERE usuario_id = ?)', [usuarioId]);
      await pool.query('DELETE FROM orcamentos WHERE usuario_id = ?', [usuarioId]);
      await pool.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
    }
    await pool.end();
  });

  describe('registrarEntradaInsumo', () => {
    it('deve registrar compra de insumo com lançamento de despesa no Livro Caixa', async () => {
      const resultado = await estoqueService.registrarEntradaInsumo(usuarioId, {
        insumo_id: insumoId,
        quantidade: 2,
        unidade: 'kg',
        custo_total: 80.00,
        lancar_no_caixa: true
      });

      expect(resultado.saldo_atual).toBe(3000); // 1000g + 2000g
      expect(resultado.movimentacao_financeira_id).toBeDefined();

      // Valida se despesa caiu no livro caixa
      const [movs] = await pool.query(
        'SELECT * FROM movimentacoes WHERE id = ? AND usuario_id = ?',
        [resultado.movimentacao_financeira_id, usuarioId]
      );
      expect(movs.length).toBe(1);
      expect(movs[0].tipo).toBe('SAIDA');
      expect(Number(movs[0].valor)).toBe(80.00);

      // Valida se movimentação foi gravada no ledger
      const [ledger] = await pool.query(
        'SELECT * FROM estoque_movimentacoes WHERE id = ? AND usuario_id = ?',
        [resultado.movimentacao_estoque_id, usuarioId]
      );
      expect(ledger.length).toBe(1);
      expect(ledger[0].tipo).toBe('ENTRADA_COMPRA');
      expect(Number(ledger[0].quantidade)).toBe(2000);
      expect(ledger[0].movimentacao_financeira_id).toBe(resultado.movimentacao_financeira_id);
    });

    it('deve cadastrar novo insumo dinamicamente se não existir e unidade_base for informada', async () => {
      const nomeInsumoNovo = `Trigo Especial ${Date.now()}`;
      const resultado = await estoqueService.registrarEntradaInsumo(usuarioId, {
        nome: nomeInsumoNovo,
        unidade_base: 'g',
        quantidade: 5,
        unidade: 'kg',
        custo_total: 25.00,
        lancar_no_caixa: false
      });

      expect(resultado.insumo_id).toBeDefined();
      expect(resultado.nome).toBe(nomeInsumoNovo);
      expect(resultado.saldo_atual).toBe(5000);
      expect(resultado.movimentacao_financeira_id).toBeNull();
    });

    it('deve falhar ao registrar entrada de insumo inexistente sem unidade_base', async () => {
      await expect(
        estoqueService.registrarEntradaInsumo(usuarioId, {
          insumo_id: 999999,
          quantidade: 1,
          unidade: 'g'
        })
      ).rejects.toThrow('Insumo não encontrado');
    });
  });

  describe('registrarLoteProducao', () => {
    it('deve abater insumos da receita e incrementar estoque de produtos prontos', async () => {
      // Insumo tem saldo 3000g atualmente. Criamos um serviço com ficha técnica
      const [pRes] = await pool.query(
        `INSERT INTO servicos (usuario_id, nome, preco, controla_estoque_pronto, estoque_pronto_atual, estoque_pronto_minimo)
         VALUES (?, 'Calzone de Queijo', 35.00, 1, 2, 0)`,
        [usuarioId]
      );
      const calzoneId = pRes.insertId;

      await fichaTecnicaRepository.substituirFicha(usuarioId, calzoneId, [
        { insumo_id: insumoId, quantidade_necessaria: 200 } // 200g por calzone
      ]);

      const resultado = await estoqueService.registrarLoteProducao(usuarioId, calzoneId, 3); // 3 calzones = 600g

      expect(resultado.servico_id).toBe(calzoneId);
      expect(resultado.quantidade_produzida).toBe(3);

      // Saldo do calzone deve ser 2 + 3 = 5
      const [calz] = await pool.query('SELECT estoque_pronto_atual FROM servicos WHERE id = ?', [calzoneId]);
      expect(calz[0].estoque_pronto_atual).toBe(5);

      // Saldo do insumo deve ter diminuído 600g (3000 - 600 = 2400)
      const insumoAtual = await insumoRepository.buscarPorId(insumoId, usuarioId);
      expect(Number(insumoAtual.quantidade_atual)).toBe(2400);

      // Ledger deve conter saída de produção e entrada de produção
      const [movs] = await pool.query(
        'SELECT * FROM estoque_movimentacoes WHERE usuario_id = ? AND (insumo_id = ? OR servico_id = ?) ORDER BY id DESC LIMIT 2',
        [usuarioId, insumoId, calzoneId]
      );
      const tipos = movs.map(m => m.tipo);
      expect(tipos).toContain('SAIDA_PRODUCAO');
      expect(tipos).toContain('ENTRADA_PRODUCAO');
    });

    it('deve falhar se houver insumo insuficiente para o lote', async () => {
      // Tenta produzir 100 pizzas (necessita 100 * 300g = 30.000g, temos ~2400g)
      await expect(
        estoqueService.registrarLoteProducao(usuarioId, servicoEncomendaId, 100)
      ).rejects.toThrow(/Estoque insuficiente de/);
    });

    it('deve falhar se o serviço não possuir ficha técnica', async () => {
      const [sSemFicha] = await pool.query(
        'INSERT INTO servicos (usuario_id, nome, preco) VALUES (?, "Servico Sem Ficha", 50.00)',
        [usuarioId]
      );
      await expect(
        estoqueService.registrarLoteProducao(usuarioId, sSemFicha.insertId, 1)
      ).rejects.toThrow('O produto não possui ficha técnica/receita cadastrada');
    });
  });

  describe('processarAprovacaoOrcamento e estornarOrcamento', () => {
    let orcamentoId;

    beforeAll(async () => {
      const [cRes] = await pool.query(
        'INSERT INTO clientes (usuario_id, nome) VALUES (?, ?)',
        [usuarioId, 'Cliente Orcamento Estoque']
      );
      const clienteId = cRes.insertId;

      const [oRes] = await pool.query(
        `INSERT INTO orcamentos (usuario_id, cliente_id, data_emissao, status, subtotal, total)
         VALUES (?, ?, CURDATE(), 'APROVADO', 150.00, 150.00)`,
        [usuarioId, clienteId]
      );
      orcamentoId = oRes.insertId;

      // Item 1: Pronta entrega (1x Bolo Vulcão)
      // Item 2: Sob encomenda (2x Pizza de Mussarela -> 2 * 300g = 600g mussarela)
      await pool.query(
        `INSERT INTO orcamento_itens (orcamento_id, servico_id, quantidade, preco_unitario, subtotal)
         VALUES (?, ?, 1, 60.00, 60.00),
                (?, ?, 2, 45.00, 90.00)`,
        [orcamentoId, servicoProntoId, orcamentoId, servicoEncomendaId]
      );
    });

    it('deve processar baixa mista (pronta entrega e sob encomenda) com sucesso', async () => {
      const insumoAntes = await insumoRepository.buscarPorId(insumoId, usuarioId);
      const saldoInsumoAntes = Number(insumoAntes.quantidade_atual);

      const [prontoAntes] = await pool.query('SELECT estoque_pronto_atual FROM servicos WHERE id = ?', [servicoProntoId]);
      const saldoProntoAntes = prontoAntes[0].estoque_pronto_atual;

      const res = await estoqueService.processarAprovacaoOrcamento(orcamentoId, usuarioId);
      expect(res).toBe(true);

      // Produto pronto deve ter diminuído em 1
      const [prontoDepois] = await pool.query('SELECT estoque_pronto_atual FROM servicos WHERE id = ?', [servicoProntoId]);
      expect(prontoDepois[0].estoque_pronto_atual).toBe(saldoProntoAntes - 1);

      // Insumo deve ter diminuído em 600g (2 pizzas * 300g)
      const insumoDepois = await insumoRepository.buscarPorId(insumoId, usuarioId);
      expect(Number(insumoDepois.quantidade_atual)).toBe(saldoInsumoAntes - 600);

      // Ledger deve conter duas SAIDA_VENDA com orcamento_id
      const [movs] = await pool.query(
        'SELECT * FROM estoque_movimentacoes WHERE orcamento_id = ? AND tipo = "SAIDA_VENDA"',
        [orcamentoId]
      );
      expect(movs.length).toBe(2);
    });

    it('deve estornar movimentações e restaurar saldos ao cancelar orçamento', async () => {
      const insumoAntes = await insumoRepository.buscarPorId(insumoId, usuarioId);
      const saldoInsumoAntes = Number(insumoAntes.quantidade_atual);

      const [prontoAntes] = await pool.query('SELECT estoque_pronto_atual FROM servicos WHERE id = ?', [servicoProntoId]);
      const saldoProntoAntes = prontoAntes[0].estoque_pronto_atual;

      const estornoOk = await estoqueService.estornarOrcamento(orcamentoId, usuarioId);
      expect(estornoOk).toBe(true);

      // Produto pronto restaurado (+1)
      const [prontoDepois] = await pool.query('SELECT estoque_pronto_atual FROM servicos WHERE id = ?', [servicoProntoId]);
      expect(prontoDepois[0].estoque_pronto_atual).toBe(saldoProntoAntes + 1);

      // Insumo restaurado (+600g)
      const insumoDepois = await insumoRepository.buscarPorId(insumoId, usuarioId);
      expect(Number(insumoDepois.quantidade_atual)).toBe(saldoInsumoAntes + 600);

      // Ledger deve conter movimentações de AJUSTE_INVENTARIO referentes ao estorno
      const [movsAjuste] = await pool.query(
        'SELECT * FROM estoque_movimentacoes WHERE orcamento_id = ? AND tipo = "AJUSTE_INVENTARIO"',
        [orcamentoId]
      );
      expect(movsAjuste.length).toBe(2);
    });
  });

  describe('simularProducao', () => {
    it('deve simular capacidade produtiva utilizando estoque real do banco', async () => {
      // Pizza necessita de 300g de mussarela
      const resultado = await estoqueService.simularProducao(usuarioId, {
        servico_id: servicoEncomendaId,
        usar_estoque_atual: true
      });

      expect(resultado).toBeDefined();
      expect(resultado.rendimentoMaximo).toBeGreaterThan(0);
      expect(resultado.custoUnitario).toBeGreaterThan(0);
      expect(resultado.sobras).toBeDefined();
    });

    it('deve simular capacidade produtiva utilizando insumos customizados informados', async () => {
      const resultado = await estoqueService.simularProducao(usuarioId, {
        servico_id: servicoEncomendaId,
        insumos_informados: [
          { nome: 'Queijo Mussarela', quantidade: 1.5, unidade: 'kg' } // 1500g / 300g = 5 pizzas
        ]
      });

      expect(resultado.rendimentoMaximo).toBe(5);
      expect(resultado.insumoLimitante).not.toBeNull();
    });

    it('deve lançar erro se o produto não possuir ficha técnica para simulação', async () => {
      const [sSemFicha] = await pool.query(
        'INSERT INTO servicos (usuario_id, nome, preco) VALUES (?, "Simulacao Sem Ficha", 20.00)',
        [usuarioId]
      );

      await expect(
        estoqueService.simularProducao(usuarioId, {
          servico_id: sSemFicha.insertId,
          usar_estoque_atual: true
        })
      ).rejects.toThrow('Produto não possui ficha técnica cadastrada para simulação');
    });
  });
});
