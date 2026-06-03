import React from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="glass-panel" style={{ padding: '1rem 2rem', marginBottom: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0', borderBottom: '1px solid rgba(230, 57, 70, 0.12)' }}>
      <div>
        <h2 style={{ margin: 0 }}>
          <span style={{ color: '#f1f1f1' }}>Home</span>
          <span style={{ color: '#e63946' }}>Sí</span> 
          <span style={{ fontSize: '1rem', color: '#8b8b99', fontWeight: 400, marginLeft: '10px' }}>
            powered by Supreme Lending
          </span>
        </h2>
      </div>
      <nav style={{ display: 'flex', gap: '1rem' }}>
        <Link to="/" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Dashboard</Link>
        <Link to="/branches" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Branches</Link>
      </nav>
    </header>
  );
}
