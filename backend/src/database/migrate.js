const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Carrega variáveis de ambiente
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

async function runMigration() {
  console.log('Iniciando migração do banco de dados...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT) || 3306,
    multipleStatements: true
  });

  try {
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executando DDL schema.sql...');
    await connection.query(sql);
    console.log('Migração concluída com sucesso! Banco mei_db e tabelas criadas.');
  } catch (error) {
    console.error('Erro ao executar migração:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigration;
