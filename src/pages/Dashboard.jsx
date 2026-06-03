import React, { useState, useEffect } from 'react';
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
  
  // Import Flow States
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [importStatus, setImportStatus] = useState('IDLE'); // IDLE, PREVIEWING, PREVIEW, IMPORTING, SUCCESS, ERROR
  const [globalError, setGlobalError] = useState(null);

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
      // Refresh invoices by resetting month selection
      setTimeout(() => {
        setSelectedMonth(null);
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

  return (
    <div className="dashboard-layout">
      {/* Sidebar con meses */}
      <Sidebar onMonthSelect={setSelectedMonth} selectedMonth={selectedMonth} />

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1>Invoice Dashboard</h1>
            <p className="dashboard-subtitle">Manage and view all your invoices</p>
          </div>
          <button 
            className="btn btn-primary btn-lg"
            onClick={() => setShowUploadModal(true)}
          >
            Upload Excel
          </button>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="modal-overlay" onClick={handleCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Import Invoice Data</h2>
                <button className="modal-close" onClick={handleCancel}>✕</button>
              </div>

              <div className="modal-body">
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
                    <h3>Saving Data & Generating Invoices...</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Writing records securely to the database.</p>
                  </div>
                )}

                {importStatus === 'SUCCESS' && (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#166534', marginBottom: '1rem' }}>Success!</div>
                    <h3 style={{ color: '#166534' }}>Import Successful</h3>
                    <p style={{ marginBottom: '1.5rem' }}>Excel data and invoices have been loaded.</p>
                  </div>
                )}

                {importStatus === 'ERROR' && (
                  <div style={{ padding: '2rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                    <h3 style={{ color: '#b91c1c' }}>System Error</h3>
                    <p>{globalError}</p>
                  </div>
                )}

                {importStatus === 'PREVIEW' && previewData && (
                  <div>
                    <h3>Import Preview</h3>
                    <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.5)', borderRadius: '8px' }}>
                      <p><strong>Branches:</strong> {previewData.stats.branches} ({previewData.stats.newBranches} new)</p>
                      <p><strong>Reports:</strong> {previewData.stats.reports}</p>
                      <p><strong>B2B Entries:</strong> {previewData.stats.b2b_entries}</p>
                      <p><strong>Offshore Entries:</strong> {previewData.stats.offshore_entries}</p>
                    </div>
                    {previewData.hasErrors && (
                      <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '1rem' }}>
                        <h4 style={{ color: '#b91c1c' }}>Validation Issues Found</h4>
                        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                          {previewData.errors.slice(0, 5).map((err, i) => (
                            <li key={i} style={{ fontSize: '0.9rem', color: '#991b1b' }}>
                              {err.message}
                            </li>
                          ))}
                          {previewData.errors.length > 5 && <li>... and {previewData.errors.length - 5} more</li>}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                      style={{ opacity: previewData.hasErrors ? 0.5 : 1, cursor: previewData.hasErrors ? 'not-allowed' : 'pointer' }}
                    >
                      Confirm & Import
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Invoices List */}
        {selectedMonth ? (
          <InvoiceList month={selectedMonth} onSelectInvoice={setSelectedInvoice} />
        ) : (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Select a month from the sidebar to view invoices</p>
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
    </div>
  );
}
