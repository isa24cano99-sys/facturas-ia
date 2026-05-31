'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
app.use(express.json());

// ── DB ───────────────────────────────
const dbPath = process.env.DATABASE_PATH
  || path.join(__dirname, 'data', 'facturas_ia.db');

const db = new Database(dbPath);

// schema opcional (solo si existe)
const schemaPath = path.join(__dirname, 'db', 'schema.sql');

if (fs.existsSync(schemaPath)) {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', db: 'sqlite' });
});

// ── ENDPOINTS MINIMOS (PARA QUE NO ROMPA) ──
app.get('/api/test', (_req, res) => {
  res.json({ ok: true, message: 'API running' });
});

// ── SHUTDOWN ─────────────────────────
process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

// ── START ────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('server running on port', PORT);
});

module.exports = app;
