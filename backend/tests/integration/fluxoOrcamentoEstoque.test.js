const pool = require('../../src/config/database');
const orcamentoService = require('../../src/services/orcamentoService');
const insumoRepository = require('../../src/repositories/insumoRepository');
const fichaTecnicaRepository = require('../../src/repositories/fichaTecnicaRepository');

describe('Integração Orçamento ↔ Estoque', () => {
  let usuarioId;
  let clienteId;
  let servicoId;
  let insumoId;

  beforeAll(async () => {
    const [uRes] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['Orc Estoque Teste', `teste_orc_est_${Date.now()}@teste.com`, 'hash']
    );
    usuarioId = uRes.insertId;

    const [cRes] = await pool.query(
      'INSERT INTO clientes (usuario_id, nome) VALUES (?, ?)',
      [usuarioId, 'Cliente Festa']
    );
    clienteId = cRes.insertId;

    const [sRes] = await pool.query(
      'INSERT INTO servicos (usuario_id, nome, preco) VALUES (?, ?, ?)',
      [usuarioId, 'Cento de Salgados Sortidos', 100.00]
    );
    servicoId = sRes.insertId;

    const insumo = await insumoRepository.criar({
      usuario_id: usuarioId,
      nome: 'Farinha Trigo Salgados',
      unidade_base: 'g',
      quantidade_atual: 5000,
      estoque_minimo: 1000,
      custo_unitario: 0.005
    });
    insumoId = insumo.id;

    await fichaTecnicaRepository.substituirFicha(usuarioId, servicoId, [
      { insumo_id: insumoId, quantidade_necessaria: 1000 }
    ]);
  });

  afterAll(async () => {
    if (usuarioId) {
      await pool.query('DELETE FROM estoque_movimentacoes WHERE usuario_id = ?', [usuarioId]);
      await pool.query('DELETE FROM orcamento_itens WHERE orcamento_id IN (SELECT id FROM orcamentos WHERE usuario_id = ?)', [usuarioId]);
      await pool.query('DELETE FROM orcamentos WHERE usuario_id = ?', [usuarioId]);
      await pool.query('DELETE FROM fichas_tecnicas WHERE usuario_id = ?', [usuarioId]);
      await pool.query('DELETE FROM insumos WHERE usuario_id = ?', [usuarioId]);
      await pool.query('DELETE FROM servicos WHERE usuario_id = ?', [usuarioId]);
      await pool.query('DELETE FROM clientes WHERE usuario_id = ?', [usuarioId]);
      await pool.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
    }
    await pool.end();
  });

  it('deve abater automaticamente os insumos quando o orçamento transiciona para APROVADO', async () => {
    const orc = await orcamentoService.criar({
      usuario_id: usuarioId,
      cliente_id: clienteId,
      data_emissao: '2026-10-08',
      status: 'RASCUNHO',
      itens: [{ servico_id: servicoId, quantidade: 2, preco_unitario: 100.00 }]
    });

    // Aprova o orçamento
    await orcamentoService.atualizarStatus(orc.id, usuarioId, 'APROVADO');

    // Saldo inicial era 5000g, 2 centos consom 2000g -> novo saldo deve ser 3000g
    const insumoAtualizado = await insumoRepository.buscarPorId(insumoId, usuarioId);
    expect(Number(insumoAtualizado.quantidade_atual)).toBe(3000);
  });

  it('deve estornar os insumos quando o orçamento aprovado transiciona para CANCELADO', async () => {
    const orc = await orcamentoService.criar({
      usuario_id: usuarioId,
      cliente_id: clienteId,
      data_emissao: '2026-10-08',
      status: 'RASCUNHO',
      itens: [{ servico_id: servicoId, quantidade: 1, preco_unitario: 100.00 }]
    });

    // Aprova o orçamento -> 3000g - 1000g = 2000g
    await orcamentoService.atualizarStatus(orc.id, usuarioId, 'APROVADO');
    let insumo = await insumoRepository.buscarPorId(insumoId, usuarioId);
    expect(Number(insumo.quantidade_atual)).toBe(2000);

    // Cancela o orçamento aprovado -> 2000g + 1000g = 3000g
    await orcamentoService.atualizarStatus(orc.id, usuarioId, 'CANCELADO');
    insumo = await insumoRepository.buscarPorId(insumoId, usuarioId);
    expect(Number(insumo.quantidade_atual)).toBe(3000);
  });
});
