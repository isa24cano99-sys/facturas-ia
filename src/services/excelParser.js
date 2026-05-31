const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function id(prefix) {
  return prefix + '_' + crypto.randomUUID();
}

async function parseExcelFile(filePath, db) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  const inserted = [];

  for (const row of rows) {

    // EXPECTED COLUMNS (ajustable según tu Excel)
    const branch_id = row.branch_id;
    const branch_name = row.branch_name;
    const manager_name = row.branch_manager_name;
    const manager_email = row.branch_manager_email;

    const report_month_id = row.report_month_id;
    const report_month_display = row.report_month_display;

    const has_b2b = row.has_b2b ? 1 : 0;
    const has_offshore = row.has_offshore ? 1 : 0;

    // 1. BRANCH
    db.prepare(`
      INSERT OR REPLACE INTO branches
      (branch_id, branch_name, branch_manager_name, branch_manager_email)
      VALUES (?, ?, ?, ?)
    `).run(branch_id, branch_name, manager_name, manager_email);

    // 2. REPORT
    const report_id = `${branch_id}_${report_month_id}`;

    db.prepare(`
      INSERT OR REPLACE INTO monthly_reports
      (report_id, branch_id, report_month_id, report_month_display, has_b2b, has_offshore)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(report_id, branch_id, report_month_id, report_month_display, has_b2b, has_offshore);

    // 3. B2B
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

    // 4. OFFSHORE (1 o muchos empleados por fila)
    if (has_offshore && Array.isArray(row.offshore_employees)) {
      for (const emp of row.offshore_employees) {
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

    inserted.push(report_id);
  }

  // limpiar archivo temporal
  fs.unlinkSync(filePath);

  return {
    reports_created: inserted.length,
    report_ids: inserted
  };
}

module.exports = { parseExcelFile };
