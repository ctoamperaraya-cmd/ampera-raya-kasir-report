require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const reportsRouter  = require('./routes/reports');
const usersRouter    = require('./routes/users');
const authRouter     = require('./routes/auth');
const webhookRouter  = require('./routes/webhook');

const app  = express();
const PORT = process.env.API_PORT || 3000;

// ── Security & logging ────────────────────────────────────────────
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: [
    'http://localhost:5173',       // miniapp dev
    'http://localhost:5174',       // dashboard dev
    process.env.MINIAPP_URL,
    process.env.DASHBOARD_URL,
  ].filter(Boolean),
  credentials: true,
}));

// Raw body untuk Telegram webhook (sebelum json parser)
app.use('/webhook', express.raw({ type: 'application/json' }), webhookRouter);

app.use(express.json());

// Rate limit — 60 req/menit per IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',    authRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/users',   usersRouter);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Route tidak dijumpai' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Ampera Kasir API berjalan di http://localhost:${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
