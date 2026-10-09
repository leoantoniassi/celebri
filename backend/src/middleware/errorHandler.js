// ============================================================
// Middleware: Error Handler Global
// ============================================================

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  console.error('❌ Erro:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Erros de validação do Sequelize
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: 'Erro de validação.',
      errors,
    });
  }

  // Erros de constraint única do Sequelize
  if (err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map((e) => `O valor informado já está em uso.`);
    return res.status(409).json({
      success: false,
      message: 'Registro duplicado.',
      errors,
    });
  }

  // Erros de FK do Sequelize
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Referência inválida. Verifique os IDs informados.',
    });
  }

  // Erros do Multer (upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'Arquivo muito grande. Tamanho máximo permitido: 10MB.',
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Campo de upload inesperado.',
    });
  }

  // Erro de negócio com mensagem segura para o cliente (ex.: FK inválida)
  if (err.expose === true && err.statusCode >= 400 && err.statusCode < 500) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // Erro genérico
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: 'Erro interno do servidor.',
  });
}

module.exports = errorHandler;
