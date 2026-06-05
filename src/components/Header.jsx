import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  return (
    <header className="app-header">
      {/* Brand */}
      <Link to="/" className="header-brand" style={{ textDecoration: 'none' }}>
        {/* Red rounded-square badge with white chevrons — HOMESÍ logomark */}
        <div className="brand-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
               strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
            <polyline points="18 20 12 14 6 20" />
          </svg>
        </div>
        <div>
          <p className="brand-name">HOMESÍ</p>
          <span className="brand-tagline">powered by Supreme Lending</span>
        </div>
      </Link>

      {/* Nav */}
      <nav className="header-nav">
        <Link
          to="/"
          className={`btn btn-sm ${location.pathname === '/' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Dashboard
        </Link>
        <Link
          to="/branches"
          className={`btn btn-sm ${location.pathname === '/branches' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Branches
        </Link>
      </nav>
    </header>
  );
}
