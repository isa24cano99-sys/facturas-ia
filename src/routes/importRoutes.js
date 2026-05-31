'use strict';

const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const crypto = require('crypto');

const router = express.Router();
const upload = multer({ dest: 'tmp/' });

// ── ID GENERATOR ──
function id(prefix) {
  return prefix + '_' + crypto.randomUUID();
}

// ── SAFE GETTER ──
function get(row, keys, fallback = null) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key];
    }
  }
  return fallback;
}

// ── MONTH FALLBACK ──
function getMonthFallback() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

router.post('/', upload.single('file'), (req, res) => {
  try {
    const db = req.app.get('db');

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheet]);

    const results = [];

    for (const row of rows) {

      // ── BRANCH DATA (flexible headers) ──
      const branch_id = get(row, ['branch_id', 'Branch ID', 'branchId']);
      const branch_name = get(row, ['branch_name', 'Branch Name']);
      const branch_manager_name = get(row, ['branch_manager_name', 'Manager Name']);
      const branch_manager_email = get(row, ['branch_manager_email', 'Email']);

      if (!branch_id) continue; // skip invalid rows

      // ── MONTH DATA (safe) ──
      const report_month_id =
        get(row, ['report_month_id', 'month', 'Month']) || getMonthFallback();

      const report_month_display =
        get(row, ['report_month_display', 'month_display', 'Month Display']) ||
        report_month_id;

      const has_b2b = get(row, ['has_b2b']) ? 1 : 0;
      const has_offshore = get(row, ['has_offshore']) ? 1 : 0;

      // ── SAVE BRANCH ──
      db.prepare(`
        INSERT OR REPLACE INTO branches
        (branch_id, branch_name, branch_manager_name, branch_manager_email)
        VALUES (?, ?, ?, ?)
      `).run(
        branch_id,
        branch_name || '',
        branch_manager_name || '',
        branch_manager_email || ''
      );

      // ── REPORT ID SAFE ──
      const report_id = `${branch_id}_${report_month_id}`;

      db.prepare(`
        INSERT OR REPLACE INTO monthly_reports
        (report_id, branch_id, report_month_id, report_month_display, has_b2b, has_offshore)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        report_id,
        branch_id,
        report_month_id,
        report_month_display,
        has_b2b,
        has_offshore
      );

      // ── B2B ──
      if (has_b2b) {
        db.prepare(`
          INSERT INTO b2b_services_data
          (b2b_data_id, report_id, b2b_service_name, b2b_monthly_fee)
          VALUES (?, ?, ?, ?)
        `).run(
          id('b2b'),
          report_id,
          'B2B Strategy',
          get(row, ['b2b_monthly_fee'], 0)
        );
      }

      // ── OFFSHORE ──
      let employees = [];

      const rawEmployees = get(row, ['offshore_employees']);

      if (has_offshore && rawEmployees) {
        try {
          employees =
            typeof rawEmployees === 'string'
              ? JSON.parse(rawEmployees)
              : rawEmployees;
        } catch (e) {
          employees = [];
        }

        for (const emp of employees) {
          db.prepare(`
            INSERT INTO offshore_services_data
            (offshore_data_id, report_id, offshore_service_name, talent_name, talent_role, mss_direct_salary, indirect_costs, agency_markup, is_markup_waived)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            id('off'),
            report_id,
            'Offshore Hiring',
            emp?.name || '',
            emp?.role || '',
            emp?.salary || 0,
            emp?.indirect_costs || 0,
            0.20,
            1
          );
        }
      }

      results.push(report_id);
    }

    fs.unlinkSync(req.file.path);

    res.json({
      ok: true,
      message: 'Import successful',
      reports: results.length,
      report_ids: results
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: 'Import failed',
      details: err.message
    });
  }
});

module.exports = router;
