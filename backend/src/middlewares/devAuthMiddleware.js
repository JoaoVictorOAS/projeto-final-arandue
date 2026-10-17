const crypto = require('crypto');

/**
 * Obtém a chave de segredo de desenvolvedor configurada no ambiente.
 * Utiliza WHATSAPP_DEV_SECRET com fallbacks seguros.
 */
function obterDevSecret() {
  return (
    process.env.WHATSAPP_DEV_SECRET ||
    process.env.WHATSAPP_ADMIN_TOKEN ||
    process.env.INTERNAL_SERVICE_SECRET ||
    'chave_mestra_secreta_whatsapp_dev_2026'
  );
}

/**
 * Middleware para proteger e ocultar rotas de infraestrutura e administração do WhatsApp.
 * 
 * Se o token de desenvolvedor for inválido ou ausente, a rota responde imediatamente com 404 Not Found,
 * mantendo o endpoint totalmente oculto para scanners, robôs e usuários comuns da aplicação.
 * 
 * Suporta o token via:
 * - Cabeçalho HTTP: 'X-Dev-Token' ou 'X-Admin-Token' ou 'X-Internal-Secret'
 * - Query String: '?dev_token=...' ou '?token=...' (ideal para abrir a tela de QR code no navegador)
 * - Cabeçalho Authorization: 'Bearer <token_secreto>'
 */
function devAuthMiddleware(req, res, next) {
  const secretEsperado = String(obterDevSecret()).trim();

  // 1. Extração do token fornecido
  let tokenRecebido =
    req.headers['x-dev-token'] ||
    req.headers['x-admin-token'] ||
    req.headers['x-internal-secret'] ||
    req.query?.dev_token ||
    req.query?.token ||
    null;

  if (!tokenRecebido && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    tokenRecebido = req.headers.authorization.split(' ')[1];
  }

  // 2. Se nenhum token foi enviado ou não for string, oculta a rota com 404
  if (!tokenRecebido || typeof tokenRecebido !== 'string') {
    return res.status(404).json({
      sucesso: false,
      mensagem: 'Rota não encontrada'
    });
  }

  const tokenLimpo = tokenRecebido.trim();

  // 3. Validação em tempo constante para proteção estrita contra Timing Attacks
  const bufEsperado = Buffer.from(secretEsperado);
  const bufRecebido = Buffer.from(tokenLimpo);

  if (bufEsperado.length !== bufRecebido.length || !crypto.timingSafeEqual(bufEsperado, bufRecebido)) {
    return res.status(404).json({
      sucesso: false,
      mensagem: 'Rota não encontrada'
    });
  }

  req.isDevAdmin = true;
  return next();
}

module.exports = devAuthMiddleware;
