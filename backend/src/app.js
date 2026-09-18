// ============================================================
// CELEBRI — Express App
// ============================================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Segurança ──────────────────────────────────────────────
app.use(helmet());

// ── CORS ───────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body Parsers ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Servir arquivos de upload ──────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Rotas ──────────────────────────────────────────────────
app.use('/api', routes);
// Alias versionado: o plano do app mobile especifica /api/v1.
app.use('/api/v1', routes);

// ── Health Check ───────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API Celebri funcionando!',
    timestamp: new Date().toISOString(),
  });
});

// ── Error Handler (deve ser o último middleware) ───────────
app.use(errorHandler);

module.exports = app;
