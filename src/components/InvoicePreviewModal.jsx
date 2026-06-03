import React, { useState, useEffect } from 'react';

const API = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : '';

export default function InvoicePreviewModal({ invoice, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [invoice]);

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
                <h3>B2B Services</h3>
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th className="text-right">Investment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.b2b.map(item => (
                      <tr key={item.b2b_data_id}>
                        <td>{item.service_name}</td>
                        <td className="text-right">{formatCurrency(item.monthly_investment)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="section-total">
                  <strong>B2B Total:</strong> {formatCurrency(invoice.b2b_total)}
                </div>
              </section>
            )}

            {/* Offshore Services */}
            {details?.offshore && details.offshore.length > 0 && (
              <section className="preview-section">
                <h3>Offshore Services</h3>
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Role</th>
                      <th className="text-right">Direct Salary</th>
                      <th className="text-right">Indirect Costs</th>
                      <th className="text-right">Markup</th>
                      <th className="text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.offshore.map(item => {
                      const subtotal = item.mss_direct_salary + item.indirect_costs + item.agency_markup;
                      return (
                        <tr key={item.offshore_data_id}>
                          <td>{item.employee_name}</td>
                          <td>{item.employee_role}</td>
                          <td className="text-right">{formatCurrency(item.mss_direct_salary)}</td>
                          <td className="text-right">{formatCurrency(item.indirect_costs)}</td>
                          <td className="text-right strikethrough">{formatCurrency(item.agency_markup)}</td>
                          <td className="text-right"><strong>{formatCurrency(subtotal)}</strong></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="section-total">
                  <strong>Offshore Total:</strong> {formatCurrency(invoice.offshore_total)}
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
