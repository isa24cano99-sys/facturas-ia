import React, { useState, useEffect } from 'react';

const API = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : '';

export default function InvoicePreviewModal({ invoice, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = () => {
    if (!invoice) return;
    fetch(`${API}/api/dashboard/invoices/${invoice.invoice_id}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setDetails(data);
        }
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

  const B2BCard = ({ item, onSave, formatCurrency, invoice }) => {
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
        if (res.ok) {
          onSave(); 
        } else {
          alert('Failed to save');
        }
      } catch (e) {
        console.error(e);
        alert('Error saving');
      } finally {
        setSaving(false);
      }
    };

    const rows = [
      { label: "Issued to", value: invoice.branch_manager_name || 'N/A' },
      { label: "Branch", value: `${invoice.branch_name || ''} · ${invoice.county || ''}, ${invoice.state || ''}` },
      { label: "Date", value: invoice.report_month_display || '' },
      { label: "Service", value: (
        <input 
          type="text" 
          value={serviceName} 
          onChange={e => setServiceName(e.target.value)}
          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      ) },
      { label: "Monthly Investment", highlight: true, value: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#d44f1e' }}>$</span>
          <input 
            type="number" 
            value={investment} 
            onChange={e => setInvestment(e.target.value)}
            style={{ width: '120px', padding: '6px', borderRadius: '4px', border: '1px solid #d44f1e', color: '#d44f1e', fontWeight: 'bold' }}
            step="0.01"
          />
        </div>
      ) },
      { label: "Success Fee", value: (
        <input 
          type="text" 
          value={successFee} 
          onChange={e => setSuccessFee(e.target.value)}
          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
          placeholder="e.g., 25 bps per closed loan originated from portfolio"
        />
      ) },
      { label: "", value: (
        <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', fontSize: '0.9rem', cursor: 'pointer', borderRadius: '4px', border: 'none', background: '#1C3F73', color: '#fff', fontWeight: '600' }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      ) }
    ];

    return (
      <div style={{ border: "1px solid #e0e0e0", borderRadius: "8px", overflow: "hidden", marginBottom: '1.5rem', background: '#fff' }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid #e0e0e0" : "none" }}>
                <td style={{ padding: "14px 20px", color: "#888", width: "35%", borderRight: "1px solid #e0e0e0" }}>{row.label}</td>
                <td style={{ padding: "14px 20px", fontWeight: 600, color: row.highlight ? "#ef4444" : "#1C3F73" }}>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const OffshoreCard = ({ item, formatCurrency, invoice }) => {
    const subtotal = item.mss_direct_salary + item.indirect_costs + item.agency_markup;
    const rows = [
      { label: "Issued to", value: invoice.branch_manager_name || 'N/A' },
      { label: "Branch", value: `${invoice.branch_name || ''} · ${invoice.county || ''}, ${invoice.state || ''}` },
      { label: "Date", value: invoice.report_month_display || '' },
      { label: "Employee", value: item.employee_name || 'N/A' },
      { label: "Role", value: item.employee_role || 'N/A' },
      { label: "Direct Salary", value: formatCurrency(item.mss_direct_salary) },
      { label: "Indirect Costs", value: formatCurrency(item.indirect_costs) },
      { label: "Agency Markup", value: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="strikethrough" style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{formatCurrency(item.agency_markup)}</span>
          <span className="badge-waived" style={{ backgroundColor: '#22c55e', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}>100% WAIVED</span>
        </div>
      ) },
      { label: "Effective Cost", highlight: true, value: formatCurrency(subtotal) },
    ];

    return (
      <div style={{ border: "1px solid #e0e0e0", borderRadius: "8px", overflow: "hidden", marginBottom: '1.5rem', background: '#fff' }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid #e0e0e0" : "none" }}>
                <td style={{ padding: "14px 20px", color: "#888", width: "35%", borderRight: "1px solid #e0e0e0" }}>{row.label}</td>
                <td style={{ padding: "14px 20px", fontWeight: 600, color: row.highlight ? "#ef4444" : "#1C3F73" }}>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  if (!invoice) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2>Invoice Preview</h2>
            <p className="modal-subtitle">{invoice.report_month_display} • {invoice.branch_name}</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading invoice details...</p>
          </div>
        ) : (
          <div className="modal-body">
            {/* Branch Info */}
            <section className="preview-section">
              <h3>Branch Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>ID</label>
                  <p className="mono">{invoice.branch_id}</p>
                </div>
                <div className="info-item">
                  <label>Name</label>
                  <p>{invoice.branch_name}</p>
                </div>
                <div className="info-item">
                  <label>Location</label>
                  <p>{invoice.county}, {invoice.state}</p>
                </div>
                <div className="info-item">
                  <label>Manager</label>
                  <p>{invoice.branch_manager_name}</p>
                </div>
                <div className="info-item">
                  <label>Email</label>
                  <p className="mono">{invoice.branch_manager_email}</p>
                </div>
                <div className="info-item">
                  <label>Type</label>
                  <p>
                    <span className={`badge badge-${invoice.invoice_type}`}>
                      {invoice.invoice_type === 'b2b' ? 'B2B' : invoice.invoice_type === 'offshore' ? 'Offshore' : 'Combined'}
                    </span>
                  </p>
                </div>
              </div>
            </section>

            {/* B2B Services */}
            {details?.b2b && details.b2b.length > 0 && (
              <section className="preview-section">
                <h3 style={{ marginBottom: '1rem' }}>B2B Services</h3>
                {details.b2b.map(item => (
                  <B2BCard key={item.b2b_data_id} item={item} onSave={fetchDetails} formatCurrency={formatCurrency} invoice={invoice} />
                ))}
                <div className="section-total">
                  <strong>B2B Total:</strong> {formatCurrency(details.b2b.reduce((sum, item) => sum + item.monthly_investment, 0))}
                </div>
              </section>
            )}

            {/* Offshore Services */}
            {details?.offshore && details.offshore.length > 0 && (
              <section className="preview-section">
                <h3 style={{ marginBottom: '1rem' }}>Offshore Services</h3>
                {details.offshore.map(item => (
                  <OffshoreCard key={item.offshore_data_id} item={item} formatCurrency={formatCurrency} invoice={invoice} />
                ))}
                <div className="section-total">
                  <strong>Offshore Total:</strong> {formatCurrency(details.offshore.reduce((sum, item) => sum + item.mss_direct_salary + item.indirect_costs + item.agency_markup, 0))}
                </div>
              </section>
            )}

            {/* Grand Total */}
            <section className="preview-section grand-total-section">
              <div className="grand-total">
                <h3>Grand Total</h3>
                <p className="grand-total-amount">{formatCurrency(invoice.grand_total)}</p>
              </div>
            </section>
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          {invoice.report_id && (
            <a 
              href={`${API}/api/invoices/generate/${invoice.report_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Download PDF
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
