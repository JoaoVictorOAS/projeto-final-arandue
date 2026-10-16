// backend/tests/unit/migrations_dashboards.test.js
const pool = require('../../src/config/database');
const fs = require('fs');
const path = require('path');

describe('Migração 010 - Dashboards Customizados', () => {
  beforeAll(async () => {
    const sqlPath = path.resolve(__dirname, '../../src/database/migrations/010_dashboards_customizados.sql');
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await pool.query(sql);
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  test('deve possuir as tabelas dashboards_usuario e dashboard_widgets no banco', async () => {
    const [dashboards] = await pool.query("SHOW TABLES LIKE 'dashboards_usuario'");
    const [widgets] = await pool.query("SHOW TABLES LIKE 'dashboard_widgets'");
    expect(dashboards.length).toBe(1);
    expect(widgets.length).toBe(1);
  });

  test('deve possuir as colunas corretas na tabela dashboards_usuario', async () => {
    const [columns] = await pool.query('SHOW COLUMNS FROM dashboards_usuario');
    const fieldNames = columns.map(c => c.Field);
    expect(fieldNames).toContain('id');
    expect(fieldNames).toContain('usuario_id');
    expect(fieldNames).toContain('nome');
    expect(fieldNames).toContain('descricao');
    expect(fieldNames).toContain('eh_padrao');
    expect(fieldNames).toContain('ordem');
    expect(fieldNames).toContain('criado_em');
    expect(fieldNames).toContain('atualizado_em');
  });

  test('deve possuir as colunas corretas na tabela dashboard_widgets', async () => {
    const [columns] = await pool.query('SHOW COLUMNS FROM dashboard_widgets');
    const fieldNames = columns.map(c => c.Field);
    expect(fieldNames).toContain('id');
    expect(fieldNames).toContain('dashboard_id');
    expect(fieldNames).toContain('usuario_id');
    expect(fieldNames).toContain('titulo');
    expect(fieldNames).toContain('tipo_grafico');
    expect(fieldNames).toContain('metrica');
    expect(fieldNames).toContain('periodo');
    expect(fieldNames).toContain('largura');
    expect(fieldNames).toContain('ordem');
    expect(fieldNames).toContain('configuracoes');
    expect(fieldNames).toContain('criado_em');
  });
});
