'use strict';

const express = require('express');
const router = express.Router();

/**
 * GET /api/dashboard/months
 * Obtiene lista de meses disponibles
 */
router.get('/months', (req, res) => {
  try {
    const db = req.app.get('db');
    const months = db.prepare(`
      SELECT DISTINCT report_month_id, report_month_display
      FROM invoices
      ORDER BY report_month_id DESC
    `).all();

    res.json({ ok: true, months });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/dashboard/invoices
 * Filtra invoices por mes, branch, manager, etc.
 * 
 * Query params:
 * - month: report_month_id (ej: 2026-05)
 * - search: busca en branch_id, branch_name, branch_manager_name
 * - type: all|b2b|offshore|combined
 */
router.get('/invoices', (req, res) => {
  try {
    const db = req.app.get('db');
    const { month, search = '', type = 'all' } = req.query;

    let query = 'SELECT * FROM invoices WHERE 1=1';
    const params = [];

    // Filtro por mes
    if (month) {
      query += ' AND report_month_id = ?';
      params.push(month);
    }

    // Filtro por tipo (b2b, offshore, combined)
    if (type && type !== 'all') {
      query += ' AND invoice_type = ?';
      params.push(type);
    }

    // Búsqueda por branch_id, branch_name, manager_name
    if (search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query += ` AND (
        branch_id LIKE ? OR
        branch_name LIKE ? OR
        branch_manager_name LIKE ?
      )`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY branch_name ASC, report_month_id DESC';

    const invoices = db.prepare(query).all(...params);

    res.json({ ok: true, invoices });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/dashboard/stats
 * Estadísticas por mes
 * 
 * Query params:
 * - month: report_month_id (ej: 2026-05)
 */
router.get('/stats', (req, res) => {
  try {
    const db = req.app.get('db');
    const { month } = req.query;

    const baseQuery = 'FROM invoices WHERE 1=1';
    const params = [];

    if (month) {
      params.push(month);
    }

    const countAll = db.prepare(
      `SELECT COUNT(*) as count ${baseQuery} ${month ? 'AND report_month_id = ?' : ''}`
    ).get(...(month ? [month] : []));

    const countB2B = db.prepare(
      `SELECT COUNT(*) as count ${baseQuery} AND invoice_type = 'b2b' ${month ? 'AND report_month_id = ?' : ''}`
    ).get(...(month ? [month] : []));

    const countOffshore = db.prepare(
      `SELECT COUNT(*) as count ${baseQuery} AND invoice_type = 'offshore' ${month ? 'AND report_month_id = ?' : ''}`
    ).get(...(month ? [month] : []));

    const countCombined = db.prepare(
      `SELECT COUNT(*) as count ${baseQuery} AND invoice_type = 'combined' ${month ? 'AND report_month_id = ?' : ''}`
    ).get(...(month ? [month] : []));

    res.json({
      ok: true,
      stats: {
        total_invoices: countAll.count,
        b2b_only: countB2B.count,
        offshore_only: countOffshore.count,
        combined: countCombined.count
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/dashboard/invoices/:invoice_id
 * Obtiene detalles de una factura con B2B y Offshore
 */
router.get('/invoices/:invoice_id', (req, res) => {
  try {
    const db = req.app.get('db');
    const { invoice_id } = req.params;

    const invoice = db.prepare('SELECT * FROM invoices WHERE invoice_id = ?').get(invoice_id);

    if (!invoice) {
      return res.status(404).json({ ok: false, error: 'Invoice not found' });
    }

    const b2b = db.prepare(`
      SELECT * FROM b2b_services_data WHERE report_id = ?
    `).all(invoice.report_id);

    const offshore = db.prepare(`
      SELECT * FROM offshore_services_data WHERE report_id = ?
    `).all(invoice.report_id);

    res.json({ ok: true, invoice, b2b, offshore });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
