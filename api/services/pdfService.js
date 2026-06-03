const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Genera un número de factura único
 * Formato: HOM-YYYYMMDD-XXXX
 */
function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `HOM-${year}${month}${day}-${random}`;
}

/**
 * Formatea una fecha para mostrar
 * Ej: June 2, 2026
 */
function formatDate(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Formatea un número como moneda USD
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
}

/**
 * Formatea el nombre del archivo PDF
 * Formato: HOM_BranchID_Month_Year.pdf
 * Ej: HOM_BTN101_May_2026.pdf
 */
function generatePDFFilename(branchId, monthDisplay) {
  const parts = monthDisplay.split(' ');
  const month = parts[0];
  const year = parts[1];
  const safeBranchId = branchId.replace(/[^a-zA-Z0-9]/g, '_');
  return `HOM_${safeBranchId}_${month}_${year}.pdf`;
}

/**
 * Genera PDF profesional para una factura
 */
async function generateInvoicePDF(report, b2bData, offshoreData, browserInstance = null) {
  // Read HTML template
  const templatePath = path.join(__dirname, '..', 'templates', 'invoice.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // Metadata de la factura
  const invoiceNumber = generateInvoiceNumber();
  const issueDate = formatDate(new Date());

  // ═══════════════════════════════════════════════════════
  // B2B SECTION
  // ═══════════════════════════════════════════════════════
  let totalB2B = 0;
  let b2bHtmlRows = '';

  if (b2bData && b2bData.length > 0) {
    b2bData.forEach(item => {
      const investment = item.monthly_investment || 0;
      totalB2B += investment;
      b2bHtmlRows += `
        <tr>
          <td>${item.service_name || 'B2B Service'}</td>
          <td class="text-right">${formatCurrency(investment)}</td>
        </tr>
      `;
    });
  } else {
    b2bHtmlRows = '<tr><td colspan="2" class="no-data">No B2B Services</td></tr>';
  }

  // ═══════════════════════════════════════════════════════
  // OFFSHORE SECTION
  // ═══════════════════════════════════════════════════════
  let totalOffshore = 0;
  let totalMarkupWaived = 0;
  let offshoreHtmlRows = '';

  if (offshoreData && offshoreData.length > 0) {
    offshoreData.forEach(item => {
      const salary = item.mss_direct_salary || 0;
      const costs = item.indirect_costs || 0;
      const markup = item.agency_markup || 0;
      const effectiveCost = salary + costs; // NO incluir markup

      totalOffshore += effectiveCost;
      totalMarkupWaived += markup;

      offshoreHtmlRows += `
        <tr>
          <td class="employee-cell">
            <div class="employee-name">${item.employee_name || 'Employee'}</div>
            <div class="employee-role">${item.employee_role || 'Role'}</div>
          </td>
          <td class="text-right">${formatCurrency(salary)}</td>
          <td class="text-right">${formatCurrency(costs)}</td>
          <td class="text-right markup-cell">
            <span class="strikethrough">${formatCurrency(markup)}</span>
            <span class="badge-waived">100% WAIVED</span>
          </td>
          <td class="text-right"><strong>${formatCurrency(effectiveCost)}</strong></td>
        </tr>
      `;
    });
  } else {
    offshoreHtmlRows = '<tr><td colspan="5" class="no-data">No Offshore Services</td></tr>';
  }

  // ═══════════════════════════════════════════════════════
  // GRAND TOTAL (SIN markup)
  // ═══════════════════════════════════════════════════════
  const grandTotal = totalB2B + totalOffshore;

  // ═══════════════════════════════════════════════════════
  // FORMAT MONTH DISPLAY
  // ═══════════════════════════════════════════════════════
  const formatMonthDisplay = (val) => {
    if (!val || typeof val !== 'string') return val;
    const parts = val.split('-');
    if (parts.length !== 2) return val;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNum = parseInt(parts[1], 10);
    return monthNum >= 1 && monthNum <= 12 ? `${months[monthNum - 1]} ${parts[0]}` : val;
  };

  const monthDisplay = formatMonthDisplay(report.report_month_display);

  // ═══════════════════════════════════════════════════════
  // REPLACE PLACEHOLDERS
  // ═══════════════════════════════════════════════════════

  // Header
  html = html.replace('{{INVOICE_NUMBER}}', invoiceNumber);
  html = html.replace(/{{INVOICE_DATE}}/g, issueDate);
  html = html.replace(/{{MONTH}}/g, monthDisplay);

  // Branch Info
  html = html.replace(/{{BRANCH_ID}}/g, report.branch_id || 'N/A');
  html = html.replace(/{{BRANCH_NAME}}/g, report.branch_name || 'N/A');
  html = html.replace(/{{COUNTY}}/g, report.county || 'N/A');
  html = html.replace(/{{STATE}}/g, report.state || 'N/A');
  html = html.replace(/{{BRANCH_MANAGER}}/g, report.branch_manager_name || 'N/A');
  html = html.replace(/{{BRANCH_EMAIL}}/g, report.branch_manager_email || 'N/A');

  // Data rows
  html = html.replace('{{B2B_ROWS}}', b2bHtmlRows);
  html = html.replace('{{OFFSHORE_ROWS}}', offshoreHtmlRows);

  // Totals
  html = html.replace('{{TOTAL_B2B}}', formatCurrency(totalB2B));
  html = html.replace('{{TOTAL_OFFSHORE}}', formatCurrency(totalOffshore));
  html = html.replace('{{TOTAL_MARKUP}}', formatCurrency(totalMarkupWaived));
  html = html.replace('{{GRAND_TOTAL}}', formatCurrency(grandTotal));

  // ═══════════════════════════════════════════════════════
  // GENERATE PDF WITH PUPPETEER
  // ═══════════════════════════════════════════════════════

  const browser = browserInstance || await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: {
      top: '0.5in',
      bottom: '0.5in',
      left: '0.75in',
      right: '0.75in'
    },
    displayHeaderFooter: false,
    preferCSSPageSize: true
  });

  await page.close();

  if (!browserInstance) {
    await browser.close();
  }

  const filename = generatePDFFilename(report.branch_id, monthDisplay);

  return {
    buffer: pdfBuffer,
    filename: filename,
    invoiceNumber: invoiceNumber,
    metadata: {
      branch_id: report.branch_id,
      branch_name: report.branch_name,
      month: monthDisplay,
      invoice_number: invoiceNumber,
      issue_date: issueDate,
      grand_total: grandTotal,
      b2b_total: totalB2B,
      offshore_total: totalOffshore,
      markup_waived: totalMarkupWaived
    }
  };
}

/**
 * Genera PDFs en lote para múltiples reportes
 */
async function generateBatchInvoicePDFs(reports, b2bDataMap, offshoreDataMap) {
  const results = [];
  const errors = [];

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const report of reports) {
    try {
      const b2bData = b2bDataMap[report.report_id] || [];
      const offshoreData = offshoreDataMap[report.report_id] || [];

      const pdfData = await generateInvoicePDF(report, b2bData, offshoreData, browser);
      results.push(pdfData);
    } catch (err) {
      errors.push({
        report_id: report.report_id,
        branch_id: report.branch_id,
        error: err.message
      });
    }
  }

  await browser.close();

  return { results, errors };
}

module.exports = {
  generateInvoicePDF,
  generateBatchInvoicePDFs
};
