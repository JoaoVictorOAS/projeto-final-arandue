const pool = require('../../src/config/database');
const fs = require('fs');
const path = require('path');

describe('Migração 005: Módulo Fiscal', () => {
  beforeAll(async () => {
    const migrationPath = path.join(__dirname, '../../src/database/migrations/005_modulo_fiscal.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await pool.query(stmt);
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it('deve ter criado a tabela notas_fiscais com as colunas essenciais', async () => {
    const [columns] = await pool.query('SHOW COLUMNS FROM notas_fiscais');
    const columnNames = columns.map(c => c.Field);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('usuario_id');
    expect(columnNames).toContain('tipo');
    expect(columnNames).toContain('status');
    expect(columnNames).toContain('numero');
    expect(columnNames).toContain('serie');
    expect(columnNames).toContain('chave_acesso');
    expect(columnNames).toContain('protocolo_autorizacao');
    expect(columnNames).toContain('destinatario_documento');
    expect(columnNames).toContain('valor_total');
    expect(columnNames).toContain('valor_liquido');
    expect(columnNames).toContain('xml_gerado');
    expect(columnNames).toContain('link_danfe');
  });

  it('deve ter criado a tabela nota_fiscal_itens com as colunas essenciais', async () => {
    const [columns] = await pool.query('SHOW COLUMNS FROM nota_fiscal_itens');
    const columnNames = columns.map(c => c.Field);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('nota_fiscal_id');
    expect(columnNames).toContain('numero_item');
    expect(columnNames).toContain('descricao');
    expect(columnNames).toContain('quantidade');
    expect(columnNames).toContain('valor_unitario');
    expect(columnNames).toContain('valor_total');
    expect(columnNames).toContain('csosn');
  });
});
