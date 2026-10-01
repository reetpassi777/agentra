import React, { useState, useEffect } from 'react';
import { ToastProvider } from './ToastContext';
import HomePage from './HomePage';
import SubscribePage from './SubscribePage';
import DashboardPage from './DashboardPage';
import CreatePage from './CreatePage';
import { api } from './api';

export default function App() {
  const [page, setPage] = useState('home');
  const [subCount, setSubCount] = useState(0);
  const [serverOk, setServerOk] = useState(null);

  useEffect(() => { api.health().then(() => setServerOk(true)).catch(() => setServerOk(false)); }, []);
  useEffect(() => { api.getStats().then(s => setSubCount(s.total)).catch(() => {}); }, [page]);

  const nav = [
    { id: 'home', label: 'Home' },
    { id: 'subscribe', label: 'Subscribe' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'create', label: 'Compose' },
  ];

  return (
    <ToastProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {serverOk === false && (
          <div style={{ background: 'var(--red-bg)', borderBottom: '1px solid rgba(192,74,74,0.2)', padding: '7px 24px', fontSize: 12, color: 'var(--red)', textAlign: 'center', fontFamily: 'var(--mono)' }}>
            Backend offline — <code style={{ background: 'rgba(192,74,74,0.15)', padding: '1px 6px', borderRadius: 3 }}>cd backend && npm start</code>
          </div>
        )}

        {/* Header */}
        
<header
  style={{
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  }}
>
  {/* Logo */}
  <div
    onClick={() => setPage('home')}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer',
      userSelect: 'none',
    }}
  >
    <div
      style={{
        width: 30,
        height: 30,
        background: 'var(--gold)',
        borderRadius: 7,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M3 11L7 3L11 11"
          stroke="#0a0a0f"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4.5 8.5h5"
          stroke="#0a0a0f"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </div>

    <span
      style={{
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--text)',
        letterSpacing: '-0.2px',
        fontFamily: 'var(--sans)',
      }}
    >
      Agentra
    </span>
  </div>

  {/* Nav */}
  <nav style={{ display: 'flex', gap: 2 }}>
    {nav.map((item) => (
      <button
        key={item.id}
        onClick={() => setPage(item.id)}
        style={{
          background: page === item.id ? 'var(--gold-bg)' : 'none',
          border:
            page === item.id
              ? '1px solid rgba(212,168,67,0.2)'
              : '1px solid transparent',
          color: page === item.id ? 'var(--gold)' : 'var(--text2)',
          fontSize: 13,
          fontWeight: page === item.id ? 500 : 400,
          padding: '6px 14px',
          borderRadius: 6,
          cursor: 'pointer',
          transition: 'all 0.12s',
        }}
      >
        {item.label}
      </button>
    ))}
  </nav>

  {/* Right */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <div
      onClick={() => setPage('dashboard')}
      title="View Subscriber Details"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '4px 12px',
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          fontWeight: 600,
          color: 'var(--gold)',
          fontFamily: 'var(--mono)',
        }}
      >
        {subCount}
      </span>

      <span style={{ color: 'var(--text3)' }}>
        subscribers • click to view
      </span>
    </div>

    <div
      style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background:
          serverOk === true
            ? '#3d9e6a'
            : serverOk === false
            ? 'var(--red)'
            : '#c09040',
        boxShadow:
          serverOk === true
            ? '0 0 0 2px rgba(61,158,106,0.2)'
            : 'none',
      }}
      title={serverOk === true ? 'Connected' : 'Offline'}
    />
  </div>
</header>

        <main style={{ flex: 1 }}>
          {page === 'home'      && <HomePage onNavigate={setPage} />}
          {page === 'subscribe' && <SubscribePage onNavigate={setPage} />}
          {page === 'dashboard' && <DashboardPage onNavigate={setPage} />}
          {page === 'create'    && <CreatePage />}
        </main>

        <footer style={{
          borderTop: '1px solid var(--border)',
          padding: '16px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12, color: 'var(--text3)',
          background: 'var(--surface)',
        }}>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--gold-dim)' }}>Agentra</span>
          <span>Mistral AI · Nodemailer · React</span>
        </footer>
      </div>
    </ToastProvider>
  );
}
