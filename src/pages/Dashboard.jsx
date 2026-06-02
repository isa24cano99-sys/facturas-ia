import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FileUploader from '../components/FileUploader';
import { formatMonthDisplay } from '../utils/formatDate';

const API = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : '';

export default function Dashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Import Flow States
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [importStatus, setImportStatus] = useState('IDLE'); // IDLE, PREVIEWING, PREVIEW, IMPORTING, SUCCESS, ERROR
  const [globalError, setGlobalError] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/reports`);
      const data = await res.json();
      if (data.ok) setReports(data.reports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleFileSelect = async (selectedFile) => {
    setFile(selectedFile);
    setImportStatus('PREVIEWING');
    setGlobalError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${API}/api/import/preview`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (!data.ok) throw new Error(data.error || 'Preview failed');
      
      setPreviewData(data);
      setImportStatus('PREVIEW');
    } catch (err) {
      setGlobalError(err.message);
      setImportStatus('ERROR');
    }
  };

  const handleConfirmImport = async () => {
    setImportStatus('IMPORTING');
    setGlobalError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API}/api/import/confirm`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (!data.ok) throw new Error(data.error || 'Import failed');
      
      setImportStatus('SUCCESS');
      fetchReports();
    } catch (err) {
      setGlobalError(err.message);
      setImportStatus('ERROR');
    }
  };

  const handleCancel = () => {
    setFile(null);
    setPreviewData(null);
    setImportStatus('IDLE');
    setGlobalError(null);
  };

  return (
    <div className="grid">
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2>Import Data</h2>
        
        {importStatus === 'IDLE' && (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Upload your monthly Excel report to generate invoices automatically.</p>
            <FileUploader onFileSelect={handleFileSelect} />
          </>
        )}

        {importStatus === 'PREVIEWING' && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h3>Analyzing Excel File...</h3>
            <p style={{ color: 'var(--text-muted)' }}>Running validations across all sheets.</p>
          </div>
        )}

        {importStatus === 'IMPORTING' && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h3>Saving Data...</h3>
            <p style={{ color: 'var(--text-muted)' }}>Writing records securely to the database.</p>
          </div>
        )}

        {importStatus === 'SUCCESS' && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h3 style={{ color: '#166534' }}>Import Successful!</h3>
            <p style={{ marginBottom: '1.5rem' }}>The Excel data has been fully loaded.</p>
            <button className="btn btn-primary" onClick={handleCancel}>Import Another File</button>
          </div>
        )}

        {importStatus === 'ERROR' && (
          <div style={{ padding: '2rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
            <h3 style={{ color: '#b91c1c' }}>System Error</h3>
            <p>{globalError}</p>
            <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={handleCancel}>Try Again</button>
          </div>
        )}

        {importStatus === 'PREVIEW' && previewData && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Import Preview</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleConfirmImport}
                  disabled={previewData.hasErrors}
                  style={{ opacity: previewData.hasErrors ? 0.5 : 1, cursor: previewData.hasErrors ? 'not-allowed' : 'pointer' }}
                >
                  Confirm Import
                </button>
              </div>
            </div>

            {previewData.hasErrors && (
              <div style={{ padding: '1.5rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '1.5rem' }}>
                <h4 style={{ color: '#b91c1c', marginTop: 0 }}>Validation Errors ({previewData.errors.length})</h4>
                <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Please fix these errors in your Excel file and upload again. Import is disabled until errors are resolved.</p>
                <ul style={{ paddingLeft: '1.5rem', fontSize: '0.9rem', color: '#7f1d1d', margin: 0, maxHeight: '200px', overflowY: 'auto' }}>
                  {previewData.errors.map((err, i) => (
                    <li key={i} style={{ marginBottom: '0.5rem' }}>
                      {err.type === 'fatal' ? 
                        <strong>[FATAL] {err.message}</strong> : 
                        <span><strong>Sheet '{err.sheet}' (Row {err.row}):</strong> {err.message}</span>
                      }
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0, color: 'var(--text-muted)' }}>Branches</h4>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{previewData.stats.branches}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span style={{ color: '#166534' }}>{previewData.stats.newBranches} New</span> • 
                  <span style={{ color: '#0369a1' }}> {previewData.stats.updatedBranches} Updated</span>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0, color: 'var(--text-muted)' }}>Invoices to Generate</h4>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{previewData.stats.reports}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Unique Branch + Month combos</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0, color: 'var(--text-muted)' }}>B2B Records</h4>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{previewData.stats.b2b_entries}</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0, color: 'var(--text-muted)' }}>Offshore Employees</h4>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{previewData.stats.offshore_entries}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2>Recent Reports</h2>
        {loading ? <p>Loading...</p> : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Branch</th>
                  <th>Manager</th>
                  <th>Services</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.report_id}>
                    <td>{formatMonthDisplay(r.report_month_display)}</td>
                    <td>{r.branch_name}</td>
                    <td>{r.branch_manager_name}</td>
                    <td>
                      {r.has_b2b === 1 && <span className="badge badge-success" style={{marginRight: 5}}>B2B</span>}
                      {r.has_offshore === 1 && <span className="badge badge-warning">Offshore</span>}
                    </td>
                    <td>
                      <Link to={`/invoice/${r.report_id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
                        View Invoice
                      </Link>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center">No reports generated yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
