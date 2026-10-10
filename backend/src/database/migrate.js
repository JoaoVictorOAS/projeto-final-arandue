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

    // Executa arquivos de migrações incrementais para garantir bancos existentes atualizados
    const migrationsDir = path.resolve(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        const migrationSql = fs.readFileSync(filePath, 'utf8');
        try {
          await connection.query(`USE ${process.env.DB_NAME || 'mei_db'}; ${migrationSql}`);
          console.log(`  ✓ Migração aplicada: ${file}`);
        } catch (mErr) {
          if (
            ['ER_DUP_FIELDNAME', 'ER_TABLE_EXISTS_ERROR', 'ER_DUP_KEYNAME'].includes(mErr.code) ||
            mErr.message.includes('Duplicate column') ||
            mErr.message.includes('already exists')
          ) {
            console.log(`  - Migração já aplicada/compatível: ${file}`);
          } else {
            console.warn(`  ! Aviso na migração ${file}: ${mErr.message}`);
          }
        }
      }
    }

    console.log('Migração concluída com sucesso! Banco mei_db e tabelas sincronizados.');
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
