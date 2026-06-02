'use strict';

const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const crypto = require('crypto');
const { generateInvoicesFromReports } = require('../services/invoiceGenerator');

const router = express.Router();
const upload = multer({ dest: 'tmp/' });

// ── ID GENERATOR ──
function id(prefix) {
  return prefix + '_' + crypto.randomUUID();
}

// ── DATE VALIDATOR ──
function isValidYearMonth(val) {
  if (!val || typeof val !== 'string') return false;
  // match YYYY-MM
  return /^\d{4}-\d{2}$/.test(val.trim());
}

// ── CORE PARSING & VALIDATION LOGIC ──
function parseAndValidate(filePath, db) {
  const errors = [];
  const stats = {
    branches: 0,
    newBranches: 0,
    updatedBranches: 0,
    reports: 0,
    b2b_entries: 0,
    offshore_entries: 0
  };

  const workbook = xlsx.readFile(filePath);
  const sheetNames = workbook.SheetNames.map(s => s.toLowerCase());

  // 1. Check sheets exist
  const reqSheets = ['branches', 'b2b_services_data', 'offshore_services_data'];
  const missingSheets = reqSheets.filter(s => !sheetNames.includes(s));
  
  if (missingSheets.length > 0) {
    errors.push({ type: 'fatal', message: `Missing required sheets: ${missingSheets.join(', ')}` });
    return { errors, stats, parsed: null };
  }

  // Get raw data
  const branchesSheet = workbook.Sheets[workbook.SheetNames[sheetNames.indexOf('branches')]];
  const b2bSheet = workbook.Sheets[workbook.SheetNames[sheetNames.indexOf('b2b_services_data')]];
  const offshoreSheet = workbook.Sheets[workbook.SheetNames[sheetNames.indexOf('offshore_services_data')]];

  const branchesRows = xlsx.utils.sheet_to_json(branchesSheet, { defval: '' });
  const b2bRows = xlsx.utils.sheet_to_json(b2bSheet, { defval: '' });
  const offshoreRows = xlsx.utils.sheet_to_json(offshoreSheet, { defval: '' });

  const parsed = { branches: [], b2b: [], offshore: [] };
  
  // existing branches in DB to check new vs updated
  let existingBranchIds = new Set();
  if (db) {
    const dbBranches = db.prepare('SELECT branch_id FROM branches').all();
    dbBranches.forEach(b => existingBranchIds.add(b.branch_id));
  }

  // 2. Validate Branches
  const importedBranchIds = new Set();
  
  branchesRows.forEach((row, i) => {
    const rowNum = i + 2; // +1 for 0-index, +1 for header
    const branch_id = String(row.branch_id || '').trim();
    const branch_name = String(row.branch_name || '').trim();
    
    if (!branch_id) {
      errors.push({ sheet: 'branches', row: rowNum, message: 'branch_id is empty.' });
      return;
    }
    if (!branch_name) {
      errors.push({ sheet: 'branches', row: rowNum, message: 'branch_name is empty.' });
    }
    if (importedBranchIds.has(branch_id)) {
      errors.push({ sheet: 'branches', row: rowNum, message: `Duplicate branch_id found: ${branch_id}.` });
    }

    importedBranchIds.add(branch_id);
    parsed.branches.push(row);

    if (existingBranchIds.has(branch_id)) {
      stats.updatedBranches++;
    } else {
      stats.newBranches++;
    }
  });
  stats.branches = parsed.branches.length;

  // Track reports metadata
  const reportsToCreate = new Set(); 
  const reportDataMap = new Map();

  const addReportMetadata = (branch_id, report_month_id, isB2b) => {
    const report_id = `${branch_id}_${report_month_id}`;
    reportsToCreate.add(report_id);
    if (!reportDataMap.has(report_id)) {
      reportDataMap.set(report_id, { branch_id, report_month_id, has_b2b: 0, has_offshore: 0 });
    }
    const meta = reportDataMap.get(report_id);
    if (isB2b) meta.has_b2b = 1;
    else meta.has_offshore = 1;
    return report_id;
  };

  // 3. Validate B2B
  b2bRows.forEach((row, i) => {
    const rowNum = i + 2;
    const branch_id = String(row.branch_id || '').trim();
    const report_month_id = String(row.report_month_id || '').trim();
    // Accept both 'monthly_investment' and legacy 'b2b_monthly_fee'
    const rawInv = row.monthly_investment ?? row.b2b_monthly_fee;
    const monthly_inv = parseFloat(rawInv);
    // Accept both 'service_name' and legacy 'b2b_service_name'
    const service_name = String(row.service_name || row.b2b_service_name || '').trim();

    if (!branch_id) errors.push({ sheet: 'b2b_services_data', row: rowNum, message: 'branch_id is empty.' });
    if (branch_id && !importedBranchIds.has(branch_id)) {
      errors.push({ sheet: 'b2b_services_data', row: rowNum, message: `branch_id '${branch_id}' does not exist in branches sheet.` });
    }
    if (!isValidYearMonth(report_month_id)) {
      errors.push({ sheet: 'b2b_services_data', row: rowNum, message: `Invalid report_month_id format: '${report_month_id}'. Use YYYY-MM.` });
    }
    if (rawInv === undefined || rawInv === '' || isNaN(monthly_inv)) {
      errors.push({ sheet: 'b2b_services_data', row: rowNum, message: `monthly_investment (or b2b_monthly_fee) must be a valid number. Found: '${rawInv}'.` });
    }

    if (branch_id && isValidYearMonth(report_month_id)) {
      const report_id = addReportMetadata(branch_id, report_month_id, true);
      parsed.b2b.push({ ...row, report_id, service_name, monthly_investment: isNaN(monthly_inv) ? 0 : monthly_inv });
    }
  });
  stats.b2b_entries = parsed.b2b.length;

  // 4. Validate Offshore
  offshoreRows.forEach((row, i) => {
    const rowNum = i + 2;
    const branch_id = String(row.branch_id || '').trim();
    const report_month_id = String(row.report_month_id || '').trim();
    const salary = parseFloat(row.mss_direct_salary);
    const costs = parseFloat(row.indirect_costs);
    const markup = parseFloat(row.agency_markup);

    if (!branch_id) errors.push({ sheet: 'offshore_services_data', row: rowNum, message: 'branch_id is empty.' });
    if (!importedBranchIds.has(branch_id)) {
      errors.push({ sheet: 'offshore_services_data', row: rowNum, message: `branch_id '${branch_id}' does not exist in branches sheet.` });
    }
    if (!isValidYearMonth(report_month_id)) {
      errors.push({ sheet: 'offshore_services_data', row: rowNum, message: `Invalid report_month_id format: '${report_month_id}'. Use YYYY-MM.` });
    }
    if (isNaN(salary)) errors.push({ sheet: 'offshore_services_data', row: rowNum, message: 'mss_direct_salary must be a number.' });
    if (isNaN(costs)) errors.push({ sheet: 'offshore_services_data', row: rowNum, message: 'indirect_costs must be a number.' });
    if (isNaN(markup)) errors.push({ sheet: 'offshore_services_data', row: rowNum, message: 'agency_markup must be a number.' });

    if (branch_id && isValidYearMonth(report_month_id)) {
      const report_id = addReportMetadata(branch_id, report_month_id, false);
      parsed.offshore.push({ 
        ...row, 
        report_id,
        mss_direct_salary: isNaN(salary) ? 0 : salary,
        indirect_costs: isNaN(costs) ? 0 : costs,
        agency_markup: isNaN(markup) ? 0 : markup
      });
    }
  });
  stats.offshore_entries = parsed.offshore.length;
  stats.reports = reportsToCreate.size;

  parsed.reportsToCreate = reportsToCreate;
  parsed.reportDataMap = reportDataMap;

  return { errors, stats, parsed };
}

// ── PREVIEW ROUTE ──
router.post('/preview', upload.single('file'), (req, res) => {
  try {
    const db = req.app.get('db');

    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file uploaded' });
    }

    const { errors, stats } = parseAndValidate(req.file.path, db);
    
    // Cleanup immediately after preview
    fs.unlinkSync(req.file.path);

    res.json({
      ok: true,
      errors,
      stats,
      hasErrors: errors.length > 0
    });

  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ ok: false, error: 'Preview failed', details: err.message });
  }
});

// ── CONFIRM ROUTE ──
router.post('/confirm', upload.single('file'), (req, res) => {
  try {
    const db = req.app.get('db');

    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file uploaded' });
    }

    const { errors, stats, parsed } = parseAndValidate(req.file.path, db);

    if (errors.length > 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ ok: false, error: 'Validation failed during confirmation', errors });
    }

    db.exec('BEGIN TRANSACTION');

    // 1. Insert Branches
    const insertBranch = db.prepare(`
      INSERT OR REPLACE INTO branches
      (branch_id, branch_name, county, state, branch_manager_name, branch_manager_email)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const row of parsed.branches) {
      insertBranch.run(
        String(row.branch_id).trim(),
        String(row.branch_name || '').trim(),
        String(row.county || '').trim(),
        String(row.state || '').trim(),
        String(row.branch_manager_name || '').trim(),
        String(row.branch_manager_email || '').trim()
      );
    }

    // 2. Insert Reports
    const insertReport = db.prepare(`
      INSERT OR IGNORE INTO monthly_reports
      (report_id, branch_id, report_month_id, report_month_display, has_b2b, has_offshore)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const updateReportFlags = db.prepare(`
      UPDATE monthly_reports 
      SET has_b2b = max(has_b2b, ?), has_offshore = max(has_offshore, ?)
      WHERE report_id = ?
    `);

    for (const report_id of parsed.reportsToCreate) {
      const meta = parsed.reportDataMap.get(report_id);
      insertReport.run(report_id, meta.branch_id, meta.report_month_id, meta.report_month_id, meta.has_b2b, meta.has_offshore);
      updateReportFlags.run(meta.has_b2b, meta.has_offshore, report_id);
    }

    // 3. Insert B2B
    const insertB2b = db.prepare(`
      INSERT INTO b2b_services_data
      (b2b_data_id, report_id, service_name, monthly_investment)
      VALUES (?, ?, ?, ?)
    `);

    for (const b2b of parsed.b2b) {
      insertB2b.run(id('b2b'), b2b.report_id, String(b2b.service_name || '').trim(), b2b.monthly_investment);
    }

    // 4. Insert Offshore
    const insertOffshore = db.prepare(`
      INSERT INTO offshore_services_data
      (offshore_data_id, report_id, employee_name, employee_role, mss_direct_salary, indirect_costs, agency_markup)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const off of parsed.offshore) {
      insertOffshore.run(id('off'), off.report_id, String(off.employee_name || '').trim(), String(off.employee_role || '').trim(), off.mss_direct_salary, off.indirect_costs, off.agency_markup);
    }

    db.exec('COMMIT');

    // ── AUTO GENERATE INVOICES ──
    const invoiceGenResult = generateInvoicesFromReports(req.app.get('db'));
    stats.invoices_generated = invoiceGenResult.stats.created;
    stats.invoice_errors = invoiceGenResult.stats.errors;

    fs.unlinkSync(req.file.path);

    res.json({
      ok: true,
      message: 'Import successful and invoices generated',
      stats,
      invoiceGeneration: invoiceGenResult
    });

  } catch (err) {
    req.app.get('db').exec('ROLLBACK');
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ ok: false, error: 'Import failed', details: err.message });
  }
});

module.exports = router;
