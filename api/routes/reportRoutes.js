'use strict';

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const db = req.app.get('db');
    // Fetch reports with branch details
    const reports = db.prepare(`
      SELECT r.*, b.branch_name, b.branch_manager_name
      FROM monthly_reports r
      JOIN branches b ON r.branch_id = b.branch_id
      ORDER BY r.report_month_id DESC
    `).all();
    res.json({ ok: true, reports });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:report_id', (req, res) => {
  try {
    const db = req.app.get('db');
    const report_id = req.params.report_id;

    const report = db.prepare(`
      SELECT r.*, b.branch_name, b.county, b.state, b.branch_manager_name, b.branch_manager_email
      FROM monthly_reports r
      JOIN branches b ON r.branch_id = b.branch_id
      WHERE r.report_id = ?
    `).get(report_id);

    if (!report) {
      return res.status(404).json({ ok: false, error: 'Report not found' });
    }

    const b2b = db.prepare(`
      SELECT * FROM b2b_services_data WHERE report_id = ?
    `).all(report_id);

    const offshore = db.prepare(`
      SELECT * FROM offshore_services_data WHERE report_id = ?
    `).all(report_id);

    res.json({ ok: true, report, b2b, offshore });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
