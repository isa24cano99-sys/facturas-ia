import React, { useState, useEffect } from 'react';

const API = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : '';

export default function InvoiceList({ month, onSelectInvoice, refreshTrigger }) {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    if (!month) return;
    setLoading(true);

    const params = new URLSearchParams({ month, search, type: typeFilter });

    Promise.all([
      fetch(`${API}/api/dashboard/invoices?${params}`).then(r => r.json()),
      fetch(`${API}/api/dashboard/stats?month=${month}`).then(r => r.json())
    ])
      .then(([invoicesData, statsData]) => {
        if (invoicesData.ok) setInvoices(invoicesData.invoices);
        if (statsData.ok) setStats(statsData.stats);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [month, search, typeFilter, refreshTrigger]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  return (
    <div className="invoice-list-container">

      {/* ── Stat Cards ───────────────────────────────────── */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card total">
            <h3>Total Invoices</h3>
            <p className="stat-value">{stats.total_invoices}</p>
          </div>
          <div className="stat-card b2b">
            <h3>B2B Only</h3>
            <p className="stat-value">{stats.b2b_only}</p>
          </div>
          <div className="stat-card offshore">
            <h3>Offshore Only</h3>
            <p className="stat-value">{stats.offshore_only}</p>
          </div>
          <div className="stat-card combined">
            <h3>Combined</h3>
            <p className="stat-value">{stats.combined}</p>
          </div>
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────── */}
      <div className="filters-bar">
        <input
          type="text"
          placeholder="Search by branch or manager…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Types</option>
          <option value="b2b">B2B Only</option>
          <option value="offshore">Offshore Only</option>
          <option value="combined">Combined</option>
        </select>

        {month && (
          <a
            href={`${API}/api/invoices/generate-batch/${month}`}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            ↓ Download All (ZIP)
          </a>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading invoices…
        </div>
      ) : invoices.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '3rem',
          background: 'var(--white)',
          border: 'var(--border-card)',
          borderRadius: 'var(--radius-card)',
          color: 'var(--text-muted)'
        }}>
          No invoices found for the selected criteria.
        </div>
      ) : (
        <div className="invoices-table-container">
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Branch ID</th>
                <th>Branch Name</th>
                <th>Location</th>
                <th>Manager</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => (
                <tr key={invoice.invoice_id}>
                  <td className="mono">{invoice.branch_id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{invoice.branch_name}</td>
                  <td>{invoice.branch_name}</td>
                  <td>{invoice.branch_manager_name}</td>
                  <td>
                    <span className={`badge badge-${invoice.invoice_type}`}>
                      {invoice.invoice_type === 'b2b'
                        ? 'B2B'
                        : invoice.invoice_type === 'offshore'
                        ? 'Offshore'
                        : 'Combined'}
                    </span>
                  </td>
                  <td className="text-right">{formatCurrency(invoice.grand_total)}</td>
                  <td>
                    <div className="action-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '140px' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => onSelectInvoice(invoice)}
                        style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '6px' }}
                      >
                        Preview
                      </button>

                      {(invoice.invoice_type === 'b2b' || invoice.invoice_type === 'combined') && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <a
                            href={`${API}/api/invoices/generate/${invoice.report_id}?type=b2b`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-primary"
                            title="Download B2B PDF"
                            style={{ flex: 1, padding: '4px', fontSize: '11px', textAlign: 'center' }}
                          >
                            B2B PDF
                          </a>
                          <a
                            href={`${API}/api/invoices/generate-png/${invoice.report_id}?type=b2b`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-primary"
                            title="Download B2B PNG"
                            style={{ flex: 1, padding: '4px', fontSize: '11px', textAlign: 'center' }}
                          >
                            B2B PNG
                          </a>
                        </div>
                      )}

                      {(invoice.invoice_type === 'offshore' || invoice.invoice_type === 'combined') && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <a
                            href={`${API}/api/invoices/generate/${invoice.report_id}?type=offshore`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-accent"
                            title="Download Offshore PDF"
                            style={{ flex: 1, padding: '4px', fontSize: '11px', textAlign: 'center' }}
                          >
                            Off PDF
                          </a>
                          <a
                            href={`${API}/api/invoices/generate-png/${invoice.report_id}?type=offshore`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-accent"
                            title="Download Offshore PNG"
                            style={{ flex: 1, padding: '4px', fontSize: '11px', textAlign: 'center' }}
                          >
                            Off PNG
                          </a>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
