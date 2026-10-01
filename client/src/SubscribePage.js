import React, { useState } from 'react';
import { api } from './api';
import { useToast } from './ToastContext';

export default function SubscribePage() {
  const toast = useToast();
  // Removed password field — newsletter subscription does not create a user account
  const [form, setForm] = useState({ name: '', email: '', frequency: 'weekly', preferences: ['General'] });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const PREFERENCE_OPTIONS = ['General', 'Technology', 'Business', 'Science', 'Health', 'Culture'];
  const FREQUENCY_OPTIONS = [
    { value: 'daily',   label: 'Daily' },
    { value: 'weekly',  label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];

  const togglePref = pref => {
    setForm(p => ({
      ...p,
      preferences: p.preferences.includes(pref)
        ? p.preferences.filter(x => x !== pref)
        : [...p.preferences, pref]
    }));
  };

  const submit = async () => {
    if (!form.name.trim()) { toast('Name required', 'error'); return; }
    if (!form.email.trim()) { toast('Email required', 'error'); return; }
    if (form.preferences.length === 0) { toast('Select at least one topic', 'error'); return; }
    setLoading(true);
    try {
      await api.addSubscriber({ name: form.name, email: form.email, preferences: form.preferences, frequency: form.frequency });
      setDone(true);
    } catch (e) { toast(e.message, 'error'); }
    setLoading(false);
  };

  if (done) return (
    <div style={center}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)', padding: '52px 44px',
        maxWidth: 400, width: '100%', textAlign: 'center',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--gold-bg)', border: '1px solid rgba(212,168,67,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: 20, color: 'var(--gold)',
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M5 11.5l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 400, marginBottom: 10 }}>Check your inbox!</h2>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.75, marginBottom: 6 }}>
          A confirmation email has been sent to
        </p>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--gold)', marginBottom: 28 }}>{form.email}</p>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.75, marginBottom: 28 }}>
          Click the link in the email to activate your subscription. This keeps your inbox safe and complies with GDPR.
        </p>
        <button className="btn-secondary" style={{ width: '100%' }}
          onClick={() => { setDone(false); setForm({ name: '', email: '', frequency: 'weekly', preferences: ['General'] }); }}>
          Add another subscriber
        </button>
      </div>
    </div>
  );

  return (
    <div style={center}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        maxWidth: 860, width: '100%',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Left — dark editorial panel */}
        <div style={{
          padding: '52px 44px',
          background: 'var(--bg2)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', bottom: -80, right: -80,
            width: 240, height: 240, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,168,67,0.12) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10,
            color: 'var(--gold)', letterSpacing: '1.2px',
            textTransform: 'uppercase', marginBottom: 28, opacity: 0.7,
          }}>Agentra</div>
          <h2 style={{
            fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 400,
            lineHeight: 1.15, color: 'var(--text)', marginBottom: 18,
          }}>
            One inbox.<br/>
            <span style={{ fontStyle: 'italic', color: 'rgba(240,238,232,0.45)' }}>Endless ideas.</span>
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.85, marginBottom: 40 }}>
            Subscribe once and every newsletter published through Agentra lands directly in your inbox.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              'Double opt-in — confirm via email before receiving anything',
              'Choose your topics and delivery frequency',
              'Unsubscribe anytime with one click from any email',
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: '1px solid var(--gold-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: 'var(--gold)', flexShrink: 0, marginTop: 1,
                  fontFamily: 'var(--mono)',
                }}>{i + 1}</div>
                <span style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.7 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form */}
        <div style={{ padding: '52px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6, letterSpacing: '-0.3px' }}>Subscribe</h3>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 28 }}>Join the newsletter list — confirm via email</p>

          <Field label="Full name">
            <input className="inp" value={form.name} placeholder="Jane Doe" onChange={set('name')} autoComplete="name" />
          </Field>
          <Field label="Email address">
            <input className="inp" type="email" value={form.email} placeholder="you@gmail.com" onChange={set('email')} autoComplete="email"
              onKeyDown={e => e.key === 'Enter' && submit()} />
          </Field>

          <Field label="Topics (select at least one)">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PREFERENCE_OPTIONS.map(pref => {
                const active = form.preferences.includes(pref);
                return (
                  <button key={pref} type="button" onClick={() => togglePref(pref)} style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                    background: active ? 'var(--gold-bg)' : 'var(--surface2)',
                    border: `1px solid ${active ? 'rgba(212,168,67,0.3)' : 'var(--border)'}`,
                    color: active ? 'var(--gold)' : 'var(--text2)',
                    fontWeight: active ? 500 : 400, transition: 'all 0.1s',
                  }}>{pref}</button>
                );
              })}
            </div>
          </Field>

          <Field label="Delivery frequency">
            <div style={{ display: 'flex', gap: 6 }}>
              {FREQUENCY_OPTIONS.map(({ value, label }) => {
                const active = form.frequency === value;
                return (
                  <button key={value} type="button" onClick={() => setForm(p => ({ ...p, frequency: value }))} style={{
                    flex: 1, padding: '7px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                    background: active ? 'var(--gold-bg)' : 'var(--surface2)',
                    border: `1px solid ${active ? 'rgba(212,168,67,0.3)' : 'var(--border)'}`,
                    color: active ? 'var(--gold)' : 'var(--text2)',
                    fontWeight: active ? 500 : 400, transition: 'all 0.1s',
                  }}>{label}</button>
                );
              })}
            </div>
          </Field>

          <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

          <button className="btn-primary" onClick={submit} disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            {loading && <span className="spinner" />}
            {loading ? 'Subscribing…' : 'Subscribe & confirm →'}
          </button>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12, textAlign: 'center', lineHeight: 1.6 }}>
            You'll receive a confirmation email. We never share your address.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 500,
        color: 'var(--text3)', fontFamily: 'var(--mono)',
        textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7,
      }}>{label}</label>
      {children}
    </div>
  );
}

const center = { minHeight: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' };
