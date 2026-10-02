const app = require('./app');
const path = require('path');

// Carrega variáveis de ambiente
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor MEI rodando na porta ${PORT}`);
});
