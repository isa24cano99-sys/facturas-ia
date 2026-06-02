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

  useEffect(() => {
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
  }, [report_id]);

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
        <div style={{ background: 'rgba(255,255,255,0.5)', padding: '1.5rem', borderRadius: '8px' }}>
          <h4>Branch Information</h4>
          <p><strong>ID:</strong> {report.branch_id}</p>
          <p><strong>Location:</strong> {report.county}, {report.state}</p>
          <p><strong>Manager:</strong> {report.branch_manager_name}</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.5)', padding: '1.5rem', borderRadius: '8px' }}>
          <h4>Summary</h4>
          <p><strong>B2B Services:</strong> {b2b.length}</p>
          <p><strong>Offshore Employees:</strong> {offshore.length}</p>
        </div>
      </div>

      <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', marginBottom: '1rem' }}>B2B Services</h3>
      <div className="table-container" style={{ marginBottom: '2rem' }}>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th className="text-right">Investment</th>
            </tr>
          </thead>
          <tbody>
            {b2b.map(item => (
              <tr key={item.b2b_data_id}>
                <td>{item.service_name}</td>
                <td className="text-right">{formatCurrency(item.monthly_investment)}</td>
              </tr>
            ))}
            {b2b.length === 0 && <tr><td colSpan="2" className="text-center">No B2B services for this month.</td></tr>}
          </tbody>
        </table>
      </div>

      <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Offshore Services</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role</th>
              <th className="text-right">Direct Salary</th>
              <th className="text-right">Indirect Costs</th>
              <th className="text-right">Markup</th>
            </tr>
          </thead>
          <tbody>
            {offshore.map(item => (
              <tr key={item.offshore_data_id}>
                <td>{item.employee_name}</td>
                <td>{item.employee_role}</td>
                <td className="text-right">{formatCurrency(item.mss_direct_salary)}</td>
                <td className="text-right">{formatCurrency(item.indirect_costs)}</td>
                <td className="text-right">{formatCurrency(item.agency_markup)}</td>
              </tr>
            ))}
            {offshore.length === 0 && <tr><td colSpan="5" className="text-center">No offshore services for this month.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
