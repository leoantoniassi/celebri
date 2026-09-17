// ============================================================
// Middleware: Autenticação JWT
// ============================================================
const jwt = require('jsonwebtoken');
const comEscopoDeTenant = require('./tenant');

function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticação não fornecido.',
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Formato de token inválido. Use: Bearer <token>',
      });
    }

    const token = parts[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Injeta dados do usuário no request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      empresaId: decoded.empresaId || null,
      funcionarioId: decoded.funcionarioId || null,
    };

    // Abre o escopo de tenant para o resto da requisição
    return comEscopoDeTenant(req, res, next);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado. Faça login novamente.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token inválido.',
    });
  }
}

module.exports = auth;
