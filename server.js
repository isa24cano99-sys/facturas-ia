'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();

// ── MIDDLEWARE ─────────────────────────
app.use(cors());
app.use(express.json());

// ── ASEGURAR CARPETA DATA ─────────────────────────
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ── DB INIT (SAFE MODE) ─────────────────────────
const dbPath =
  process.env.DATABASE_PATH ||
  path.join(__dirname, 'data', 'facturas_ia.db');

let db;

try {
  db = new Database(dbPath);
  console.log('[DB] Connected:', dbPath);
} catch (err) {
  console.error('[DB ERROR]', err);
  process.exit(1);
}

// ── SCHEMA (SAFE EXECUTION) ─────────────────────────
const schemaPath = path.join(__dirname, 'db', 'schema.sql');

try {
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
    console.log('[DB] Schema loaded');
  } else {
    console.log('[DB] No schema file found (skipping)');
  }
} catch (err) {
  console.error('[DB SCHEMA ERROR]', err);
}

// ── SHARE DB ─────────────────────────
app.set('db', db);

// ── ROUTES BASE ─────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', db: 'sqlite' });
});

app.get('/api/test', (_req, res) => {
  res.json({ ok: true, message: 'API running' });
});

// ── API ROUTES (must register BEFORE the catch-all) ─────────────────────
const importRoutes = require('./api/routes/importRoutes');
const branchRoutes = require('./api/routes/branchRoutes');
const reportRoutes = require('./api/routes/reportRoutes');
const invoiceRoutes = require('./api/routes/invoiceRoutes');
const dashboardRoutes = require('./api/routes/dashboardRoutes');

app.use('/api/import', importRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── FRONTEND STATIC (REACT BUILD) ─────────────────────
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // Catch-all: serve index.html for all non-API routes (React Router)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── SHUTDOWN CLEAN ─────────────────────────
function shutdown() {
  try {
    db.close();
    console.log('[DB] closed');
  } catch (e) {}

  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ── START SERVER ────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

module.exports = app;
