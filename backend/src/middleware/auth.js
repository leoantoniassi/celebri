// ============================================================
// Middleware: Autenticação JWT
// ============================================================
const comEscopoDeTenant = require('./tenant');
const { verificarToken } = require('../config/seguranca');
const { Usuario, Funcionario } = require('../models');
const { ehFuncionarioDeCampo } = require('./papelAdministrativo');

const naoAutenticado = (res, message) =>
  res.status(401).json({ success: false, message });

async function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return naoAutenticado(res, 'Token de autenticação não fornecido.');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return naoAutenticado(res, 'Formato de token inválido. Use: Bearer <token>');
  }

  let decoded;
  try {
    decoded = verificarToken(parts[1]);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return naoAutenticado(res, 'Token expirado. Faça login novamente.');
    }
    return naoAutenticado(res, 'Token inválido.');
  }

  let usuario;
  try {
    // Uma consulta leve por requisição: confirma que a conta ainda existe e
    // que a versão do token não foi revogada (troca de senha, suspensão...).
    // ignoraTenant: o escopo de tenant só abre depois deste ponto.
    usuario = await Usuario.findOne({
      where: { id: decoded.id },
      attributes: ['id', 'empresaId', 'tokenVersion', 'role', 'funcionarioId'],
      ignoraTenant: true,
    });

    if (
      !usuario ||
      (usuario.tokenVersion || 0) !== (decoded.tv || 0) ||
      (usuario.empresaId || null) !== (decoded.empresaId || null)
    ) {
      return naoAutenticado(res, 'Sessão encerrada. Faça login novamente.');
    }

    // Funcionário desligado (soft delete) perde o acesso na hora: a conta de
    // campo continuaria válida até o token expirar.
    if (ehFuncionarioDeCampo(usuario)) {
      const funcionario = await Funcionario.findOne({
        where: { id: usuario.funcionarioId },
        attributes: ['id'],
        ignoraTenant: true,
      });
      if (!funcionario) {
        return naoAutenticado(res, 'Sessão encerrada. Faça login novamente.');
      }
    }
  } catch (error) {
    return next(error);
  }

  // Injeta dados do usuário no request. Papel e vínculo com funcionário vêm do
  // BANCO (não do token): ser "de campo" decide o que a conta pode ver, e uma
  // mudança de vínculo não pode esperar o token antigo expirar.
  const daConta = (campo) => (usuario[campo] !== undefined ? usuario[campo] : decoded[campo]);
  req.user = {
    id: decoded.id,
    email: decoded.email,
    role: daConta('role'),
    empresaId: decoded.empresaId || null,
    funcionarioId: daConta('funcionarioId') || null,
  };

  // Abre o escopo de tenant para o resto da requisição
  return comEscopoDeTenant(req, res, next);
}

module.exports = auth;
