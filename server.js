'use strict';

const express          = require('express');
const path             = require('path');
const fs               = require('fs');
const { createClient } = require('./src/db/client');
const importRoutes     = require('./src/routes/importRoutes');
const reportRoutes     = require('./src/routes/reportRoutes');
const pdfRoutes        = require('./src/routes/pdfRoutes');
const { closeBrowser } = require('./src/services/pdfService');

const app = express();
app.use(express.json());

// ── Database ──────────────────────────────────────────────────────────────────
// DATABASE_PATH defaults to ./data/facturas_ia.db beside the project root.
// Set the env var to override (e.g. an absolute path on the production server).
const dbPath = process.env.DATABASE_PATH
    || path.join(__dirname, 'data', 'facturas_ia.db');

const db = createClient(dbPath);

// Run the schema on every startup — all statements use IF NOT EXISTS,
// so this is safe and idempotent for both new and existing databases.
const schemaSql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
db.exec(schemaSql);

app.set('db', db);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/import',  importRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reports', pdfRoutes);

// 👇 PEGA ESTO AQUÍ
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', db: 'sqlite' }));

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown() {
    await closeBrowser();
    db.close();
    process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[server] http://localhost:${PORT}  |  db: ${dbPath}`);
});

module.exports = app;
