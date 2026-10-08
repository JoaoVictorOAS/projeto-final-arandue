const pool = require('../../src/config/database');
const fs = require('fs');
const path = require('path');

describe('Migração 004 - Módulo de Estoque', () => {
  beforeAll(async () => {
    const migrationPath = path.resolve(__dirname, '../../src/database/migrations/004_estoque.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(sql);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('deve conter as tabelas insumos, fichas_tecnicas e estoque_movimentacoes', async () => {
    const [tables] = await pool.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME IN ('insumos', 'fichas_tecnicas', 'estoque_movimentacoes');
    `);
    const nomes = tables.map(t => t.TABLE_NAME);
    expect(nomes).toContain('insumos');
    expect(nomes).toContain('fichas_tecnicas');
    expect(nomes).toContain('estoque_movimentacoes');
  });

  it('deve conter as colunas de estoque pronto na tabela servicos', async () => {
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'servicos' 
        AND COLUMN_NAME IN ('controla_estoque_pronto', 'estoque_pronto_atual', 'estoque_pronto_minimo');
    `);
    const nomes = cols.map(c => c.COLUMN_NAME);
    expect(nomes).toContain('controla_estoque_pronto');
    expect(nomes).toContain('estoque_pronto_atual');
    expect(nomes).toContain('estoque_pronto_minimo');
  });
});
