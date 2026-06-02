'use strict';

const crypto = require('crypto');

function invoiceId(prefix) {
  return prefix + '_' + crypto.randomUUID();
}

/**
 * Genera facturas automáticamente para cada reporte
 * Una factura por: branch_id + report_month_id
 * 
 * Tipo de factura:
 * - 'b2b' si solo tiene B2B
 * - 'offshore' si solo tiene Offshore
 * - 'combined' si tiene ambos
 */
function generateInvoicesFromReports(db) {
  const errors = [];
  const stats = { created: 0, errors: 0 };

  try {
    // Obtener todos los reportes que no tienen factura aún
    const reportsSql = `
      SELECT r.*, b.branch_name, b.county, b.state, b.branch_manager_name, b.branch_manager_email
      FROM monthly_reports r
      JOIN branches b ON r.branch_id = b.branch_id
      WHERE r.report_id NOT IN (SELECT report_id FROM invoices)
    `;

    const reports = db.prepare(reportsSql).all();

    reports.forEach(report => {
      try {
        // Calcular totales B2B
        const b2bSum = db.prepare(`
          SELECT COALESCE(SUM(monthly_investment), 0) as total
          FROM b2b_services_data
          WHERE report_id = ?
        `).get(report.report_id);

        // Calcular totales Offshore
        const offshoreSum = db.prepare(`
          SELECT COALESCE(SUM(mss_direct_salary + indirect_costs + agency_markup), 0) as total
          FROM offshore_services_data
          WHERE report_id = ?
        `).get(report.report_id);

        const b2bTotal = b2bSum?.total || 0;
        const offshoreTotal = offshoreSum?.total || 0;
        const grandTotal = b2bTotal + offshoreTotal;

        // Determinar tipo de factura
        let invoiceType = 'combined';
        if (b2bTotal > 0 && offshoreTotal === 0) invoiceType = 'b2b';
        else if (offshoreTotal > 0 && b2bTotal === 0) invoiceType = 'offshore';

        // Crear factura
        const invoice = {
          invoice_id: invoiceId('inv'),
          report_id: report.report_id,
          branch_id: report.branch_id,
          branch_name: report.branch_name,
          county: report.county,
          state: report.state,
          branch_manager_name: report.branch_manager_name,
          branch_manager_email: report.branch_manager_email,
          report_month_id: report.report_month_id,
          report_month_display: report.report_month_display,
          invoice_type: invoiceType,
          b2b_total: b2bTotal,
          offshore_total: offshoreTotal,
          grand_total: grandTotal
        };

        db.prepare(`
          INSERT INTO invoices (
            invoice_id, report_id, branch_id, branch_name, county, state,
            branch_manager_name, branch_manager_email, report_month_id,
            report_month_display, invoice_type, b2b_total, offshore_total, grand_total
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          invoice.invoice_id,
          invoice.report_id,
          invoice.branch_id,
          invoice.branch_name,
          invoice.county,
          invoice.state,
          invoice.branch_manager_name,
          invoice.branch_manager_email,
          invoice.report_month_id,
          invoice.report_month_display,
          invoice.invoice_type,
          invoice.b2b_total,
          invoice.offshore_total,
          invoice.grand_total
        );

        stats.created++;
      } catch (err) {
        errors.push({ report_id: report.report_id, message: err.message });
        stats.errors++;
      }
    });

  } catch (err) {
    errors.push({ type: 'fatal', message: err.message });
  }

  return { errors, stats };
}

module.exports = {
  generateInvoicesFromReports
};
