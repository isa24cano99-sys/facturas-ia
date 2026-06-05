import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatMonthDisplay } from '../utils/formatDate';

const API = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : '';

export default function InvoiceDetail() {
  const { report_id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = () => {
    fetch(`${API}/api/reports/${report_id}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.ok) setData(resData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDetails();
  }, [report_id]);

  const B2BCard = ({ item, onSave, formatCurrency, report }) => {
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
      { label: "Issued to", value: report.branch_manager_name || 'N/A' },
      { label: "Branch", value: `${report.branch_name || ''} · ${report.county || ''}, ${report.state || ''}` },
      { label: "Date", value: report.report_month_display || '' },
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
          <span style={{ color: '#FF4040' }}>$</span>
          <input 
            type="number" 
            value={investment} 
            onChange={e => setInvestment(e.target.value)}
            style={{ width: '120px', padding: '6px', borderRadius: '4px', border: '1px solid #FF4040', color: '#FF4040', fontWeight: 'bold' }}
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
        <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', fontSize: '0.9rem', cursor: 'pointer', borderRadius: '4px', border: 'none', background: 'var(--red)', color: '#fff', fontWeight: '600' }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      ) }
    ];

    return (
      <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", marginBottom: '1.5rem', background: 'var(--bg-card)' }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td style={{ padding: "14px 20px", color: "var(--text-muted)", width: "35%", borderRight: "1px solid var(--border)" }}>{row.label}</td>
                <td style={{ padding: "14px 20px", fontWeight: 600, color: row.highlight ? "var(--red)" : "var(--navy)" }}>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const OffshoreCard = ({ item, formatCurrency, report }) => {
    const subtotal = item.mss_direct_salary + item.indirect_costs + item.agency_markup;
    const rows = [
      { label: "Issued to", value: report.branch_manager_name || 'N/A' },
      { label: "Branch", value: `${report.branch_name || ''} · ${report.county || ''}, ${report.state || ''}` },
      { label: "Date", value: report.report_month_display || '' },
      { label: "Employee", value: item.employee_name || 'N/A' },
      { label: "Role", value: item.employee_role || 'N/A' },
      { label: "Direct Salary", value: formatCurrency(item.mss_direct_salary) },
      { label: "Indirect Costs", value: formatCurrency(item.indirect_costs) },
      { label: "Agency Markup", value: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="strikethrough" style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{formatCurrency(item.agency_markup)}</span>
          <span className="badge-waived" style={{ backgroundColor: 'var(--red)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}>100% WAIVED</span>
        </div>
      ) },
      { label: "Effective Cost", highlight: true, value: formatCurrency(subtotal) },
    ];

    return (
      <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", marginBottom: '1.5rem', background: 'var(--bg-card)' }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td style={{ padding: "14px 20px", color: "var(--text-muted)", width: "35%", borderRight: "1px solid var(--border)" }}>{row.label}</td>
                <td style={{ padding: "14px 20px", fontWeight: 600, color: row.highlight ? "var(--red)" : "var(--navy)" }}>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const handleDownloadPDF = (type) => {
    window.open(`${API}/api/invoices/generate/${report_id}?type=${type}`, '_blank');
  };

  const handleDownloadPNG = (type) => {
    window.open(`${API}/api/invoices/generate-png/${report_id}?type=${type}`, '_blank');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (loading) return <div className="glass-panel" style={{ padding: '2rem' }}>Loading invoice data...</div>;
  if (!data || !data.report) return <div className="glass-panel" style={{ padding: '2rem' }}>Invoice not found.</div>;

  const { report, b2b, offshore } = data;

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Invoice Details</h2>
          <p style={{ color: 'var(--text-muted)' }}>{formatMonthDisplay(report.report_month_display)} - {report.branch_name}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-secondary" style={{ padding: '0.6rem 1rem' }}>Back</Link>
          
          <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '0.6rem 1rem', background: 'var(--primary-color)', borderRight: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>B2B</div>
            <button onClick={() => handleDownloadPDF('b2b')} className="btn btn-primary" style={{ borderRadius: 0, border: 'none', padding: '0.6rem 1rem' }}>
              PDF
            </button>
            <button onClick={() => handleDownloadPNG('b2b')} className="btn btn-primary" style={{ borderRadius: 0, border: 'none', borderLeft: '1px solid rgba(255,255,255,0.2)', padding: '0.6rem 1rem' }}>
              PNG
            </button>
          </div>

          <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '0.6rem 1rem', background: '#e0a816', color: '#001A40', borderRight: '1px solid rgba(255,255,255,0.2)', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>Offshore</div>
            <button onClick={() => handleDownloadPDF('offshore')} className="btn btn-accent" style={{ borderRadius: 0, border: 'none', padding: '0.6rem 1rem' }}>
              PDF
            </button>
            <button onClick={() => handleDownloadPNG('offshore')} className="btn btn-accent" style={{ borderRadius: 0, border: 'none', borderLeft: '1px solid rgba(0,26,64,0.1)', padding: '0.6rem 1rem' }}>
              PNG
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ marginBottom: '2rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h4>Branch Information</h4>
          <p><strong>ID:</strong> {report.branch_id}</p>
          <p><strong>Location:</strong> {report.branch_name}</p>
          <p><strong>Manager:</strong> {report.branch_manager_name}</p>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h4>Summary</h4>
          <p><strong>B2B Services:</strong> {b2b.length}</p>
          <p><strong>Offshore Employees:</strong> {offshore.length}</p>
        </div>
      </div>

      <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>B2B Services</h3>
      <div className="b2b-container" style={{ marginBottom: '2rem' }}>
        {b2b.map(item => (
          <B2BCard key={item.b2b_data_id} item={item} onSave={fetchDetails} formatCurrency={formatCurrency} report={report} />
        ))}
        {b2b.length === 0 && <p className="text-center" style={{ padding: '1rem' }}>No B2B services for this month.</p>}
      </div>

      <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Offshore Services</h3>
      <div className="offshore-container" style={{ marginBottom: '2rem' }}>
        {offshore.map(item => (
          <OffshoreCard key={item.offshore_data_id} item={item} formatCurrency={formatCurrency} report={report} />
        ))}
        {offshore.length === 0 && <p className="text-center" style={{ padding: '1rem' }}>No offshore services for this month.</p>}
      </div>
    </div>
  );
}
