require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*', methods: ['GET','POST','DELETE','PUT','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.options('*', cors());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 15 });
app.use('/api/content/generate', aiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), smtp: !!process.env.SMTP_USER, ai: !!process.env.MISTRAL_API_KEY });
});
app.get('/favicon.ico', (req, res) => res.status(204).end());

const subscriberRoutes = require('./api/subscribers');
const contentRoutes    = require('./api/content');
const emailRoutes      = require('./api/email');
app.use("/api/webhook", require("./api/webhook"));

app.use('/api/subscribers', subscriberRoutes);
app.use('/api/content',     contentRoutes);
app.use('/api/email',       emailRoutes);

// Serve React build
const buildPath = path.join(__dirname, 'client', 'build');
app.use(express.static(buildPath));
app.get('*', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));

app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Agentra running on http://localhost:${PORT}`);
  console.log(`📧 SMTP: ${process.env.SMTP_USER ? '✓' : '⚠ not set'}`);
  console.log(`🤖 AI:   ${process.env.MISTRAL_API_KEY ? '✓' : '⚠ not set'}`);
  console.log(`💾 DB:   ${process.env.DATABASE_URL ? '✓' : '⚠ not set'}\n`);
});

module.exports = app;
