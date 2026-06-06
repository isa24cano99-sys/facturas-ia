'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let globalBrowser = null;

function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `HOM-${year}${month}${day}-${random}`;
}

function formatDate(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
}

function generatePDFFilename(branchId, monthDisplay, type) {
  const parts = monthDisplay.split(' ');
  const month = parts[0];
  const year = parts[1];
  const safeBranchId = branchId.replace(/[^a-zA-Z0-9]/g, '_');
  const typeSuffix = type === 'b2b' ? '_B2B' : type === 'offshore' ? '_Offshore' : '';
  return `HOM_${safeBranchId}_${month}_${year}${typeSuffix}.pdf`;
}

function formatMonthDisplay(val) {
  if (!val || typeof val !== 'string') return val;
  const parts = val.split('-');
  if (parts.length !== 2) return val;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthNum = parseInt(parts[1], 10);
  return monthNum >= 1 && monthNum <= 12 ? (months[monthNum - 1] + ' ' + parts[0]) : val;
}

function buildB2bSection(b2bData, report, formatCur) {
  if (!b2bData || b2bData.length === 0) return '';
  let totalB2B = 0;
  let rows = '';

  b2bData.forEach(function (item) {
    const investment = item.monthly_investment || 0;
    const successFee = item.success_fee || '';
    totalB2B += investment;

    rows += '<div class="data-card">';
    rows += '<table>';
    rows += '<tbody>';
    rows += '<tr><td class="cell-label">Issued to</td><td class="cell-value">' + (report.branch_manager_name || 'N/A') + '</td></tr>';
    rows += '<tr><td class="cell-label">Branch</td><td class="cell-value">' + (report.branch_name || 'N/A') + '</td></tr>';
    rows += '<tr><td class="cell-label">Date</td><td class="cell-value">' + (report.report_month_display || '') + '</td></tr>';
    rows += '<tr><td class="cell-label">Service</td><td class="cell-value">' + (item.service_name || 'B2B Service') + '</td></tr>';
    rows += '<tr><td class="cell-label">Monthly Investment</td><td class="cell-value accent">' + formatCur(investment) + ' / month</td></tr>';
    rows += '<tr><td class="cell-label">Success Fee</td><td class="cell-value">' + successFee + '</td></tr>';
    rows += '</tbody></table></div>';
  });

  const section = '<div class="section-header">'
    + '<h2>Strategic Investment Confirmation</h2>'
    + '<div class="section-subtitle">B2B System Engine &middot; Full Package</div>'
    + '</div>'
    + rows
    + '<div class="section-total">'
    + '<p class="total-label">B2B Total</p>'
    + '<p class="total-amount">' + formatCur(totalB2B) + '</p>'
    + '</div>';

  return { html: section, total: totalB2B };
}

function buildOffshoreSection(offshoreData, report, formatCur) {
  if (!offshoreData || offshoreData.length === 0) return '';
  let totalOffshore = 0;
  let totalMarkup = 0;
  let rows = '<tr>'
    + '<th>Employee</th>'
    + '<th>Role</th>'
    + '<th>Direct Salary</th>'
    + '<th>Indirect Costs</th>'
    + '<th>Markup</th>'
    + '<th>Effective Cost</th>'
    + '</tr>';

  offshoreData.forEach(function (item) {
    const salary = item.mss_direct_salary || 0;
    const costs = item.indirect_costs || 0;
    const markup = item.agency_markup || 0;
    const effectiveCost = salary + costs;
    totalOffshore += effectiveCost;
    totalMarkup += markup;

    rows += '<tr>';
    rows += '<td class="cell-value muted">' + (item.employee_name || 'N/A') + '</td>';
    rows += '<td class="cell-value">' + (item.employee_role || 'N/A') + '</td>';
    rows += '<td class="cell-value">' + formatCur(salary) + '</td>';
    rows += '<td class="cell-value">' + formatCur(costs) + '</td>';
    rows += '<td class="cell-value">'
      + '<span class="strikethrough">' + formatCur(markup) + '</span>'
      + '<span class="badge-waived">100% WAIVED</span>'
      + '</td>';
    rows += '<td class="cell-value accent">' + formatCur(effectiveCost) + '</td>';
    rows += '</tr>';
  });

  const section = '<div class="section-header">'
    + '<h2>Offshore Services</h2>'
    + '<div class="section-subtitle">Branch ' + (report.branch_id || 'N/A') + ' &middot; All team members</div>'
    + '</div>'
    + '<div class="data-card offshore-table-card"><table><tbody>' + rows + '</tbody></table></div>'
    + '<div class="section-total">'
    + '<p class="markup-note">Markup Waived: <span class="strikethrough">' + formatCur(totalMarkup) + '</span></p>'
    + '<p class="total-label">Offshore Total</p>'
    + '<p class="total-amount">' + formatCur(totalOffshore) + '</p>'
    + '</div>';

  return { html: section, total: totalOffshore, markup: totalMarkup };
}

async function generateInvoicePDF(report, b2bData, offshoreData, type, browserInstance) {
  // type defaults to 'combined', browserInstance is optional
  if (typeof type === 'object' && type !== null && !browserInstance) {
    // Legacy call: generateInvoicePDF(report, b2b, offshore, browserInstance)
    browserInstance = type;
    type = 'combined';
  }
  type = type || 'combined';

  const templatePath = path.join(__dirname, '..', 'templates', 'invoice.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  const invoiceNumber = generateInvoiceNumber();
  const issueDate = formatDate(new Date());
  const monthDisplay = formatMonthDisplay(report.report_month_display);

  // Filter data based on type
  const actualB2b = (type === 'combined' || type === 'b2b') ? (b2bData || []) : [];
  const actualOffshore = (type === 'combined' || type === 'offshore') ? (offshoreData || []) : [];

  const b2bResult = buildB2bSection(actualB2b, report, formatCurrency);
  const offshoreResult = buildOffshoreSection(actualOffshore, report, formatCurrency);

  const b2bSectionHtml = b2bResult ? b2bResult.html : '';
  const offshoreSectionHtml = offshoreResult ? offshoreResult.html : '';

  // Replace header placeholders
  html = html.replace('{{INVOICE_NUMBER}}', invoiceNumber);
  html = html.replace(/\{\{INVOICE_DATE\}\}/g, issueDate);
  html = html.replace(/\{\{MONTH\}\}/g, monthDisplay);
  html = html.replace(/\{\{BRANCH_ID\}\}/g, report.branch_id || 'N/A');
  html = html.replace(/\{\{BRANCH_NAME\}\}/g, report.branch_name || 'N/A');
  html = html.replace(/\{\{COUNTY\}\}/g, report.county || 'N/A');
  html = html.replace(/\{\{STATE\}\}/g, report.state || 'N/A');
  html = html.replace(/\{\{BRANCH_MANAGER\}\}/g, report.branch_manager_name || 'N/A');
  html = html.replace(/\{\{BRANCH_EMAIL\}\}/g, report.branch_manager_email || 'N/A');

  // Replace sections
  html = html.replace('{{B2B_SECTION}}', b2bSectionHtml);
  html = html.replace('{{OFFSHORE_SECTION}}', offshoreSectionHtml);

  // Ensure browser is alive — recreate if crashed or closed
  async function getOrCreateBrowser() {
    if (globalBrowser) {
      try {
        // Quick health check: try to get pages
        await globalBrowser.pages();
        return globalBrowser;
      } catch (_) {
        // Browser crashed — reset and create a new one
        globalBrowser = null;
      }
    }
    globalBrowser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    return globalBrowser;
  }

  const browser = browserInstance || await getOrCreateBrowser();
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'load', timeout: 30000 });

  const pdfBuffer = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: { top: '0.5in', bottom: '0.5in', left: '0.75in', right: '0.75in' },
    displayHeaderFooter: false,
    preferCSSPageSize: true
  });

  await page.close();

  const filename = generatePDFFilename(report.branch_id, monthDisplay, type);
  const totalB2B = b2bResult ? b2bResult.total : 0;
  const totalOffshore = offshoreResult ? offshoreResult.total : 0;
  const totalMarkup = offshoreResult ? (offshoreResult.markup || 0) : 0;

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
      b2b_total: totalB2B,
      offshore_total: totalOffshore,
      markup_waived: totalMarkup
    }
  };
}

async function generateBatchInvoicePDFs(reports, b2bDataMap, offshoreDataMap) {
  const results = [];
  const errors = [];

  // Ensure browser is alive before batch run
  if (globalBrowser) {
    try {
      await globalBrowser.pages();
    } catch (_) {
      globalBrowser = null;
    }
  }
  if (!globalBrowser) {
    globalBrowser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
  }

  for (const report of reports) {
    const b2bData = b2bDataMap[report.report_id] || [];
    const offshoreData = offshoreDataMap[report.report_id] || [];

    // Generate B2B PDF if branch has b2b data
    if (b2bData.length > 0) {
      try {
        const pdfData = await generateInvoicePDF(report, b2bData, offshoreData, 'b2b', globalBrowser);
        results.push(pdfData);
      } catch (err) {
        errors.push({ report_id: report.report_id, branch_id: report.branch_id, type: 'b2b', error: err.message });
      }
    }

    // Generate Offshore PDF if branch has offshore data
    if (offshoreData.length > 0) {
      try {
        const pdfData = await generateInvoicePDF(report, b2bData, offshoreData, 'offshore', globalBrowser);
        results.push(pdfData);
      } catch (err) {
        errors.push({ report_id: report.report_id, branch_id: report.branch_id, type: 'offshore', error: err.message });
      }
    }

    // If neither, generate combined as fallback
    if (b2bData.length === 0 && offshoreData.length === 0) {
      try {
        const pdfData = await generateInvoicePDF(report, b2bData, offshoreData, 'combined', globalBrowser);
        results.push(pdfData);
      } catch (err) {
        errors.push({ report_id: report.report_id, branch_id: report.branch_id, type: 'combined', error: err.message });
      }
    }
  }

  return { results, errors };
}

// ── PNG EXPORT ─────────────────────────────────────────────────────────────

const sharedPNGStyles = `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Arial', sans-serif;
    background: #FCFCFA;
    color: #001A40;
    padding: 0;
  }
  .card {
    background: #fff;
    border: 1px solid #E5E7EB;
    border-radius: 12px;
    overflow: hidden;
    width: 632px;
  }
  .header {
    background: #001A40;
    padding: 14px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand-text {
    display: flex;
    flex-direction: column;
  }
  .brand-name {
    color: white;
    font-size: 16px;
    font-weight: bold;
    line-height: 1;
  }
  .brand-tag {
    color: #A6DEFF;
    font-size: 10px;
    margin-top: 2px;
  }
  .header-right {
    color: white;
    text-align: right;
    font-size: 11px;
    line-height: 1.4;
  }
  .header-right strong {
    font-size: 12px;
  }
  .accent-line {
    height: 3px;
    background: #FF4040;
  }
  .content {
    padding: 24px;
  }
  .section-title {
    font-size: 15px;
    font-weight: bold;
    color: #001A40;
    border-left: 3px solid #FF4040;
    padding-left: 10px;
    margin-bottom: 4px;
    line-height: 1.2;
  }
  .section-subtitle {
    font-size: 12px;
    color: #6B7280;
    padding-left: 13px;
    margin-bottom: 20px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin-bottom: 20px;
  }
  td, th {
    padding: 10px 12px;
    border-bottom: 1px solid #E5E7EB;
  }
  td:first-child {
    color: #6B7280;
  }
  td.value {
    color: #001A40;
    font-weight: bold;
  }
  td.value.red {
    color: #FF4040;
  }
  .badge-waived {
    background: #FF4040;
    color: white;
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 9px;
    font-weight: bold;
    margin-left: 6px;
  }
  .strikethrough {
    text-decoration: line-through;
    color: #6B7280;
  }
  .totals-bar {
    border-top: 2px solid #FF4040;
    padding-top: 12px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
  }
  .total-label {
    color: #001A40;
    font-weight: bold;
    font-size: 14px;
  }
  .total-value {
    color: #FF4040;
    font-weight: bold;
    font-size: 16px;
  }
  .footer {
    border-top: 1px solid #E5E7EB;
    padding: 14px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10px;
    color: #6B7280;
    background: #fff;
  }
  .footer-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
`;

const logoSvg = `<svg width="28" height="28" viewBox="0 0 102 102" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="90" height="90" rx="21" fill="#FF443F"/>
  <path d="M25 48L51 33L77 48" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M25 64L51 49L77 64" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M39 78L51 71L63 78" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

async function captureCardPNG(htmlContent) {
  let browser = globalBrowser;
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    globalBrowser = browser;
  } else {
    try {
      await browser.pages();
    } catch (_) {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      globalBrowser = browser;
    }
  }

  const page = await browser.newPage();
  await page.setViewport({ width: 680, height: 1, deviceScaleFactor: 2 });
  await page.setContent(htmlContent, { waitUntil: 'load' });
  await page.evaluate(() => document.body.style.padding = '24px');
  const element = await page.$('.card');
  const buffer = await element.screenshot({ type: 'png' });
  await page.close();
  return buffer;
}

function buildPNGHeader(report) {
  return `
  <div class="header">
    <div class="header-brand">
      ${logoSvg}
      <div class="brand-text">
        <span class="brand-name">HOMESÍ</span>
        <span class="brand-tag">Powered by Supreme Lending</span>
      </div>
    </div>
    <div class="header-right">
      <div><strong>${report.branch_name || 'N/A'}</strong></div>
      <div>${report.report_month_display || ''}</div>
    </div>
  </div>
  <div class="accent-line"></div>
  `;
}

function buildPNGFooter() {
  return `
  <div class="footer">
    <div class="footer-left">
      ${logoSvg}
      <span>homesidivision.com &bull; @homesidivision</span>
    </div>
    <div>${logoSvg}</div>
  </div>
  `;
}

async function generateB2bPNG(report, b2bData) {
  if (!b2bData || b2bData.length === 0) return null;

  const monthDisplay = formatMonthDisplay(report.report_month_display);
  const safeBranchId = String(report.branch_id || '').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `HOM_${safeBranchId}_${(monthDisplay || '').replace(/ /g, '_')}_B2B.png`;

  let totalB2B = 0;
  let rowsHtml = '';

  b2bData.forEach((item, idx) => {
    const investment = item.monthly_investment || 0;
    const successFee = item.success_fee || '';
    totalB2B += investment;

    // Add separator if multiple items
    if (idx > 0) {
      rowsHtml += `<tr><td colspan="2" style="background:#FCFCFA;height:12px;"></td></tr>`;
    }

    rowsHtml += `
      <tr><td>Issued to</td><td class="value">${report.branch_manager_name || 'N/A'}</td></tr>
      <tr><td>Branch</td><td class="value">${report.branch_name || 'N/A'}</td></tr>
      <tr><td>Date</td><td class="value">${report.report_month_display || ''}</td></tr>
      <tr><td>Service</td><td class="value">${item.service_name || 'B2B Service'}</td></tr>
      <tr><td>Monthly Investment</td><td class="value red">${formatCurrency(investment)} / month</td></tr>
      <tr><td style="border-bottom:none">Success Fee</td><td class="value" style="border-bottom:none">${successFee}</td></tr>
    `;
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      ${sharedPNGStyles}
    </head>
    <body>
      <div class="card">
        ${buildPNGHeader(report)}
        <div class="content">
          <div class="section-title">Strategic Investment Confirmation</div>
          <div class="section-subtitle">B2B System Engine &middot; Full Package</div>
          <table>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="totals-bar">
            <span class="total-label">B2B Total:</span>
            <span class="total-value">${formatCurrency(totalB2B)}</span>
          </div>
        </div>
        ${buildPNGFooter()}
      </div>
    </body>
    </html>
  `;

  const buffer = await captureCardPNG(html);
  return { buffer, filename, type: 'b2b' };
}

async function generateOffshorePNG(report, offshoreData) {
  if (!offshoreData || offshoreData.length === 0) return null;

  const monthDisplay = formatMonthDisplay(report.report_month_display);
  const safeBranchId = String(report.branch_id || '').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `HOM_${safeBranchId}_${(monthDisplay || '').replace(/ /g, '_')}_Offshore.png`;

  let totalOffshore = 0;
  let totalMarkup = 0;
  let rowsHtml = `
    <tr>
      <th style="text-align:left;color:#6B7280;font-weight:normal">Employee</th>
      <th style="text-align:left;color:#6B7280;font-weight:normal">Role</th>
      <th style="text-align:left;color:#6B7280;font-weight:normal">Direct Salary</th>
      <th style="text-align:left;color:#6B7280;font-weight:normal">Indirect Costs</th>
      <th style="text-align:left;color:#6B7280;font-weight:normal">Markup</th>
      <th style="text-align:left;color:#6B7280;font-weight:normal">Effective Cost</th>
    </tr>
  `;

  offshoreData.forEach(item => {
    const salary = item.mss_direct_salary || 0;
    const costs = item.indirect_costs || 0;
    const markup = item.agency_markup || 0;
    const effectiveCost = salary + costs;
    totalOffshore += effectiveCost;
    totalMarkup += markup;

    rowsHtml += `
      <tr>
        <td class="value" style="color:#6B7280">${item.employee_name || 'N/A'}</td>
        <td class="value">${item.employee_role || 'N/A'}</td>
        <td class="value">${formatCurrency(salary)}</td>
        <td class="value">${formatCurrency(costs)}</td>
        <td class="value">
          <span class="strikethrough">${formatCurrency(markup)}</span>
          <span class="badge-waived">100% WAIVED</span>
        </td>
        <td class="value red">${formatCurrency(effectiveCost)}</td>
      </tr>
    `;
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      ${sharedPNGStyles}
    </head>
    <body>
      <div class="card">
        ${buildPNGHeader(report)}
        <div class="content">
          <div class="section-title">Offshore Services</div>
          <div class="section-subtitle">Branch ${report.branch_id} &middot; All team members</div>
          <table>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="totals-bar">
            <span style="color:#6B7280;font-size:12px;margin-right:auto;">
              Markup Waived: <span class="strikethrough">${formatCurrency(totalMarkup)}</span>
            </span>
            <span class="total-label">Offshore Total:</span>
            <span class="total-value">${formatCurrency(totalOffshore)}</span>
          </div>
        </div>
        ${buildPNGFooter()}
      </div>
    </body>
    </html>
  `;

  const buffer = await captureCardPNG(html);
  return { buffer, filename, type: 'offshore' };
}

module.exports = {
  generateInvoicePDF,
  generateBatchInvoicePDFs,
  generateB2bPNG,
  generateOffshorePNG
};
