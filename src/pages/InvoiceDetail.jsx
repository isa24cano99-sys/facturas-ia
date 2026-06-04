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

  const handleDownloadPDF = () => {
    window.open(`${API}/api/invoices/generate/${report_id}`, '_blank');
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
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/" className="btn btn-secondary">Back</Link>
          <button onClick={handleDownloadPDF} className="btn btn-primary">
            📄 Generate PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ marginBottom: '2rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h4>Branch Information</h4>
          <p><strong>ID:</strong> {report.branch_id}</p>
          <p><strong>Location:</strong> {report.county}, {report.state}</p>
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
