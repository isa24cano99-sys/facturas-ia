'use strict';

const express = require('express');
const router = express.Router();
const { generateInvoicePDF } = require('../services/pdfService');

router.get('/generate/:report_id', async (req, res) => {
  try {
    const db = req.app.get('db');
    const report_id = req.params.report_id;

    // Fetch report data
    const report = db.prepare(`
      SELECT r.*, b.branch_name, b.county, b.state, b.branch_manager_name, b.branch_manager_email
      FROM monthly_reports r
      JOIN branches b ON r.branch_id = b.branch_id
      WHERE r.report_id = ?
    `).get(report_id);

    if (!report) {
      return res.status(404).json({ ok: false, error: 'Report not found' });
    }

    const b2bData = db.prepare(`
      SELECT * FROM b2b_services_data WHERE report_id = ?
    `).all(report_id);

    const offshoreData = db.prepare(`
      SELECT * FROM offshore_services_data WHERE report_id = ?
    `).all(report_id);

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(report, b2bData, offshoreData);

    // Send PDF to client for download/view
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice_${report_id}.pdf"`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('PDF Generation Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
