import React, { useState, useEffect } from 'react';

const API = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : '';

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/branches`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) setBranches(data.branches);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: '2rem 2.5rem', background: 'var(--offwhite)', minHeight: '100vh' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--navy)', marginBottom: '0.4rem' }}>Branches</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
          All branches imported into the system
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading branches…
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Branch ID</th>
                <th>Name</th>
                <th>Location</th>
                <th>Manager</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {branches.map(b => (
                <tr key={b.branch_id}>
                  <td className="mono" style={{ fontFamily: 'Monaco, monospace', fontSize: '13px', color: 'var(--text-muted)' }}>
                    {b.branch_id}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{b.branch_name}</td>
                  <td>{b.branch_name}</td>
                  <td>{b.branch_manager_name}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{b.branch_manager_email}</td>
                </tr>
              ))}
              {branches.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No branches found. Import data first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
