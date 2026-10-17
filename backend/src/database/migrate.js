const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Carrega variáveis de ambiente
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
require('dotenv').config({ quiet: true });

const { getDatabaseConfig } = require('../config/database');

async function runMigration() {
  console.log('Iniciando migração do banco de dados...');
  const dbConfig = getDatabaseConfig();

  const isLocal = ['localhost', '127.0.0.1'].includes(dbConfig.host);
  const targetDb = dbConfig.database || 'mei_db';

  const connConfig = {
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    port: dbConfig.port,
    multipleStatements: true
  };

  if (dbConfig.ssl) {
    connConfig.ssl = dbConfig.ssl;
  }

  if (!isLocal) {
    connConfig.database = targetDb;
  }

  const connection = await mysql.createConnection(connConfig);

  try {
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    let sql = fs.readFileSync(schemaPath, 'utf8');

    if (isLocal) {
      console.log('Executando DDL schema.sql...');
      await connection.query(sql);
    } else {
      console.log(`Executando DDL no banco remoto [${targetDb}]...`);
      // Em bancos em nuvem (Aiven, TiDB, Railway), removemos a cláusula CREATE DATABASE / USE mei_db
      sql = sql.replace(/CREATE DATABASE[\s\S]*?USE\s+\w+;/i, '');
      await connection.query(`USE \`${targetDb}\`;\n` + sql);
    }

    // Executa arquivos de migrações incrementais
    const migrationsDir = path.resolve(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        const migrationSql = fs.readFileSync(filePath, 'utf8');
        try {
          await connection.query(`USE \`${targetDb}\`;\n` + migrationSql);
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

    console.log(`Migração concluída com sucesso! Banco [${targetDb}] e tabelas sincronizados.`);
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
