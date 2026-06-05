import React, { useState, useEffect } from 'react';

const API = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : '';

export default function Sidebar({ onMonthSelect, selectedMonth, refreshTrigger }) {
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/dashboard/months`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setMonths(data.months);
          if (!selectedMonth && data.months.length > 0) {
            onMonthSelect(data.months[0].report_month_id);
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedMonth, onMonthSelect, refreshTrigger]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Periods</h2>
      </div>

      {loading ? (
        <p style={{ color: 'rgba(166,222,255,0.5)', padding: '0.5rem 1rem', fontSize: '14px' }}>
          Loading…
        </p>
      ) : months.length === 0 ? (
        <p style={{ color: 'rgba(166,222,255,0.5)', padding: '0.5rem 1rem', fontSize: '14px' }}>
          No data yet. Upload a file first.
        </p>
      ) : (
        <ul className="months-list">
          {months.map(month => (
            <li
              key={month.report_month_id}
              className={`month-item ${selectedMonth === month.report_month_id ? 'active' : ''}`}
              onClick={() => onMonthSelect(month.report_month_id)}
            >
              <span className="month-display">{month.report_month_display}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
