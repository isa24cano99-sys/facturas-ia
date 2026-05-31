'use strict';

const express = require('express');
const cors = require('cors')
app.use(cors())
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
app.use(express.json());

// ── ASEGURAR CARPETA DATA ─────────────────────────
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ── ROOT (ARREGLA "Cannot GET /") ─────────────────
app.get('/', (_req, res) => {
  res.json({
    status: 'running',
    message: 'Backend is alive',
    endpoints: ['/health', '/api/test']
  });
});

// ── DB ───────────────────────────────
const dbPath = process.env.DATABASE_PATH
  || path.join(__dirname, 'data', 'facturas_ia.db');

const db = new Database(dbPath);

// ── SCHEMA (OPCIONAL) ─────────────────────────────
const schemaPath = path.join(__dirname, 'db', 'schema.sql');

if (fs.existsSync(schemaPath)) {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

// ── HEALTH CHECK ───────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', db: 'sqlite' });
});

// ── TEST API ───────────────────────────────────────
app.get('/api/test', (_req, res) => {
  res.json({ ok: true, message: 'API running' });
});

// ── SHUTDOWN CLEAN ─────────────────────────────────
function shutdown() {
  try {
    db.close();
  } catch (e) {}
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ── START SERVER ───────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

module.exports = app;
