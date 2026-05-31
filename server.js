'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express(); // 👈 ESTO SIEMPRE PRIMERO

// middleware
app.use(cors());
app.use(express.json());

// ── ASEGURAR CARPETA DATA ─────────────────────────
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ── DB ───────────────────────────────
const dbPath = process.env.DATABASE_PATH
  || path.join(__dirname, 'data', 'facturas_ia.db');

const db = new Database(dbPath);

// ── SCHEMA ─────────────────────────────
const schemaPath = path.join(__dirname, 'db', 'schema.sql');

if (fs.existsSync(schemaPath)) {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

// ── ROUTES MINIMAS ─────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', db: 'sqlite' });
});

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
