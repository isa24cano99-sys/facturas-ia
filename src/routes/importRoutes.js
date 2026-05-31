const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
const upload = multer({ dest: 'tmp/' });

function id(prefix) {
  return prefix + '_' + crypto.randomUUID();
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

      const branch_id = row.branch_id;
      const branch_name = row.branch_name;
      const branch_manager_name = row.branch_manager_name;
      const branch_manager_email = row.branch_manager_email;

      const report_month_id = row.report_month_id;
      const report_month_display = row.report_month_display;

      const has_b2b = row.has_b2b ? 1 : 0;
      const has_offshore = row.has_offshore ? 1 : 0;

      // ── BRANCH ──
      db.prepare(`
        INSERT OR REPLACE INTO branches
        (branch_id, branch_name, branch_manager_name, branch_manager_email)
        VALUES (?, ?, ?, ?)
      `).run(branch_id, branch_name, branch_manager_name, branch_manager_email);

      // ── REPORT ──
      const report_id = `${branch_id}_${report_month_id}`;

      db.prepare(`
        INSERT OR REPLACE INTO monthly_reports
        (report_id, branch_id, report_month_id, report_month_display, has_b2b, has_offshore)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(report_id, branch_id, report_month_id, report_month_display, has_b2b, has_offshore);

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
          row.b2b_monthly_fee || 0
        );
      }

      // ── OFFSHORE (JSON en Excel) ──
      if (has_offshore && row.offshore_employees) {
        let employees = [];

        try {
          employees = typeof row.offshore_employees === 'string'
            ? JSON.parse(row.offshore_employees)
            : row.offshore_employees;
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
            emp.name,
            emp.role,
            emp.salary,
            emp.indirect_costs,
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
    res.status(500).json({ error: 'Import failed' });
  }
});

module.exports = router;
