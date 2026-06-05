import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import InvoiceList from '../components/InvoiceList';
import InvoicePreviewModal from '../components/InvoicePreviewModal';
import FileUploader from '../components/FileUploader';

const API = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : '';

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Import Flow States
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [importStatus, setImportStatus] = useState('IDLE');
  const [globalError, setGlobalError] = useState(null);

  const handleFileSelect = async (selectedFile) => {
    setFile(selectedFile);
    setImportStatus('PREVIEWING');
    setGlobalError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${API}/api/import/preview`, { method: 'POST', body: formData });
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
      const res = await fetch(`${API}/api/import/confirm`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Import failed');
      setImportStatus('SUCCESS');
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
        handleCancel();
      }, 1500);
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
    setShowUploadModal(false);
  };

  // ── Loading spinner inline ──────────────────────────────
  const Spinner = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '0.5rem 0' }}>
      <svg style={{ animation: 'spin 1s linear infinite', width: 22, height: 22, color: 'var(--red)' }}
           xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path style={{ opacity: 0.85 }} fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  );

  return (
    <div className="dashboard-layout">
      <Sidebar
        onMonthSelect={setSelectedMonth}
        selectedMonth={selectedMonth}
        refreshTrigger={refreshTrigger}
      />

      <main className="dashboard-main">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="dashboard-header">
          <div>
            <h1>Invoice Dashboard</h1>
            <p className="dashboard-subtitle">Manage and download monthly branch invoices</p>
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setShowUploadModal(true)}
          >
            ↑ Upload Excel
          </button>
        </div>

        {/* ── Upload Modal ────────────────────────────────── */}
        {showUploadModal && (
          <div className="modal-overlay" onClick={handleCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>

              <div className="modal-header">
                <div>
                  <h2>Import Invoice Data</h2>
                  <p className="modal-subtitle">Upload your monthly Excel report</p>
                </div>
                <button className="modal-close" onClick={handleCancel}>✕</button>
              </div>

              <div className="modal-body">

                {/* IDLE — show dropzone */}
                {importStatus === 'IDLE' && (
                  <>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '15px' }}>
                      Drop your Excel file to automatically generate invoices for all branches.
                    </p>
                    <FileUploader onFileSelect={handleFileSelect} />
                  </>
                )}

                {/* PREVIEWING */}
                {importStatus === 'PREVIEWING' && (
                  <div className="upload-status">
                    <Spinner />
                    <h3 style={{ marginTop: '1.25rem' }}>Analyzing Excel File…</h3>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      Running validations across all sheets.
                    </p>
                  </div>
                )}

                {/* IMPORTING */}
                {importStatus === 'IMPORTING' && (
                  <div className="upload-status">
                    <Spinner />
                    <h3 style={{ marginTop: '1.25rem' }}>Saving Data & Generating Invoices…</h3>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      Writing records securely to the database.
                    </p>
                  </div>
                )}

                {/* SUCCESS */}
                {importStatus === 'SUCCESS' && (
                  <div className="upload-status">
                    <div style={{ fontSize: '3rem' }}>✅</div>
                    <h3 style={{ color: '#166534', marginTop: '1rem' }}>Import Successful!</h3>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      Excel data and invoices have been loaded. The dashboard will refresh automatically.
                    </p>
                  </div>
                )}

                {/* ERROR */}
                {importStatus === 'ERROR' && (
                  <div className="upload-error">
                    <h3 style={{ color: 'var(--red)', marginBottom: '0.5rem' }}>Import Error</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{globalError}</p>
                  </div>
                )}

                {/* PREVIEW */}
                {importStatus === 'PREVIEW' && previewData && (
                  <div>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--navy)' }}>Import Preview</h3>
                    <div className="upload-preview-stats">
                      <p><strong>Branches:</strong> {previewData.stats.branches} ({previewData.stats.newBranches} new)</p>
                      <p><strong>Reports:</strong> {previewData.stats.reports}</p>
                      <p><strong>B2B Entries:</strong> {previewData.stats.b2b_entries}</p>
                      <p><strong>Offshore Entries:</strong> {previewData.stats.offshore_entries}</p>
                    </div>

                    {previewData.hasErrors && (
                      <div className="upload-error" style={{ marginTop: '1rem' }}>
                        <h4 style={{ color: 'var(--red)', marginBottom: '0.5rem' }}>Validation Issues Found</h4>
                        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                          {previewData.errors.slice(0, 5).map((err, i) => (
                            <li key={i} style={{ fontSize: '13px', color: 'var(--red)' }}>{err.message}</li>
                          ))}
                          {previewData.errors.length > 5 && (
                            <li style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                              … and {previewData.errors.length - 5} more
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="modal-footer">
                {(importStatus === 'IDLE' || importStatus === 'ERROR') && (
                  <button className="btn btn-secondary" onClick={handleCancel}>Close</button>
                )}
                {importStatus === 'SUCCESS' && (
                  <button className="btn btn-primary" onClick={handleCancel}>Done</button>
                )}
                {importStatus === 'PREVIEW' && (
                  <>
                    <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
                    <button
                      className="btn btn-primary"
                      onClick={handleConfirmImport}
                      disabled={previewData.hasErrors}
                      style={{
                        opacity: previewData.hasErrors ? 0.45 : 1,
                        cursor: previewData.hasErrors ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Confirm & Import
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ── Invoice List / Empty State ──────────────────── */}
        {selectedMonth ? (
          <InvoiceList
            month={selectedMonth}
            onSelectInvoice={setSelectedInvoice}
            refreshTrigger={refreshTrigger}
          />
        ) : (
          <div style={{
            background: 'var(--white)',
            border: 'var(--border-card)',
            borderRadius: 'var(--radius-card)',
            padding: '4rem 2rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-card)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <h3 style={{ color: 'var(--navy)', marginBottom: '0.5rem' }}>Select a period</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Choose a month from the left sidebar to view its invoices
            </p>
          </div>
        )}
      </main>

      {/* Preview Modal */}
      {selectedInvoice && (
        <InvoicePreviewModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
