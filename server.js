'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');

const { createClient } = require('./src/db/client');
const importRoutes = require('./src/routes/importRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const pdfRoutes = require('./src/routes/pdfRoutes');
const { closeBrowser } = require('./src/services/pdfService');

const app = express();
app.use(express.json());

// ── DB ─────────────────────────────────────────────
const dbPath = process.env.DATABASE_PATH
  || path.join(__dirname, 'data', 'facturas_ia.db');

const db = createClient(dbPath);

const schemaSql = fs.readFileSync(
  path.join(__dirname, 'db', 'schema.sql'),
  'utf8'
);

db.exec(schemaSql);

app.set('db', db);

// ── API ROUTES ─────────────────────────────────────
app.use('/api/import', importRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reports', pdfRoutes);

// ── HEALTH ─────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', db: 'sqlite' })
);

// ── FRONTEND (SAFE STATIC SERVING) ────────────────
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SOLO fallback SPA si dist existe
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── SHUTDOWN ───────────────────────────────────────
async function shutdown() {
  await closeBrowser();
  db.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ── START ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[server] running on port ${PORT}`);
});

module.exports = app;
