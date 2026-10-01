import React from 'react';

const features = [
  {
    n: '01',
    title: 'Capture your audience',
    desc: 'A clean subscribe form collects emails instantly. Manage, pause, or remove subscribers from a minimal dashboard.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    n: '02',
    title: 'AI writes for you',
    desc: 'Enter a topic, choose a tone and format. Mistral AI generates a polished, fully structured newsletter in seconds.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 14l3-3 3 3 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    n: '03',
    title: 'Preview and edit',
    desc: 'See exactly how it looks in an inbox. Adjust tone, styling, or manually edit before anything goes out.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    n: '04',
    title: 'One-click delivery',
    desc: 'Send to every active subscriber via your Gmail SMTP in a single click. Track sends, recipients, and delivery history.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 10l14-7-7 14V10H3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function HomePage({ onNavigate }) {
  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '80px 28px 96px' }}>

      {/* Hero */}
      <div style={{ maxWidth: 640, marginBottom: 80 }}>
        <div className="fu" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--gold-bg)', border: '1px solid rgba(212,168,67,0.2)',
          borderRadius: 20, padding: '5px 14px', marginBottom: 28,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)' }} />
          <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--gold)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            AI Newsletter Platform
          </span>
        </div>

        <h1 className="fu1" style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(44px, 6vw, 68px)',
          fontWeight: 400,
          lineHeight: 1.05,
          letterSpacing: '-0.5px',
          color: 'var(--text)',
          marginBottom: 24,
        }}>
          From idea<br />
          <span style={{ fontStyle: 'italic', color: 'var(--gold)' }}>to inbox.</span>
        </h1>

        <p className="fu2" style={{ fontSize: 16, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 36, maxWidth: 480 }}>
          Agentra turns a single prompt into a polished newsletter and delivers it to your entire audience — automatically, in seconds.
        </p>

        <div className="fu3" style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" onClick={() => onNavigate('subscribe')} style={{ padding: '11px 24px', fontSize: 14 }}>
            Start free
          </button>
          <button className="btn-secondary" onClick={() => onNavigate('create')} style={{ padding: '11px 20px' }}>
            Try AI writer →
          </button>
        </div>
      </div>

      {/* Feature grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
        background: 'var(--border)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        overflow: 'hidden',
        marginBottom: 52,
      }}>
        {features.map((f, i) => (
          <div key={i} style={{
            background: 'var(--surface)',
            padding: '32px',
            position: 'relative',
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ color: 'var(--gold)', opacity: 0.85 }}>{f.icon}</div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>{f.n}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>{f.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.75 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {/* Integrations */}
<div
  style={{
    marginBottom: 60,
  }}
>
  <div
    style={{
      textAlign: "center",
      marginBottom: 30,
    }}
  >
    <div
      style={{
        fontSize: 12,
        color: "var(--gold)",
        textTransform: "uppercase",
        letterSpacing: 1,
        fontFamily: "var(--mono)",
        marginBottom: 8,
      }}
    >
      Integrations
    </div>

    <h2
      style={{
        fontFamily: "var(--serif)",
        fontSize: 34,
        color: "var(--text)",
        margin: 0,
      }}
    >
      Connect with your favourite tools
    </h2>

    <p
      style={{
        color: "var(--text2)",
        marginTop: 12,
      }}
    >
      Easily connect Agentra with popular email platforms and business tools.
    </p>
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))",
      gap: 16,
    }}
  >
    {[
      "Gmail",
      "Outlook",
      "SMTP Providers",
      "Zapier (Coming Soon)",
      "Webhooks (Coming Soon)",
      "WordPress (Coming Soon)",
      "Shopify (Coming Soon)",
      "WooCommerce (Coming Soon)",
      "HubSpot (Coming Soon)",
      "Salesforce (Coming Soon)",
      "Google Analytics (Coming Soon)",
    ].map((item) => (
      <div
        key={item}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-xl)",
          padding: "18px",
          textAlign: "center",
          color: "var(--text)",
          fontWeight: 500,
          transition: "0.2s",
        }}
      >
        {item}
      </div>
    ))}
  </div>
</div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '28px 36px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        flexWrap: 'wrap', gap: 20,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 200, height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--gold-glow) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 5, fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
            Ready to automate your newsletter?
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            Subscribe takes 30 seconds. No credit card needed.
          </div>
        </div>
        <button onClick={() => onNavigate('subscribe')} className="btn-primary" style={{ padding: '11px 24px', fontSize: 13 }}>
          Subscribe now →
        </button>
      </div>
    </div>
  );
}
