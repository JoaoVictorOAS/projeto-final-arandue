const pool = require('../src/config/database');

describe('Conexao e Estrutura do Banco de Dados MySQL', () => {
  afterAll(async () => {
    await pool.end();
  });

  test('deve executar uma consulta de teste SELECT 1 com sucesso', async () => {
    const [rows] = await pool.execute('SELECT 1 + 1 AS resultado');
    expect(rows[0].resultado).toBe(2);
  });

  test('deve conter as colunas de integridade relacional do fluxo integrado', async () => {
    const [colsAg] = await pool.execute(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agendamentos' AND COLUMN_NAME = 'orcamento_id'"
    );
    expect(colsAg.length).toBe(1);
    expect(colsAg[0].COLUMN_NAME).toBe('orcamento_id');

    const [colsCob] = await pool.execute(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cobrancas' AND COLUMN_NAME = 'agendamento_id'"
    );
    expect(colsCob.length).toBe(1);
    expect(colsCob[0].COLUMN_NAME).toBe('agendamento_id');
  });

  test('deve conter as chaves estrangeiras fk_agendamentos_orcamento e fk_cobrancas_agendamento', async () => {
    const [fks] = await pool.execute(
      "SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'FOREIGN KEY' AND CONSTRAINT_NAME IN ('fk_agendamentos_orcamento', 'fk_cobrancas_agendamento')"
    );
    const constraintNames = fks.map((f) => f.CONSTRAINT_NAME);
    expect(constraintNames).toContain('fk_agendamentos_orcamento');
    expect(constraintNames).toContain('fk_cobrancas_agendamento');
  });

  test('deve conter indices para busca eficiente de integridade relacional', async () => {
    const [indexes] = await pool.execute(
      "SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND INDEX_NAME IN ('idx_agendamentos_orcamento', 'idx_cobrancas_agendamento')"
    );
    const indexNames = indexes.map((i) => i.INDEX_NAME);
    expect(indexNames).toContain('idx_agendamentos_orcamento');
    expect(indexNames).toContain('idx_cobrancas_agendamento');
  });

  test('deve validar integridade da cadeia de seed do usuario admin demo (Orçamento -> Agendamento -> Cobrança -> Caixa)', async () => {
    const [chain] = await pool.execute(`
      SELECT 
        o.id AS orcamento_id, o.status AS orcamento_status,
        a.id AS agendamento_id, a.status AS agendamento_status,
        c.id AS cobranca_id, c.status AS cobranca_status,
        m.id AS movimentacao_id, m.tipo AS movimentacao_tipo
      FROM usuarios u
      JOIN orcamentos o ON o.usuario_id = u.id AND o.status = 'APROVADO'
      JOIN agendamentos a ON a.orcamento_id = o.id AND a.usuario_id = u.id
      JOIN cobrancas c ON c.agendamento_id = a.id AND c.orcamento_id = o.id AND c.usuario_id = u.id
      JOIN movimentacoes m ON m.cobranca_id = c.id AND m.usuario_id = u.id
      WHERE u.email = 'admin@mei.com'
    `);

    expect(chain.length).toBeGreaterThanOrEqual(1);
    const fluxoLiquidado = chain[0];
    expect(fluxoLiquidado.orcamento_status).toBe('APROVADO');
    expect(fluxoLiquidado.agendamento_status).toBe('CONCLUIDO');
    expect(fluxoLiquidado.cobranca_status).toBe('PAGO');
    expect(fluxoLiquidado.movimentacao_tipo).toBe('ENTRADA');
  });
});
