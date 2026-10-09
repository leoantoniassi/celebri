// ============================================================
// CELEBRI — Express App
// ============================================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { lerTrustProxy, lerOrigensCors } = require('./config/seguranca');

const app = express();

// Atrás de nginx/load balancer, req.ip precisa vir do X-Forwarded-For para o
// rate limit enxergar o cliente real. Padrão: false (sem proxy confiável).
// Defina TRUST_PROXY com o número de proxies à frente da API (ex.: 1).
app.set('trust proxy', lerTrustProxy());

// ── Segurança ──────────────────────────────────────────────
// A API só devolve JSON (e a página pública do convite, com estilos inline):
// nada de scripts, frames ou recursos externos. A página do convite usa style=""
// e imagem data:, por isso style-src 'unsafe-inline' e img-src data:.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      styleSrc: ["'unsafe-inline'"],
      imgSrc: ['data:'],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // o frontend (outra origem) consome a API
  referrerPolicy: { policy: 'no-referrer' },
}));

// ── CORS ───────────────────────────────────────────────────
// Sem fallback '*': em produção FRONTEND_URL é obrigatória (falha ao subir).
const origensPermitidas = lerOrigensCors();
app.use(cors({
  origin: (origin, callback) => {
    // Sem Origin (curl, app mobile, healthcheck): não é navegador, CORS não se aplica.
    if (!origin || origensPermitidas.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug'],
}));

// ── Body Parsers ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
