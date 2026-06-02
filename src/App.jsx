import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Branches from './pages/Branches';
import InvoiceDetail from './pages/InvoiceDetail';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="branches" element={<Branches />} />
          <Route path="invoice/:report_id" element={<InvoiceDetail />} />
        </Route>
      </Routes>
    </Router>
  );
}
