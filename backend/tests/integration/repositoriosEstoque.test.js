const pool = require('../../src/config/database');
const insumoRepository = require('../../src/repositories/insumoRepository');
const fichaTecnicaRepository = require('../../src/repositories/fichaTecnicaRepository');

describe('Repositórios de Estoque e Ficha Técnica', () => {
  let usuarioId;
  let outroUsuarioId;
  let servicoId;
  let outroServicoId;

  beforeAll(async () => {
    // Insere usuário e serviço para teste
    const [uRes] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['Estoque Teste', `teste_repo_${Date.now()}@teste.com`, 'hash']
    );
    usuarioId = uRes.insertId;

    const [uRes2] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['Outro Usuario Teste', `outro_teste_repo_${Date.now()}@teste.com`, 'hash']
    );
    outroUsuarioId = uRes2.insertId;

    const [sRes] = await pool.query(
      'INSERT INTO servicos (usuario_id, nome, preco) VALUES (?, ?, ?)',
      [usuarioId, 'Cento de Coxinha', 90.00]
    );
    servicoId = sRes.insertId;

    const [sRes2] = await pool.query(
      'INSERT INTO servicos (usuario_id, nome, preco) VALUES (?, ?, ?)',
      [usuarioId, 'Empada de Palmito', 70.00]
    );
    outroServicoId = sRes2.insertId;
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

  it('deve criar e listar insumos com controle de saldo e unidade', async () => {
    const insumo = await insumoRepository.criar({
      usuario_id: usuarioId,
      nome: 'Farinha de Trigo',
      unidade_base: 'g',
      quantidade_atual: 5000,
      estoque_minimo: 1000,
      custo_unitario: 0.0050
    });

    expect(insumo.id).toBeDefined();
    expect(insumo.nome).toBe('Farinha de Trigo');
    expect(insumo.unidade_base).toBe('g');

    const lista = await insumoRepository.listar(usuarioId);
    expect(lista.length).toBeGreaterThanOrEqual(1);

    const buscado = await insumoRepository.buscarPorId(insumo.id, usuarioId);
    expect(Number(buscado.quantidade_atual)).toBe(5000);
  });

  it('deve buscar insumo por id e por nome com case insensitive', async () => {
    const insumo = await insumoRepository.criar({
      usuario_id: usuarioId,
      nome: 'Leite Condensado',
      unidade_base: 'ml',
      quantidade_atual: 1000,
      estoque_minimo: 200,
      custo_unitario: 0.0120
    });

    const buscadoId = await insumoRepository.buscarPorId(insumo.id, usuarioId);
    expect(buscadoId).not.toBeNull();
    expect(buscadoId.id).toBe(insumo.id);

    const buscadoNome = await insumoRepository.buscarPorNome('leite condensado', usuarioId);
    expect(buscadoNome).not.toBeNull();
    expect(buscadoNome.id).toBe(insumo.id);

    const inexistente = await insumoRepository.buscarPorNome('Inexistente XYZ', usuarioId);
    expect(inexistente).toBeNull();
  });

  it('deve filtrar insumos por busca de termo e por saldo abaixo do minimo', async () => {
    await insumoRepository.criar({
      usuario_id: usuarioId,
      nome: 'Chocolate em Pó',
      unidade_base: 'g',
      quantidade_atual: 150,
      estoque_minimo: 500,
      custo_unitario: 0.0300
    });

    await insumoRepository.criar({
      usuario_id: usuarioId,
      nome: 'Açúcar Cristal',
      unidade_base: 'g',
      quantidade_atual: 5000,
      estoque_minimo: 1000,
      custo_unitario: 0.0040
    });

    const buscaChocolate = await insumoRepository.listar(usuarioId, { busca: 'Chocolate' });
    expect(buscaChocolate.some(i => i.nome === 'Chocolate em Pó')).toBe(true);
    expect(buscaChocolate.some(i => i.nome === 'Açúcar Cristal')).toBe(false);

    const abaixoMinimo = await insumoRepository.listar(usuarioId, { apenasAbaixoMinimo: true });
    expect(abaixoMinimo.some(i => i.nome === 'Chocolate em Pó')).toBe(true);
    expect(abaixoMinimo.some(i => i.nome === 'Açúcar Cristal')).toBe(false);
  });

  it('deve atualizar dados cadastrais do insumo', async () => {
    const insumo = await insumoRepository.criar({
      usuario_id: usuarioId,
      nome: 'Manteiga',
      unidade_base: 'g',
      quantidade_atual: 800,
      estoque_minimo: 200,
      custo_unitario: 0.0250
    });

    const atualizado = await insumoRepository.atualizar(insumo.id, usuarioId, {
      nome: 'Manteiga Sem Sal',
      estoque_minimo: 300
    });

    expect(atualizado.nome).toBe('Manteiga Sem Sal');
    expect(Number(atualizado.estoque_minimo)).toBe(300);
  });

  it('deve atualizar saldo e custo unitario ponderado', async () => {
    const insumo = await insumoRepository.criar({
      usuario_id: usuarioId,
      nome: 'Cebola',
      unidade_base: 'g',
      quantidade_atual: 1000,
      estoque_minimo: 300,
      custo_unitario: 0.0050
    });

    const atualizado = await insumoRepository.atualizarSaldoECusto(insumo.id, usuarioId, 1500, 0.0060);
    expect(Number(atualizado.quantidade_atual)).toBe(1500);
    expect(Number(atualizado.custo_unitario)).toBeCloseTo(0.0060, 4);
  });

  it('deve debitar e creditar saldo de insumo com consistencia', async () => {
    const insumo = await insumoRepository.criar({
      usuario_id: usuarioId,
      nome: 'Alho',
      unidade_base: 'g',
      quantidade_atual: 500,
      estoque_minimo: 100,
      custo_unitario: 0.0100
    });

    const debitado = await insumoRepository.debitarSaldo(insumo.id, usuarioId, 150);
    expect(Number(debitado.quantidade_atual)).toBe(350);

    const creditado = await insumoRepository.creditarSaldo(insumo.id, usuarioId, 200);
    expect(Number(creditado.quantidade_atual)).toBe(550);
  });

  it('deve realizar soft delete do insumo e nao listar como ativo', async () => {
    const insumo = await insumoRepository.criar({
      usuario_id: usuarioId,
      nome: 'Fermento Biologico',
      unidade_base: 'g',
      quantidade_atual: 200,
      estoque_minimo: 50,
      custo_unitario: 0.0200
    });

    const removido = await insumoRepository.remover(insumo.id, usuarioId);
    expect(removido).toBe(true);

    const buscado = await insumoRepository.buscarPorId(insumo.id, usuarioId);
    expect(buscado).toBeNull();

    const lista = await insumoRepository.listar(usuarioId);
    expect(lista.some(i => i.id === insumo.id)).toBe(false);
  });

  it('deve vincular e recuperar ficha técnica de um serviço', async () => {
    const insumo = await insumoRepository.criar({
      usuario_id: usuarioId,
      nome: 'Frango Desfiado',
      unidade_base: 'g',
      quantidade_atual: 3000,
      estoque_minimo: 500,
      custo_unitario: 0.0150
    });

    await fichaTecnicaRepository.substituirFicha(usuarioId, servicoId, [
      { insumo_id: insumo.id, quantidade_necessaria: 800 }
    ]);

    const ficha = await fichaTecnicaRepository.obterFichaPorServico(usuarioId, servicoId);
    expect(ficha.length).toBe(1);
    expect(ficha[0].nome_insumo).toBe('Frango Desfiado');
    expect(Number(ficha[0].quantidade_necessaria)).toBe(800);
  });

  it('deve recuperar insumos de múltiplos serviços em lote via obterInsumosPorServicos', async () => {
    const insumo1 = await insumoRepository.criar({
      usuario_id: usuarioId,
      nome: 'Palmito Picado',
      unidade_base: 'g',
      quantidade_atual: 2000,
      estoque_minimo: 400,
      custo_unitario: 0.0220
    });

    await fichaTecnicaRepository.substituirFicha(usuarioId, outroServicoId, [
      { insumo_id: insumo1.id, quantidade_necessaria: 600 }
    ]);

    const insumosLote = await fichaTecnicaRepository.obterInsumosPorServicos(
      usuarioId,
      [servicoId, outroServicoId]
    );

    expect(insumosLote.length).toBeGreaterThanOrEqual(2);
    const servicoIdsEncontrados = insumosLote.map(r => r.servico_id);
    expect(servicoIdsEncontrados).toContain(servicoId);
    expect(servicoIdsEncontrados).toContain(outroServicoId);

    const vazio = await fichaTecnicaRepository.obterInsumosPorServicos(usuarioId, []);
    expect(vazio).toEqual([]);
  });

  it('deve permitir substituir ficha tecnica com array vazio removendo os ingredientes', async () => {
    const limpo = await fichaTecnicaRepository.substituirFicha(usuarioId, outroServicoId, []);
    expect(limpo).toEqual([]);

    const ficha = await fichaTecnicaRepository.obterFichaPorServico(usuarioId, outroServicoId);
    expect(ficha).toEqual([]);
  });

  it('deve garantir isolamento multi-tenant de insumos e fichas tecnicas', async () => {
    const insumoUser1 = await insumoRepository.criar({
      usuario_id: usuarioId,
      nome: 'Queijo Ralado',
      unidade_base: 'g',
      quantidade_atual: 1000,
      estoque_minimo: 200,
      custo_unitario: 0.0400
    });

    // Outro usuário não pode buscar por id
    const buscadoOutroUser = await insumoRepository.buscarPorId(insumoUser1.id, outroUsuarioId);
    expect(buscadoOutroUser).toBeNull();

    // Outro usuário não pode listar
    const listaOutroUser = await insumoRepository.listar(outroUsuarioId);
    expect(listaOutroUser.some(i => i.id === insumoUser1.id)).toBe(false);

    // Outro usuário não pode atualizar ou debitar
    await insumoRepository.debitarSaldo(insumoUser1.id, outroUsuarioId, 100);
    const recarregado = await insumoRepository.buscarPorId(insumoUser1.id, usuarioId);
    expect(Number(recarregado.quantidade_atual)).toBe(1000); // Permaneceu inalterado

    // Outro usuário não vê ficha técnica de servico de usuarioId
    const fichaOutroUser = await fichaTecnicaRepository.obterFichaPorServico(outroUsuarioId, servicoId);
    expect(fichaOutroUser).toEqual([]);
  });
});
