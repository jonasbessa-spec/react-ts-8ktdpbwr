import React from 'react';
import Dashboard from './Dashboard';
import Sidebar from './layout/Sidebar'; // Ou './components/layout/Sidebar'

export default function App() {
  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-slate-100">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <Dashboard />
      </main>
    </div>
  );
}