const pool = require('../src/config/database');

describe('Conexao com Banco de Dados MySQL', () => {
  afterAll(async () => {
    await pool.end();
  });

  test('deve executar uma consulta de teste SELECT 1 com sucesso', async () => {
    const [rows] = await pool.execute('SELECT 1 + 1 AS resultado');
    expect(rows[0].resultado).toBe(2);
  });
});
