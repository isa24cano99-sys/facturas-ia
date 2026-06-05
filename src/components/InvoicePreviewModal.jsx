import React, { useState, useEffect } from 'react';

const API = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : '';

const fmt = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

// ── B2B Card ────────────────────────────────────────────────────────────────
function B2BCard({ item, onSave, invoice }) {
  const [serviceName, setServiceName] = useState(item.service_name || 'B2B Service');
  const [investment, setInvestment] = useState(item.monthly_investment || 0);
  const [successFee, setSuccessFee] = useState(item.success_fee || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/reports/b2b/${item.b2b_data_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_name: serviceName,
          monthly_investment: Number(investment),
          success_fee: successFee
        })
      });
      if (res.ok) { onSave(); }
      else { alert('Failed to save'); }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '8px 10px',
    borderRadius: '8px', border: '1px solid var(--border)',
    fontSize: '14px', fontFamily: 'Inter, sans-serif',
    color: 'var(--navy)', background: 'var(--offwhite)', outline: 'none'
  };

  const rows = [
    { label: 'Issued to',  value: invoice.branch_manager_name || 'N/A' },
    { label: 'Branch',     value: invoice.branch_name || 'N/A' },
    { label: 'Date',       value: invoice.report_month_display || '' },
    {
      label: 'Service',
      value: <input style={inputStyle} value={serviceName} onChange={e => setServiceName(e.target.value)} />
    },
    {
      label: 'Monthly Investment',
      highlight: true,
      value: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--red)', fontWeight: 700 }}>$</span>
          <input
            type="number"
            style={{ ...inputStyle, width: 130, borderColor: '#FF4040', color: 'var(--red)' }}
            value={investment}
            onChange={e => setInvestment(e.target.value)}
            step="0.01"
          />
        </div>
      )
    },
    {
      label: 'Success Fee',
      value: (
        <input
          style={inputStyle}
          value={successFee}
          onChange={e => setSuccessFee(e.target.value)}
          placeholder="e.g., 25 bps per closed loan"
        />
      )
    },
    {
      label: '',
      value: (
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-sm btn-primary"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      )
    }
  ];

  return <DataCard rows={rows} />;
}

// ── Offshore Card ────────────────────────────────────────────────────────────
function OffshoreCard({ item, invoice }) {
  const salary = item.mss_direct_salary || 0;
  const costs  = item.indirect_costs    || 0;
  const markup = item.agency_markup     || 0;
  const effective = salary + costs;

  const rows = [
    { label: 'Issued to',     value: invoice.branch_manager_name || 'N/A' },
    { label: 'Branch',        value: invoice.branch_name || 'N/A' },
    { label: 'Date',          value: invoice.report_month_display || '' },
    { label: 'Employee',      value: item.employee_name || 'N/A' },
    { label: 'Role',          value: item.employee_role || 'N/A' },
    { label: 'Direct Salary', value: fmt(salary) },
    { label: 'Indirect Costs',value: fmt(costs) },
    {
      label: 'Agency Markup',
      value: (
        <span>
          <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', marginRight: 8 }}>
            {fmt(markup)}
          </span>
          <span className="badge-waived">100% WAIVED</span>
        </span>
      )
    },
    { label: 'Effective Cost', highlight: true, value: fmt(effective) }
  ];

  return <DataCard rows={rows} />;
}

// ── Shared row table card ────────────────────────────────────────────────────
function DataCard({ rows }) {
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 12,
      overflow: 'hidden', marginBottom: '1rem', background: 'var(--bg-card)'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <td style={{
                padding: '12px 18px', color: 'var(--text-muted)',
                width: '35%', borderRight: '1px solid var(--border)',
                fontWeight: 600, fontSize: 13
              }}>
                {row.label}
              </td>
              <td style={{
                padding: '12px 18px',
                fontWeight: 600,
                color: row.highlight ? 'var(--red)' : 'var(--navy)'
              }}>
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function InvoicePreviewModal({ invoice, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = () => {
    if (!invoice) return;
    fetch(`${API}/api/dashboard/invoices/${invoice.invoice_id}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) setDetails(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDetails();
  }, [invoice]);

  if (!invoice) return null;

  const b2bTotal = details?.b2b?.reduce((s, i) => s + i.monthly_investment, 0) || 0;
  const offshoreTotal = details?.offshore?.reduce(
    (s, i) => s + i.mss_direct_salary + i.indirect_costs, 0
  ) || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ─────────────────────────────────── */}
        <div className="modal-header">
          <div>
            <h2>Invoice Preview</h2>
            <p className="modal-subtitle">
              {invoice.report_month_display} &bull; {invoice.branch_name}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading invoice details…
          </div>
        ) : (
          <div className="modal-body">

            {/* ── Branch Info Grid ──────────────────── */}
            <section className="preview-section">
              <h3>Branch Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>ID</label>
                  <p style={{ fontFamily: 'monospace', fontSize: 13 }}>{invoice.branch_id}</p>
                </div>
                <div className="info-item">
                  <label>Name</label>
                  <p>{invoice.branch_name}</p>
                </div>
                <div className="info-item">
                  <label>Location</label>
                  <p>{invoice.branch_name}</p>
                </div>
                <div className="info-item">
                  <label>Manager</label>
                  <p>{invoice.branch_manager_name}</p>
                </div>
                <div className="info-item">
                  <label>Email</label>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{invoice.branch_manager_email}</p>
                </div>
                <div className="info-item">
                  <label>Type</label>
                  <p>
                    <span className={`badge badge-${invoice.invoice_type}`}>
                      {invoice.invoice_type === 'b2b' ? 'B2B'
                       : invoice.invoice_type === 'offshore' ? 'Offshore' : 'Combined'}
                    </span>
                  </p>
                </div>
              </div>
            </section>

            {/* ── B2B Services ─────────────────────── */}
            {details?.b2b && details.b2b.length > 0 && (
              <section className="preview-section">
                <div className="section-title-bar">
                  <h3>B2B Services</h3>
                  <span className="section-title-badge b2b">B2B</span>
                </div>
                {details.b2b.map(item => (
                  <B2BCard key={item.b2b_data_id} item={item} onSave={fetchDetails} invoice={invoice} />
                ))}
                <div className="totals-row">
                  <div className="total-item">
                    <label>B2B Total</label>
                    <span className="amount">{fmt(b2bTotal)}</span>
                  </div>
                </div>
              </section>
            )}

            {/* ── Offshore Services ────────────────── */}
            {details?.offshore && details.offshore.length > 0 && (
              <section className="preview-section">
                <div className="section-title-bar">
                  <h3>Offshore Services</h3>
                  <span className="section-title-badge offshore">Offshore</span>
                </div>
                {details.offshore.map(item => (
                  <OffshoreCard key={item.offshore_data_id} item={item} invoice={invoice} />
                ))}
                <div className="totals-row">
                  <div className="total-item">
                    <label>Offshore Total</label>
                    <span className="amount">{fmt(offshoreTotal)}</span>
                  </div>
                </div>
              </section>
            )}

          </div>
        )}

        {/* ── Footer ─────────────────────────────────── */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>

          {invoice.report_id && (invoice.invoice_type === 'b2b' || invoice.invoice_type === 'combined') && (
            <a
              href={`${API}/api/invoices/generate/${invoice.report_id}?type=b2b`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              ↓ B2B PDF
            </a>
          )}

          {invoice.report_id && (invoice.invoice_type === 'offshore' || invoice.invoice_type === 'combined') && (
            <a
              href={`${API}/api/invoices/generate/${invoice.report_id}?type=offshore`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-accent"
            >
              ↓ Offshore PDF
            </a>
          )}
        </div>

      </div>
    </div>
  );
}
