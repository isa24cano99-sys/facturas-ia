import React, { useState, useRef } from 'react';

export default function FileUploader({ onFileSelect }) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
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
      className={`dropzone ${dragActive ? "active" : ""}`}
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
        style={{ display: "none" }}
      />
      <div className="dropzone-icon">📁</div>
      <h3>Drag and drop your Excel file here</h3>
      <p style={{ color: 'var(--text-muted)' }}>or click to browse from your computer</p>
    </div>
  );
}
