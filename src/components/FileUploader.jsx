import React, { useState, useRef } from 'react';

export default function FileUploader({ onFileSelect }) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      className={`dropzone ${dragActive ? 'active' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx, .xls"
        multiple={false}
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      {/* Upload cloud icon */}
      <div className="dropzone-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52"
             viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
             style={{ color: 'var(--red)' }}>
          <polyline points="16 16 12 12 8 16" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
      </div>

      <h3 style={{ color: 'var(--navy)', marginBottom: '0.4rem' }}>
        Drag & drop your Excel file here
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
        or <span style={{ color: 'var(--red)', fontWeight: 700 }}>click to browse</span> from your computer
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '0.75rem' }}>
        Supports .xlsx and .xls files
      </p>
    </div>
  );
}
