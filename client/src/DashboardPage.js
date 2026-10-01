import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { useToast } from './ToastContext';

export default function DashboardPage({ onNavigate }) {
  const toast = useToast();
  const [subs, setSubs] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, totalSent: 0 });
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [smtpOk, setSmtpOk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('subscribers');

  const load = useCallback(async () => {
    try {
      const [s, st, l] = await Promise.all([api.getSubscribers(search), api.getStats(), api.getLogs()]);
      setSubs(s.subscribers); setStats(st); setLogs(l.logs);
    } catch (e) { toast(e.message, 'error'); }
    setLoading(false);
  }, [search, toast]);

  useEffect(() => { load(); }, [load]);

  const remove = async id => {
    if (!window.confirm('Remove this subscriber?')) return;
    try { await api.removeSubscriber(id); toast('Removed', 'info'); load(); }
    catch (e) { toast(e.message, 'error'); }
  };

  const toggle = async (id, cur) => {
    try { await api.updateStatus(id, cur === 'active' ? 'inactive' : 'active'); load(); }
    catch (e) { toast(e.message, 'error'); }
  };

  const verify = async () => {
    try { await api.verifySmtp(); setSmtpOk(true); toast('SMTP connected', 'success'); }
    catch (e) { setSmtpOk(false); toast(e.message, 'error'); }
  };

  const cards = [
    { label: 'Total', value: stats.total, color: 'var(--text)' },
    { label: 'Active', value: stats.active, color: 'var(--teal)' },
    { label: 'Emails sent', value: stats.totalSent || 0, color: 'var(--gold)' },
    { label: 'Inactive', value: (stats.total || 0) - (stats.active || 0), color: 'var(--text3)' },
  ];

  return (
    <div style={{ maxWidth: 1020, margin: '0 auto', padding: '40px 28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 400, fontFamily: 'var(--serif)', fontStyle: 'italic', letterSpacing: '-0.3px', marginBottom: 6, color: 'var(--text)' }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>Manage your subscribers and track newsletter delivery</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={verify} style={{
            color: smtpOk === true ? 'var(--teal)' : smtpOk === false ? 'var(--red)' : 'var(--text2)',
            borderColor: smtpOk === true ? 'rgba(61,158,133,0.3)' : smtpOk === false ? 'rgba(192,74,74,0.3)' : 'var(--border2)',
            fontFamily: 'var(--mono)', fontSize: 12,
          }}>
            {smtpOk === null ? 'Verify SMTP' : smtpOk ? '✓ SMTP OK' : '✕ SMTP Error'}
          </button>
          <button className="btn-primary" onClick={() => onNavigate('subscribe')}>+ Add subscriber</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
        {cards.map((c, i) => (
          <div key={i} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: '20px 22px',
          }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--text3)', marginBottom: 10 }}>{c.label}</div>
            <div style={{ fontSize: 34, fontWeight: 300, letterSpacing: '-2px', color: c.color, lineHeight: 1, fontFamily: 'var(--serif)' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {[['subscribers', 'Subscribers'], ['history', 'Send history']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            background: 'none', border: 'none',
            borderBottom: tab === id ? '2px solid var(--gold)' : '2px solid transparent',
            color: tab === id ? 'var(--gold)' : 'var(--text2)',
            fontSize: 13, fontWeight: tab === id ? 500 : 400,
            padding: '0 0 12px', marginRight: 28, cursor: 'pointer', marginBottom: -1,
            transition: 'color 0.12s',
          }}>{label}</button>
        ))}
      </div>

      {/* Subscribers tab */}
      {tab === 'subscribers' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)' }}>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{subs.length} result{subs.length !== 1 ? 's' : ''}</span>
            <input className="inp" style={{ width: 220, padding: '7px 12px', fontSize: 12, background: 'var(--surface3)', border: '1px solid var(--border)' }}
              placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div style={{ padding: '52px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text2)' }}>
              <span className="spinner-light" /> Loading…
            </div>
          ) : subs.length === 0 ? (
            <div style={{ padding: '52px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>{search ? 'No subscribers match.' : 'No subscribers yet.'}</p>
              {!search && <button className="btn-ghost" onClick={() => onNavigate('subscribe')} style={{ color: 'var(--gold)' }}>Add first subscriber →</button>}
            </div>
          ) : (
            <>
              <div style={th()}>
                <span>Name</span><span>Email</span><span>Status</span><span>Joined</span><span style={{ textAlign: 'right' }}>Actions</span>
              </div>
              {subs.map((s, i) => (
                <div key={s.id} style={{ ...td(), background: i % 2 === 0 ? 'var(--surface)' : 'transparent' }}>
                  <span style={{ fontWeight: 500, color: 'var(--text)', fontSize: 13 }}>{s.name}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{s.email}</span>
                  <span>
                    <span style={{
                      fontSize: 11, fontFamily: 'var(--mono)', padding: '3px 10px',
                      borderRadius: 20,
                      background: s.status === 'active' ? 'var(--teal-bg)' : 'var(--surface3)',
                      color: s.status === 'active' ? 'var(--teal)' : 'var(--text3)',
                      border: `1px solid ${s.status === 'active' ? 'rgba(61,158,133,0.2)' : 'var(--border)'}`,
                    }}>
                      {s.status}
                    </span>
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                    {new Date(s.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11, fontFamily: 'var(--mono)' }} onClick={() => toggle(s.id, s.status)}>
                      {s.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                    <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--red)' }} onClick={() => remove(s.id)}>
                      Remove
                    </button>
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {logs.length === 0 ? (
            <div style={{ padding: '52px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>No newsletters sent yet.</p>
              <button className="btn-ghost" onClick={() => onNavigate('create')} style={{ color: 'var(--gold)' }}>Compose one →</button>
            </div>
          ) : logs.map((log, i) => (
            <div key={log.id} style={{
              padding: '16px 22px',
              borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>{log.subject}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                  {log.recipientCount} recipient{log.recipientCount !== 1 ? 's' : ''} · {new Date(log.sentAt).toLocaleString()}
                </div>
              </div>
              <span style={{
                fontSize: 11, fontFamily: 'var(--mono)', padding: '3px 10px',
                borderRadius: 20,
                background: log.status === 'sent' ? 'var(--teal-bg)' : 'var(--amber-bg)',
                color: log.status === 'sent' ? 'var(--teal)' : 'var(--amber)',
                border: `1px solid ${log.status === 'sent' ? 'rgba(61,158,133,0.2)' : 'rgba(192,144,64,0.2)'}`,
              }}>
                {log.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const th = () => ({
  display: 'grid', gridTemplateColumns: '1.3fr 2fr 0.9fr 1fr 1fr',
  gap: 8, alignItems: 'center', padding: '10px 20px',
  borderBottom: '1px solid var(--border)',
  fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text3)',
  textTransform: 'uppercase', letterSpacing: '0.7px',
  background: 'var(--surface2)',
});

const td = () => ({
  display: 'grid', gridTemplateColumns: '1.3fr 2fr 0.9fr 1fr 1fr',
  gap: 8, alignItems: 'center', padding: '12px 20px',
  borderBottom: '1px solid var(--border)',
});
