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

router.put('/b2b/:b2b_data_id', (req, res) => {
  try {
    const db = req.app.get('db');
    const { b2b_data_id } = req.params;
    const { service_name, monthly_investment, success_fee } = req.body;

    if (!service_name || typeof monthly_investment !== 'number') {
      return res.status(400).json({ ok: false, error: 'Invalid input' });
    }

    db.exec('BEGIN TRANSACTION');

    const result = db.prepare(`
      UPDATE b2b_services_data 
      SET service_name = ?, monthly_investment = ?, success_fee = ?
      WHERE b2b_data_id = ?
    `).run(service_name, monthly_investment, success_fee || '', b2b_data_id);

    if (result.changes === 0) {
      db.exec('ROLLBACK');
      return res.status(404).json({ ok: false, error: 'Record not found' });
    }

    const b2bRow = db.prepare(`SELECT report_id FROM b2b_services_data WHERE b2b_data_id = ?`).get(b2b_data_id);
    
    if (b2bRow) {
      const report_id = b2bRow.report_id;

      const b2bSum = db.prepare(`
        SELECT COALESCE(SUM(monthly_investment), 0) as total
        FROM b2b_services_data
        WHERE report_id = ?
      `).get(report_id);

      const b2bTotal = b2bSum?.total || 0;

      db.prepare(`
        UPDATE invoices
        SET b2b_total = ?, grand_total = ? + offshore_total
        WHERE report_id = ?
      `).run(b2bTotal, b2bTotal, report_id);
    }

    db.exec('COMMIT');
    res.json({ ok: true });

  } catch (err) {
    req.app.get('db').exec('ROLLBACK');
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
