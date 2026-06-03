'use strict';

const express = require('express');
const router = express.Router();
const { generateInvoicePDF, generateBatchInvoicePDFs } = require('../services/pdfService');
const archiver = require('archiver');

// Individual PDF Generation
router.get('/generate/:report_id', async (req, res) => {
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

    const b2bData = db.prepare(`SELECT * FROM b2b_services_data WHERE report_id = ?`).all(report_id);
    const offshoreData = db.prepare(`SELECT * FROM offshore_services_data WHERE report_id = ?`).all(report_id);

    const pdfData = await generateInvoicePDF(report, b2bData, offshoreData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfData.filename}"`);
    res.send(pdfData.buffer);

  } catch (err) {
    console.error('PDF Generation Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Batch PDF Generation
router.get('/generate-batch/:report_month_id', async (req, res) => {
  try {
    const db = req.app.get('db');
    const report_month_id = req.params.report_month_id;

    const reports = db.prepare(`
      SELECT r.*, b.branch_name, b.county, b.state, b.branch_manager_name, b.branch_manager_email
      FROM monthly_reports r
      JOIN branches b ON r.branch_id = b.branch_id
      WHERE r.report_month_id = ?
    `).all(report_month_id);

    if (!reports || reports.length === 0) {
      return res.status(404).json({ ok: false, error: 'No reports found for this month' });
    }

    const b2bDataMap = {};
    const offshoreDataMap = {};

    // Group data by report_id
    const allB2b = db.prepare(`
      SELECT b2b.* FROM b2b_services_data b2b
      JOIN monthly_reports r ON b2b.report_id = r.report_id
      WHERE r.report_month_id = ?
    `).all(report_month_id);
    
    for (const item of allB2b) {
      if (!b2bDataMap[item.report_id]) b2bDataMap[item.report_id] = [];
      b2bDataMap[item.report_id].push(item);
    }

    const allOffshore = db.prepare(`
      SELECT off.* FROM offshore_services_data off
      JOIN monthly_reports r ON off.report_id = r.report_id
      WHERE r.report_month_id = ?
    `).all(report_month_id);

    for (const item of allOffshore) {
      if (!offshoreDataMap[item.report_id]) offshoreDataMap[item.report_id] = [];
      offshoreDataMap[item.report_id].push(item);
    }

    // Generate PDFs
    const { results, errors } = await generateBatchInvoicePDFs(reports, b2bDataMap, offshoreDataMap);

    if (results.length === 0) {
      return res.status(500).json({ ok: false, error: 'Failed to generate any PDFs', details: errors });
    }

    // Create ZIP
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="Invoices_${report_month_id}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(res);

    for (const pdf of results) {
      archive.append(pdf.buffer, { name: pdf.filename });
    }

    // Optionally append an error log if some failed
    if (errors.length > 0) {
      archive.append(JSON.stringify(errors, null, 2), { name: 'errors.json' });
    }

    await archive.finalize();

  } catch (err) {
    console.error('Batch PDF Generation Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
});

module.exports = router;
