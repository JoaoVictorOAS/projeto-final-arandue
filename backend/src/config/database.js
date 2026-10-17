const mysql = require('mysql2/promise');
const path = require('path');

// Carrega .env do backend independentemente do diretório de execução
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
require('dotenv').config({ quiet: true });

function getDatabaseConfig() {
  const connectionUri = process.env.DATABASE_URL || process.env.MYSQL_URL;

  let config = {};

  if (connectionUri) {
    try {
      const parsed = new URL(connectionUri);
      config = {
        host: parsed.hostname,
        port: Number(parsed.port) || 3306,
        user: parsed.username,
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.replace(/^\//, '') || process.env.DB_NAME || 'mei_db',
      };
    } catch {
      // Fallback para variáveis separadas
    }
  }

  if (!config.host) {
    config = {
      host: process.env.DB_HOST || process.env.TIDB_HOST || process.env.MYSQLHOST || 'localhost',
      user: process.env.DB_USER || process.env.TIDB_USER || process.env.MYSQLUSER || 'root',
      password: process.env.DB_PASSWORD || process.env.TIDB_PASSWORD || process.env.MYSQLPASSWORD || '',
      database: process.env.DB_NAME || process.env.TIDB_DATABASE || process.env.MYSQLDATABASE || 'mei_db',
      port: Number(process.env.DB_PORT || process.env.TIDB_PORT || process.env.MYSQLPORT) || 3306,
    };
  }

  // Habilita SSL automaticamente se for remoto ou explicitamente solicitado
  const isLocal = ['localhost', '127.0.0.1'].includes(config.host);
  const enableSsl = process.env.DB_SSL === 'true' || 
                    process.env.TIDB_ENABLE_SSL === 'true' || 
                    (!isLocal && process.env.DB_SSL !== 'false');

  if (enableSsl) {
    config.ssl = {
      rejectUnauthorized: false
    };
  }

  config.waitForConnections = true;
  config.connectionLimit = Number(process.env.DB_CONNECTION_LIMIT) || 10;
  config.queueLimit = 0;
  config.decimalNumbers = true;
  config.multipleStatements = true;

  return config;
}

const pool = mysql.createPool(getDatabaseConfig());

module.exports = pool;
module.exports.getDatabaseConfig = getDatabaseConfig;
