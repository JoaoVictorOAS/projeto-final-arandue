const pool = require('../../src/config/database');
const estoqueMovimentacaoRepository = require('../../src/repositories/estoqueMovimentacaoRepository');

describe('estoqueMovimentacaoRepository', () => {
  let usuarioId;
  let outroUsuarioId;
  let insumoId;
  let servicoId;

  beforeAll(async () => {
    // Cria usuário de teste principal
    const [uRes] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['Ledger Teste', `teste_ledger_${Date.now()}@teste.com`, 'hash']
    );
    usuarioId = uRes.insertId;

    // Cria outro usuário para teste multi-tenant
    const [uRes2] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['Outro Ledger Teste', `outro_ledger_${Date.now()}@teste.com`, 'hash']
    );
    outroUsuarioId = uRes2.insertId;

    // Cria insumo para testes com JOIN
    const [iRes] = await pool.query(
      'INSERT INTO insumos (usuario_id, nome, unidade_base, quantidade_atual, estoque_minimo, custo_unitario) VALUES (?, ?, ?, ?, ?, ?)',
      [usuarioId, 'Farinha de Trigo Especial', 'g', 5000, 1000, 0.005]
    );
    insumoId = iRes.insertId;

    // Cria serviço para testes com JOIN
    const [sRes] = await pool.query(
      'INSERT INTO servicos (usuario_id, nome, preco, controla_estoque_pronto, estoque_pronto_atual, estoque_pronto_minimo) VALUES (?, ?, ?, ?, ?, ?)',
      [usuarioId, 'Bolo de Cenoura', 45.00, 1, 10, 2]
    );
    servicoId = sRes.insertId;
  });

  afterAll(async () => {
    if (usuarioId) {
      await pool.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
    }
    if (outroUsuarioId) {
      await pool.query('DELETE FROM usuarios WHERE id = ?', [outroUsuarioId]);
    }
    await pool.end();
  });

  it('deve registrar e listar movimentações auditáveis', async () => {
    const mov = await estoqueMovimentacaoRepository.registrarMovimentacao({
      usuario_id: usuarioId,
      tipo: 'ENTRADA_COMPRA',
      quantidade: 5000,
      custo_total: 25.00,
      motivo: 'Compra de farinha atacado'
    });

    expect(mov.id).toBeDefined();
    expect(mov.usuario_id).toBe(usuarioId);
    expect(mov.tipo).toBe('ENTRADA_COMPRA');
    expect(Number(mov.quantidade)).toBe(5000);
    expect(Number(mov.custo_total)).toBe(25.00);
    expect(mov.motivo).toBe('Compra de farinha atacado');

    const lista = await estoqueMovimentacaoRepository.listarMovimentacoes(usuarioId, { limite: 10 });
    expect(lista.length).toBeGreaterThanOrEqual(1);
    expect(lista[0].tipo).toBe('ENTRADA_COMPRA');
    expect(Number(lista[0].quantidade)).toBe(5000);
  });

  it('deve registrar movimentação vinculada a insumo e retornar dados com JOIN', async () => {
    const mov = await estoqueMovimentacaoRepository.registrarMovimentacao({
      usuario_id: usuarioId,
      insumo_id: insumoId,
      tipo: 'SAIDA_PRODUCAO',
      quantidade: 500,
      motivo: 'Uso na produção de bolo'
    });

    expect(mov.id).toBeDefined();
    expect(mov.insumo_id).toBe(insumoId);

    const lista = await estoqueMovimentacaoRepository.listarMovimentacoes(usuarioId, { insumo_id: insumoId });
    expect(lista.length).toBeGreaterThanOrEqual(1);
    const item = lista.find(m => m.id === mov.id);
    expect(item).toBeDefined();
    expect(item.nome_insumo).toBe('Farinha de Trigo Especial');
    expect(item.unidade_base).toBe('g');
    expect(item.tipo).toBe('SAIDA_PRODUCAO');
  });

  it('deve registrar movimentação vinculada a serviço e retornar dados com JOIN', async () => {
    const mov = await estoqueMovimentacaoRepository.registrarMovimentacao({
      usuario_id: usuarioId,
      servico_id: servicoId,
      tipo: 'ENTRADA_PRODUCAO',
      quantidade: 10,
      motivo: 'Produção concluída de 10 bolos'
    });

    expect(mov.id).toBeDefined();
    expect(mov.servico_id).toBe(servicoId);

    const lista = await estoqueMovimentacaoRepository.listarMovimentacoes(usuarioId, { servico_id: servicoId });
    expect(lista.length).toBeGreaterThanOrEqual(1);
    const item = lista.find(m => m.id === mov.id);
    expect(item).toBeDefined();
    expect(item.nome_servico).toBe('Bolo de Cenoura');
    expect(item.tipo).toBe('ENTRADA_PRODUCAO');
  });

  it('deve filtrar movimentações por tipo', async () => {
    await estoqueMovimentacaoRepository.registrarMovimentacao({
      usuario_id: usuarioId,
      tipo: 'AJUSTE_PERDA',
      quantidade: 50,
      motivo: 'Validade expirada'
    });

    const perdas = await estoqueMovimentacaoRepository.listarMovimentacoes(usuarioId, { tipo: 'AJUSTE_PERDA' });
    expect(perdas.length).toBeGreaterThanOrEqual(1);
    perdas.forEach(m => {
      expect(m.tipo).toBe('AJUSTE_PERDA');
    });
  });

  it('deve respeitar limite de paginação', async () => {
    const lista = await estoqueMovimentacaoRepository.listarMovimentacoes(usuarioId, { limite: 2 });
    expect(lista.length).toBeLessThanOrEqual(2);
  });

  it('deve garantir isolamento multi-tenant de movimentações', async () => {
    // Outro usuário registra movimentação
    await estoqueMovimentacaoRepository.registrarMovimentacao({
      usuario_id: outroUsuarioId,
      tipo: 'ENTRADA_COMPRA',
      quantidade: 100,
      motivo: 'Movimentação de outro usuário'
    });

    const listaUsuario = await estoqueMovimentacaoRepository.listarMovimentacoes(usuarioId);
    const listaOutro = await estoqueMovimentacaoRepository.listarMovimentacoes(outroUsuarioId);

    expect(listaUsuario.every(m => m.usuario_id === usuarioId)).toBe(true);
    expect(listaOutro.every(m => m.usuario_id === outroUsuarioId)).toBe(true);
    expect(listaOutro.some(m => m.usuario_id === usuarioId)).toBe(false);
  });

  it('deve suportar execução transacional com rollback', async () => {
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      const mov = await estoqueMovimentacaoRepository.registrarMovimentacao({
        usuario_id: usuarioId,
        tipo: 'AJUSTE_INVENTARIO',
        quantidade: 1234,
        motivo: 'Ajuste transitório que sofrerá rollback'
      }, conn);

      expect(mov.id).toBeDefined();

      await conn.rollback();
    } finally {
      conn.release();
    }

    const lista = await estoqueMovimentacaoRepository.listarMovimentacoes(usuarioId, { tipo: 'AJUSTE_INVENTARIO' });
    const achou = lista.find(m => Number(m.quantidade) === 1234);
    expect(achou).toBeUndefined();
  });
});
