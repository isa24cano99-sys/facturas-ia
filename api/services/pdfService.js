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

  b2bData.forEach(function(item) {
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
  let rows = '';

  offshoreData.forEach(function(item) {
    const salary = item.mss_direct_salary || 0;
    const costs = item.indirect_costs || 0;
    const markup = item.agency_markup || 0;
    const effectiveCost = salary + costs;
    totalOffshore += effectiveCost;
    totalMarkup += markup;

    rows += '<div class="data-card">';
    rows += '<table>';
    rows += '<tbody>';
    rows += '<tr><td class="cell-label">Issued to</td><td class="cell-value">' + (report.branch_manager_name || 'N/A') + '</td></tr>';
    rows += '<tr><td class="cell-label">Branch</td><td class="cell-value">' + (report.branch_name || 'N/A') + '</td></tr>';
    rows += '<tr><td class="cell-label">Date</td><td class="cell-value">' + (report.report_month_display || '') + '</td></tr>';
    rows += '<tr><td class="cell-label">Employee</td><td class="cell-value">' + (item.employee_name || 'N/A') + '</td></tr>';
    rows += '<tr><td class="cell-label">Role</td><td class="cell-value">' + (item.employee_role || 'N/A') + '</td></tr>';
    rows += '<tr><td class="cell-label">Direct Salary</td><td class="cell-value">' + formatCur(salary) + '</td></tr>';
    rows += '<tr><td class="cell-label">Indirect Costs</td><td class="cell-value">' + formatCur(costs) + '</td></tr>';
    rows += '<tr><td class="cell-label">Agency Markup</td><td class="cell-value">'
      + '<span class="strikethrough">' + formatCur(markup) + '</span>'
      + '<span class="badge-waived">100% WAIVED</span>'
      + '</td></tr>';
    rows += '<tr><td class="cell-label">Effective Cost</td><td class="cell-value accent">' + formatCur(effectiveCost) + '</td></tr>';
    rows += '</tbody></table></div>';
  });

  const section = '<div class="section-header">'
    + '<h2>Offshore Services</h2>'
    + '<div class="section-subtitle">Dedicated Talent Acquisition &amp; Management</div>'
    + '</div>'
    + rows
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

module.exports = {
  generateInvoicePDF,
  generateBatchInvoicePDFs
};
