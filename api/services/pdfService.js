const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generateInvoicePDF(report, b2bData, offshoreData) {
  // Read HTML template
  const templatePath = path.join(__dirname, '..', 'templates', 'invoice.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Calculate totals
  let totalB2B = 0;
  let b2bHtmlRows = '';
  if (b2bData && b2bData.length > 0) {
    b2bData.forEach(item => {
      totalB2B += item.monthly_investment;
      b2bHtmlRows += `
        <tr>
          <td>${item.service_name}</td>
          <td class="text-right">${formatCurrency(item.monthly_investment)}</td>
        </tr>
      `;
    });
  }

  let totalOffshore = 0;
  let offshoreHtmlRows = '';
  if (offshoreData && offshoreData.length > 0) {
    offshoreData.forEach(item => {
      const subtotal = item.mss_direct_salary + item.indirect_costs + item.agency_markup;
      totalOffshore += subtotal;
      offshoreHtmlRows += `
        <tr>
          <td>${item.employee_name} <br><small>${item.employee_role}</small></td>
          <td class="text-right">${formatCurrency(item.mss_direct_salary)}</td>
          <td class="text-right">${formatCurrency(item.indirect_costs)}</td>
          <td class="text-right">${formatCurrency(item.agency_markup)}</td>
          <td class="text-right">${formatCurrency(subtotal)}</td>
        </tr>
      `;
    });
  }

  const grandTotal = totalB2B + totalOffshore;

  // Format Month Display
  const formatMonthDisplay = (val) => {
    if (!val || typeof val !== 'string') return val;
    const parts = val.split('-');
    if (parts.length !== 2) return val;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNum = parseInt(parts[1], 10);
    return monthNum >= 1 && monthNum <= 12 ? `${months[monthNum - 1]} ${parts[0]}` : val;
  };

  // Replace placeholders in HTML
  html = html.replace('{{BRANCH_NAME}}', report.branch_name || 'N/A');
  html = html.replace('{{BRANCH_MANAGER}}', report.branch_manager_name || 'N/A');
  html = html.replace('{{COUNTY}}', report.county || 'N/A');
  html = html.replace('{{STATE}}', report.state || 'N/A');
  html = html.replace('{{MONTH}}', formatMonthDisplay(report.report_month_display) || 'N/A');

  
  html = html.replace('{{B2B_ROWS}}', b2bHtmlRows || '<tr><td colspan="2" class="text-center">No B2B Services</td></tr>');
  html = html.replace('{{OFFSHORE_ROWS}}', offshoreHtmlRows || '<tr><td colspan="5" class="text-center">No Offshore Services</td></tr>');
  
  html = html.replace('{{TOTAL_B2B}}', formatCurrency(totalB2B));
  html = html.replace('{{TOTAL_OFFSHORE}}', formatCurrency(totalOffshore));
  html = html.replace('{{GRAND_TOTAL}}', formatCurrency(grandTotal));

  // Generate PDF with Puppeteer
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  const pdfBuffer = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' }
  });

  await browser.close();

  return pdfBuffer;
}

module.exports = {
  generateInvoicePDF
};
