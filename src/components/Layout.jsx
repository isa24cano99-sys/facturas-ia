import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function Layout() {
  return (
    <div className="app-container">
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
