const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_chave_jwt_recode_2026';

/**
 * Middleware para validar o token JWT no cabeçalho Authorization.
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
    req.usuario = {
      id: decodificado.id,
      nome: decodificado.nome,
      email: decodificado.email
    };
    return next();
  } catch (err) {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Token de autenticação não fornecido ou inválido'
    });
  }
}

module.exports = authMiddleware;
