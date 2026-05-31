'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');

const Database = require('better-sqlite3');

const importRoutes = require('./src/routes/importRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const pdfRoutes = require('./src/routes/pdfRoutes');
const { closeBrowser } = require('./src/services/pdfService');

const app = express();
app.use(express.json());

// ── DB ─────────────────────────────────────────────
const dbPath = process.env.DATABASE_PATH
  || path.join(__dirname, 'data', 'facturas_ia.db');

const db = new Database(dbPath);

// SOLO ejecutar schema si existe
const schemaPath = path.join(__dirname, 'db', 'schema.sql');

if (fs.existsSync(schemaPath)) {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

app.set('db', db);

// ── API ────────────────────────────────────────────
app.use('/api/import', importRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reports', pdfRoutes);

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', db: 'sqlite' })
);

// ── FRONTEND SAFE ─────────────────────────────────
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

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
  console.log('server running');
});

module.exports = app;
