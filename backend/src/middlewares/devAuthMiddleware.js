const crypto = require('crypto');

/**
 * Obtém as chaves de desenvolvedor configuradas estritamente via variáveis de ambiente.
 * NUNCA utiliza valores padrão em hardcode como fallback.
 */
function obterDevSecrets() {
  const secrets = new Set();
  if (process.env.WHATSAPP_DEV_SECRET && process.env.WHATSAPP_DEV_SECRET.trim()) {
    secrets.add(process.env.WHATSAPP_DEV_SECRET.trim());
  }
  if (process.env.WHATSAPP_ADMIN_TOKEN && process.env.WHATSAPP_ADMIN_TOKEN.trim()) {
    secrets.add(process.env.WHATSAPP_ADMIN_TOKEN.trim());
  }
  if (process.env.INTERNAL_SERVICE_SECRET && process.env.INTERNAL_SERVICE_SECRET.trim()) {
    secrets.add(process.env.INTERNAL_SERVICE_SECRET.trim());
  }
  return Array.from(secrets);
}

/**
 * Middleware para proteger e ocultar rotas de infraestrutura e administração do WhatsApp.
 * 
 * Se o token de desenvolvedor for inválido, ausente ou se nenhuma chave tiver sido
 * configurada nas variáveis de ambiente, a rota responde imediatamente com 404 Not Found,
 * mantendo o endpoint totalmente oculto para scanners, robôs e usuários comuns da aplicação.
 * 
 * Suporta o token via:
 * - Cabeçalho HTTP: 'X-Dev-Token' ou 'X-Admin-Token' ou 'X-Internal-Secret'
 * - Query String: '?dev_token=...' ou '?token=...' (ideal para abrir a tela de QR code no navegador)
 * - Cabeçalho Authorization: 'Bearer <token_secreto>'
 */
function devAuthMiddleware(req, res, next) {
  const secretsValidos = obterDevSecrets();

  // Se nenhuma chave estiver configurada no ambiente (process.env), bloqueia/oculta imediatamente
  if (secretsValidos.length === 0) {
    return res.status(404).json({
      sucesso: false,
      mensagem: 'Rota não encontrada'
    });
  }

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
  const bufRecebido = Buffer.from(tokenLimpo);

  // 3. Validação segura contra Timing Attacks contra cada segredo válido vindo do ambiente
  let autenticado = false;
  for (const segredo of secretsValidos) {
    const bufEsperado = Buffer.from(segredo);
    if (bufEsperado.length === bufRecebido.length && crypto.timingSafeEqual(bufEsperado, bufRecebido)) {
      autenticado = true;
      break;
    }
  }

  if (!autenticado) {
    return res.status(404).json({
      sucesso: false,
      mensagem: 'Rota não encontrada'
    });
  }

  req.isDevAdmin = true;
  return next();
}

module.exports = devAuthMiddleware;
