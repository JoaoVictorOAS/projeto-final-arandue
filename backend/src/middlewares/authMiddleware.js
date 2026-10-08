const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_chave_jwt_recode_2026';

/**
 * Middleware para validar o token JWT no cabeçalho Authorization.
 * Suporta tokens normais de sessão e scoped tokens (ex: assistente:read).
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Token de autenticação não fornecido ou inválido'
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Token de autenticação não fornecido ou inválido'
    });
  }

  try {
    const decodificado = jwt.verify(token, JWT_SECRET);

    // Validação de Scoped Tokens (Restrição de Mínimo Privilégio)
    if (decodificado.scope === 'assistente:read') {
      const baseUrl = req.baseUrl || '';
      const path = req.path || '';
      const isAssistenteRoute = baseUrl.startsWith('/api/assistente') || path.startsWith('/api/assistente') || baseUrl === '/api/assistente';

      // Scoped tokens de leitura só têm permissão para leitura (GET) e não podem acessar rotas do próprio assistente
      if (req.method !== 'GET' || isAssistenteRoute) {
        return res.status(403).json({
          sucesso: false,
          mensagem: 'Acesso negado: token de leitura restrito do assistente'
        });
      }
    } else if (decodificado.scope === 'assistente:operator' || decodificado.scope === 'assistente:access') {
      const baseUrl = req.baseUrl || '';
      const path = req.path || '';
      const isAssistenteRoute = baseUrl.startsWith('/api/assistente') || path.startsWith('/api/assistente') || baseUrl === '/api/assistente';
      const isAuthMutation = (baseUrl.startsWith('/api/auth') || path.startsWith('/api/auth')) && req.method !== 'GET';

      // Scoped tokens de operador do assistente podem ler e cadastrar (GET e POST), mas não podem excluir (DELETE) nem mutar auth ou chat
      if (req.method === 'DELETE' || isAssistenteRoute || isAuthMutation) {
        return res.status(403).json({
          sucesso: false,
          mensagem: 'Acesso negado: operação não permitida para o operador do assistente'
        });
      }
    }

    req.usuario = {
      id: decodificado.id,
      nome: decodificado.nome || null,
      email: decodificado.email || null,
      scope: decodificado.scope || null
    };

    return next();
  } catch (err) {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Token de autenticação não fornecido ou inválido'
    });
  }
}

/**
 * Utilitário para emissão de Scoped Tokens JWT para o Assistente e MCP.
 * @param {number} usuarioId
 * @param {string} [scope='assistente:operator']
 * @param {string} [expiresIn='15m']
 * @returns {string}
 */
authMiddleware.generateScopedToken = function(usuarioId, scope = 'assistente:operator', expiresIn = '15m') {
  return jwt.sign({ id: usuarioId, scope }, JWT_SECRET, { expiresIn });
};

module.exports = authMiddleware;
