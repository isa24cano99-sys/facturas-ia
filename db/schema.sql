-- =========================
-- TABLE: branches
-- =========================
CREATE TABLE IF NOT EXISTS branches (
  branch_id TEXT PRIMARY KEY,
  branch_name TEXT NOT NULL,
  branch_manager_name TEXT NOT NULL,
  branch_manager_email TEXT
);

-- =========================
-- TABLE: monthly_reports
-- =========================
CREATE TABLE IF NOT EXISTS monthly_reports (
  report_id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  report_month_id TEXT NOT NULL,
  report_month_display TEXT NOT NULL,

  has_b2b INTEGER DEFAULT 0,
  has_offshore INTEGER DEFAULT 0,

  FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_month
ON monthly_reports(report_month_id);

-- =========================
-- TABLE: b2b_services_data
-- =========================
CREATE TABLE IF NOT EXISTS b2b_services_data (
  b2b_data_id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,

  b2b_service_name TEXT DEFAULT 'B2B Strategy',
  b2b_monthly_fee REAL NOT NULL,

  FOREIGN KEY (report_id) REFERENCES monthly_reports(report_id)
);

CREATE INDEX IF NOT EXISTS idx_b2b_report
ON b2b_services_data(report_id);

-- =========================
-- TABLE: offshore_services_data
-- =========================
CREATE TABLE IF NOT EXISTS offshore_services_data (
  offshore_data_id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,

  offshore_service_name TEXT DEFAULT 'Offshore Hiring',

  talent_name TEXT NOT NULL,
  talent_role TEXT NOT NULL,

  mss_direct_salary REAL NOT NULL,
  indirect_costs REAL NOT NULL,
  agency_markup REAL DEFAULT 0.20,

  is_markup_waived INTEGER DEFAULT 1,

  FOREIGN KEY (report_id) REFERENCES monthly_reports(report_id)
);

CREATE INDEX IF NOT EXISTS idx_offshore_report
ON offshore_services_data(report_id);
