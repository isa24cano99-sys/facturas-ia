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
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <h2>Registered Branches</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>List of all branches imported into the system.</p>
      
      {loading ? <p>Loading...</p> : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Location</th>
                <th>Manager</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {branches.map(b => (
                <tr key={b.branch_id}>
                  <td>{b.branch_id}</td>
                  <td>{b.branch_name}</td>
                  <td>{b.county}, {b.state}</td>
                  <td>{b.branch_manager_name}</td>
                  <td>{b.branch_manager_email}</td>
                </tr>
              ))}
              {branches.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center">No branches found. Import data first.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
