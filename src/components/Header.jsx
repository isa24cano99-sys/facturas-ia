import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  return (
    <header className="app-header">
      {/* Brand */}
      <Link to="/" className="header-brand" style={{ textDecoration: 'none' }}>
        {/* Orange rounded-square badge with white chevrons — HOMESÍ logomark */}
        <div className="brand-badge">
          <svg viewBox="0 0 102 102" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="6" y="6" width="90" height="90" rx="21" fill="#FF443F" />
            <path d="M25 48L51 33L77 48" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M25 64L51 49L77 64" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M39 78L51 71L63 78" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
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

