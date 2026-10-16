const app = require('./app');
const path = require('path');

// Carrega variáveis de ambiente
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
require('dotenv').config({ quiet: true });

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor MEI rodando na porta ${PORT}`);

  // Inicializa o Gateway do WhatsApp apenas em execução real (não em testes)
  if (process.env.NODE_ENV !== 'test' && process.env.WHATSAPP_DISABLED !== 'true') {
    const whatsappService = require('./services/whatsappService');
    whatsappService.inicializar().catch((err) => {
      console.error('[WhatsApp] Falha ao iniciar gateway do WhatsApp:', err.message);
    });
  }
});

