import React, { useState, useEffect } from 'react';
import { api } from './api';
import { useToast } from './ToastContext';

const FORMATS = ['newsletter', 'article', 'report', 'summary'];
const TONES   = ['professional', 'casual', 'promotional', 'educational'];
const EXPORTS = [
  { value: 'txt',  label: 'Plain text' },
  { value: 'html', label: 'HTML' },
  { value: 'pdf',  label: 'PDF' },
];

const FONT_FAMILIES = [
  { label: 'Georgia (Serif)',  value: "Georgia, 'Times New Roman', serif" },
  { label: 'Arial (Sans)',     value: 'Arial, Helvetica, sans-serif' },
  { label: 'Verdana',          value: 'Verdana, Geneva, sans-serif' },
  { label: 'DM Sans',          value: "'DM Sans', sans-serif" },
  { label: 'Times New Roman',  value: "'Times New Roman', Times, serif" },
];

const FONT_SIZES    = ['14px', '15px', '16px', '17px', '18px'];
const BG_PRESETS    = ['#0f0f17', '#1a1a2e', '#ffffff', '#f4f4f8', '#f0f4ff', '#fff8f0'];
const ACCENT_PRESETS = ['#d4a843', '#3d9e85', '#c0624a', '#6060c0', '#3d9e6a', '#c09040'];

function strip(raw) { return raw.replace(/^Subject:.*$/im, '').replace(/^\s*\n/, '').trim(); }

function mdToHtml(md) {
  if (!md) return '';
  md = md.replace(/^Subject:.*$/im, '').trim();
  const lines = md.split('\n');
  let html = '', inUl = false, inOl = false;
  for (const line of lines) {
    if (line.startsWith('### '))     { close(); html += `<h3>${il(line.slice(4))}</h3>`; }
    else if (line.startsWith('## ')) { close(); html += `<h2>${il(line.slice(3))}</h2>`; }
    else if (line.startsWith('# '))  { close(); html += `<h1>${il(line.slice(2))}</h1>`; }
    else if (line.match(/^---+$/))   { close(); html += '<hr>'; }
    else if (line.match(/^[\*\-] /)) { if (inOl) { html += '</ol>'; inOl = false; } if (!inUl) { html += '<ul>'; inUl = true; } html += `<li>${il(line.slice(2))}</li>`; }
    else if (line.match(/^\d+\. /))  { if (inUl) { html += '</ul>'; inUl = false; } if (!inOl) { html += '<ol>'; inOl = true; } html += `<li>${il(line.replace(/^\d+\. /, ''))}</li>`; }
    else if (line.trim() === '')     { close(); }
    else                              { close(); html += `<p>${il(line)}</p>`; }
  }
  close();
  return html;
  function close() { if (inUl) { html += '</ul>'; inUl = false; } if (inOl) { html += '</ol>'; inOl = false; } }
  function il(t) { return t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code>$1</code>'); }
}

const DEFAULT_STYLE = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: '16px',
  textColor: '#1a1a2e',
  bgColor: '#0f0f17',
  cardColor: '#1c1c2e',
  accentColor: '#d4a843',
  headingColor: '#f0eee8',
};

// Real PDF download using browser print API with a hidden iframe (no new-tab surprise)
function downloadPdf(subject, content, style) {
  const html = `<!DOCTYPE html><html><head><title>${subject}</title><style>
    @media print { body { margin: 0; } }
    body { font-family:${style.fontFamily}; padding:48px; max-width:700px; margin:auto; line-height:1.85; color:${style.textColor}; background:#fff; }
    h1 { font-size:28px; font-style:italic; margin:0 0 18px; }
    h2 { font-size:20px; font-weight:600; margin:24px 0 10px; }
    h3 { font-size:13px; text-transform:uppercase; letter-spacing:.5px; color:${style.accentColor}; margin:18px 0 8px; }
    p  { margin:0 0 13px; }
  </style></head><body><h1>${subject}</h1>${mdToHtml(content)}</body></html>`;

  // Create a blob URL and use a hidden <a> to trigger download via print
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;';
  document.body.appendChild(iframe);
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();
  // Give browser time to render then trigger print dialog
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 400);
}

export default function CreatePage() {
  const toast = useToast();
  const [format, setFormat]     = useState('newsletter');
  const [tone, setTone]         = useState('professional');
  const [exportFmt, setExportFmt] = useState('html');
  const [prompt, setPrompt]     = useState('');
  const [wlOn, setWlOn]         = useState(false);
  const [wl, setWl]             = useState(600);
  const [gen, setGen]           = useState(false);
  const [content, setContent]   = useState('');
  const [subject, setSubject]   = useState('');
  const [nlId, setNlId]         = useState(null);
  const [sending, setSending]   = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showTest, setShowTest] = useState(false);
  const [subCount, setSubCount] = useState(0);
  const [tab, setTab]           = useState('preview');
  const [showStyle, setShowStyle] = useState(false);
  const [style, setStyle]       = useState(DEFAULT_STYLE);
  const [sendResult, setSendResult] = useState(null); // track failed sends

  useEffect(() => { api.getStats().then(s => setSubCount(s.active)).catch(() => {}); }, []);

  const wc = content.trim() ? content.trim().split(/\s+/).length : 0;
  const setSt = k => v => setStyle(p => ({ ...p, [k]: v }));

  const generate = async () => {
    if (!prompt.trim()) { toast('Enter a topic first', 'error'); return; }
    setGen(true); setContent(''); setTab('preview'); setSendResult(null);
    try {
      const res = await api.generateContent({ prompt, format, tone, wordLimit: wlOn ? wl : null });
      setContent(strip(res.content));
      setSubject(res.subject);
      setNlId(res.id);
      toast('Generated!', 'success');
    } catch (e) { toast(e.message, 'error'); }
    setGen(false);
  };

  const saveDraft = async () => {
    if (!nlId || !content) { toast('Nothing to save yet', 'error'); return; }
    setSavingDraft(true);
    try {
      await api.saveDraft(nlId, { subject, content });
      toast('Draft saved ✓', 'success');
    } catch (e) { toast(e.message, 'error'); }
    setSavingDraft(false);
  };

  const doExport = () => {
    if (!content) { toast('Generate first', 'error'); return; }
    const fname = subject.slice(0, 40).replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'newsletter';
    if (exportFmt === 'pdf') {
      downloadPdf(subject, content, style);
      return;
    }
    const body = exportFmt === 'html'
      ? `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${subject}</title></head><body>${mdToHtml(content)}</body></html>`
      : content;
    const blob = new Blob([body], { type: 'text/plain' });
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${fname}.${exportFmt}` }).click();
    toast(`Saved as ${fname}.${exportFmt}`, 'success');
  };

  const sendAll = async () => {
    if (!content) { toast('Generate first', 'error'); return; }
    if (subCount === 0) { toast('No active subscribers', 'error'); return; }
    setSending(true); setSendResult(null);
    try {
      const res = await api.sendNewsletter({ subject, content, newsletterId: nlId, style });
      toast(res.message, 'success');
      if (res.failed?.length) {
        toast(`${res.failed.length} failed — see details below`, 'error');
        setSendResult(res);
      }
    } catch (e) { toast(e.message, 'error'); }
    setSending(false);
  };

  const sendTest = async () => {
    if (!testEmail || !content) { toast('Enter test email and generate first', 'error'); return; }
    try {
      const r = await api.sendTest({ email: testEmail, subject, content, style });
      toast(r.message, 'success'); setShowTest(false);
    } catch (e) { toast(e.message, 'error'); }
  };

  const previewHtml = () => {
    const body = mdToHtml(content);
    return `<div style="background:${style.bgColor};min-height:100%;padding:24px 16px;font-family:${style.fontFamily}">
      <div style="max-width:560px;margin:0 auto;background:${style.cardColor};border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.3)">
        <div style="background:${style.accentColor};padding:28px 32px">
          <div style="font-size:10px;font-weight:600;color:rgba(0,0,0,0.5);letter-spacing:1.2px;text-transform:uppercase;margin-bottom:10px;font-family:monospace">Agentra Newsletter</div>
          <div style="font-size:22px;font-weight:700;color:#0a0a0f;line-height:1.2;margin-bottom:8px;font-style:italic">${subject || 'Your newsletter subject'}</div>
          <div style="font-size:13px;color:rgba(0,0,0,0.55)">Hello there 👋</div>
        </div>
        <div style="padding:30px 32px;font-size:${style.fontSize};line-height:1.85;color:${style.textColor}">
          ${body || '<p style="color:#aaa;font-style:italic">Your content will appear here…</p>'}
        </div>
        <div style="padding:18px 32px;border-top:1px solid rgba(255,255,255,0.08)">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.3);font-family:monospace">Sent via Agentra · <a href="#" style="color:rgba(255,255,255,0.3)">Unsubscribe</a></p>
        </div>
      </div>
    </div>`;
  };

  // Responsive layout — sidebar collapses on narrow screens via a simple inline check
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 28px' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 400, fontFamily: 'var(--serif)', fontStyle: 'italic', letterSpacing: '-0.3px', marginBottom: 6 }}>Compose</h1>
        <p style={{ fontSize: 13, color: 'var(--text2)' }}>Generate AI-written content and deliver it to your subscribers</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px, 18%, 200px) 1fr', gap: 20, alignItems: 'start' }}>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Panel label="Format">
            {FORMATS.map(f => <Chip key={f} active={format === f} onClick={() => setFormat(f)}>{cap(f)}</Chip>)}
          </Panel>
          <Panel label="Tone">
            {TONES.map(t => <Chip key={t} active={tone === t} onClick={() => setTone(t)}>{cap(t)}</Chip>)}
          </Panel>
          <Panel label="Word limit">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text2)', marginBottom: wlOn ? 12 : 0 }}>
              <input type="checkbox" checked={wlOn} onChange={e => setWlOn(e.target.checked)} style={{ accentColor: 'var(--gold)', width: 13, height: 13 }} />
              Enable
            </label>
            {wlOn && <>
              <input type="range" min={100} max={2000} step={50} value={wl} onChange={e => setWl(+e.target.value)} style={{ width: '100%', accentColor: 'var(--gold)', marginBottom: 6 }} />
              <div style={{ textAlign: 'right', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text2)' }}>~{wl} words</div>
            </>}
          </Panel>
          <Panel label="Export">
            {EXPORTS.map(e => <Chip key={e.value} active={exportFmt === e.value} onClick={() => setExportFmt(e.value)}>{e.label}</Chip>)}
            <button className="btn-secondary" style={{ width: '100%', marginTop: 8, fontSize: 12 }} onClick={doExport} disabled={!content}>
              ↓ Download
            </button>
          </Panel>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--text3)', marginBottom: 8 }}>Audience</div>
            <div style={{ fontSize: 32, fontWeight: 300, letterSpacing: '-1.5px', color: 'var(--gold)', lineHeight: 1, marginBottom: 4, fontFamily: 'var(--serif)' }}>{subCount}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>active subscribers</div>
          </div>
        </div>

        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

          {/* Prompt card */}
          <div style={card}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 10, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text3)', marginBottom: 8 }}>
                Topic / Prompt
              </label>
              <textarea className="inp"
                style={{ resize: 'vertical', minHeight: 84, lineHeight: 1.7, display: 'block', background: 'var(--surface2)' }}
                placeholder="e.g. 'The rise of open-source AI and what it means for businesses in 2025'"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate(); }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Ctrl/⌘ + Enter to generate</span>
              <button className="btn-primary" onClick={generate} disabled={gen} style={{ padding: '9px 22px' }}>
                {gen && <span className="spinner" />}
                {gen ? 'Generating…' : 'Generate →'}
              </button>
            </div>
          </div>

          {/* Output */}
          {(content || gen) && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>

              {/* Subject row */}
              {subject && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text3)', flexShrink: 0 }}>Subject</span>
                  <input style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 500, outline: 'none' }} value={subject} onChange={e => setSubject(e.target.value)} />
                  <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>editable</span>
                </div>
              )}

              {/* Tab bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                <div style={{ display: 'flex' }}>
                  {['preview', 'email', 'source'].map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                      background: 'none', border: 'none',
                      borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
                      color: tab === t ? 'var(--gold)' : 'var(--text2)',
                      fontSize: 12, fontFamily: 'var(--mono)', padding: '9px 0',
                      marginRight: 16, cursor: 'pointer', marginBottom: -1,
                    }}>{t}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {wc > 0 && <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{wc.toLocaleString()} words</span>}
                  <button onClick={saveDraft} disabled={savingDraft || !nlId} style={{
                    background: 'none', border: '1px solid var(--border)',
                    color: 'var(--text2)', fontSize: 11, fontFamily: 'var(--mono)',
                    padding: '4px 10px', borderRadius: 6, cursor: nlId ? 'pointer' : 'default',
                    opacity: nlId ? 1 : 0.4,
                  }}>
                    {savingDraft ? 'Saving…' : '💾 Save draft'}
                  </button>
                  <button onClick={() => setShowStyle(p => !p)} style={{
                    background: showStyle ? 'var(--gold-bg)' : 'none',
                    border: `1px solid ${showStyle ? 'rgba(212,168,67,0.25)' : 'var(--border)'}`,
                    color: showStyle ? 'var(--gold)' : 'var(--text2)',
                    fontSize: 11, fontFamily: 'var(--mono)', padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                  }}>
                    {showStyle ? '✕ styles' : '⚙ styles'}
                  </button>
                </div>
              </div>

              {/* Style editor */}
              {showStyle && (
                <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--text3)', marginBottom: 2 }}>Email styling</div>
                  <StyleRow label="Font family">
                    <select className="inp" style={{ padding: '7px 10px' }} value={style.fontFamily} onChange={e => setSt('fontFamily')(e.target.value)}>
                      {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </StyleRow>
                  <StyleRow label="Font size">
                    <div style={{ display: 'flex', gap: 6 }}>
                      {FONT_SIZES.map(s => (
                        <button key={s} onClick={() => setSt('fontSize')(s)} style={{
                          flex: 1, padding: '6px 4px', borderRadius: 6,
                          border: `1px solid ${style.fontSize === s ? 'var(--gold-dim)' : 'var(--border)'}`,
                          background: style.fontSize === s ? 'var(--gold-bg)' : 'var(--surface2)',
                          color: style.fontSize === s ? 'var(--gold)' : 'var(--text2)',
                          fontSize: 12, cursor: 'pointer',
                        }}>{s}</button>
                      ))}
                    </div>
                  </StyleRow>
                  <StyleRow label="Text colour">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input type="color" value={style.textColor} onChange={e => setSt('textColor')(e.target.value)} style={{ width: 36, height: 32, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 2, background: 'var(--surface2)' }} />
                      <input className="inp" style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12 }} value={style.textColor} onChange={e => setSt('textColor')(e.target.value)} />
                    </div>
                  </StyleRow>
                  <StyleRow label="Accent colour">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input type="color" value={style.accentColor} onChange={e => setSt('accentColor')(e.target.value)} style={{ width: 36, height: 32, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 2, background: 'var(--surface2)' }} />
                      <div style={{ display: 'flex', gap: 5, flex: 1 }}>
                        {ACCENT_PRESETS.map(c => <button key={c} onClick={() => setSt('accentColor')(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: `2px solid ${style.accentColor === c ? 'var(--text)' : 'transparent'}`, cursor: 'pointer', flexShrink: 0 }} />)}
                      </div>
                    </div>
                  </StyleRow>
                  <StyleRow label="Email background">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {BG_PRESETS.map(c => <button key={c} onClick={() => setSt('bgColor')(c)} style={{ width: 26, height: 26, borderRadius: 6, background: c, border: `2px solid ${style.bgColor === c ? 'var(--gold)' : 'var(--border)'}`, cursor: 'pointer' }} />)}
                      <input type="color" value={style.bgColor} onChange={e => setSt('bgColor')(e.target.value)} style={{ width: 26, height: 26, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 1 }} />
                    </div>
                  </StyleRow>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => setStyle(DEFAULT_STYLE)} style={{ fontSize: 11, color: 'var(--text3)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--mono)' }}>
                      Reset defaults
                    </button>
                  </div>
                </div>
              )}

              {/* Content */}
              <div style={{ minHeight: 340, maxHeight: 580, overflowY: 'auto' }}>
                {tab === 'preview' && (
                  content
                    ? <div className="prose" style={{ padding: '26px 30px' }} dangerouslySetInnerHTML={{ __html: mdToHtml(content) }} />
                    : <div style={{ padding: '52px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Generating…</div>
                )}
                {tab === 'email' && (
                  <iframe
                    srcDoc={previewHtml()}
                    style={{ width: '100%', height: 520, border: 'none', display: 'block' }}
                    title="Email preview"
                  />
                )}
                {tab === 'source' && (
                  <textarea style={{
                    width: '100%', background: 'var(--bg)', border: 'none',
                    color: 'var(--text2)', fontSize: 12, lineHeight: 1.75,
                    fontFamily: 'var(--mono)', outline: 'none', resize: 'none',
                    minHeight: 340, padding: '22px 26px', display: 'block', boxSizing: 'border-box',
                  }} value={content} onChange={e => setContent(e.target.value)} />
                )}
              </div>

              {/* Failed sends panel */}
              {sendResult?.failed?.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px', background: 'var(--red-bg)' }}>
                  <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, marginBottom: 6 }}>
                    ⚠ {sendResult.failed.length} failed deliveries — addresses below did not receive the email:
                  </div>
                  <details>
                    <summary style={{ fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>Show failed addresses</summary>
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {sendResult.failed.map((f, i) => (
                        <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', background: 'var(--surface2)', padding: '4px 8px', borderRadius: 4 }}>
                          {f.email} — <span style={{ color: 'var(--text3)' }}>{f.error}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Actions */}
              <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', background: 'var(--surface2)' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => navigator.clipboard.writeText(content).then(() => toast('Copied', 'success'))}>Copy</button>
                  <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowTest(p => !p)}>{showTest ? 'Cancel' : 'Test send'}</button>
                </div>
                <button className="btn-primary" onClick={sendAll} disabled={sending || subCount === 0} style={{ opacity: (sending || subCount === 0) ? 0.4 : 1 }}>
                  {sending && <span className="spinner" />}
                  {sending ? 'Sending…' : `Send to ${subCount} subscriber${subCount !== 1 ? 's' : ''} →`}
                </button>
              </div>

              {/* Test email */}
              {showTest && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px', display: 'flex', gap: 8, background: 'var(--surface)' }}>
                  <input className="inp" type="email" style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
                    placeholder="test@example.com" value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendTest()} />
                  <button className="btn-primary" onClick={sendTest} style={{ whiteSpace: 'nowrap' }}>Send test →</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ label, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '13px 14px' }}>
      <div style={{ fontSize: 10, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text3)', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'var(--gold-bg)' : 'none',
      border: `1px solid ${active ? 'rgba(212,168,67,0.2)' : 'transparent'}`,
      color: active ? 'var(--gold)' : 'var(--text2)',
      fontSize: 12, padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
      textAlign: 'left', fontFamily: 'var(--sans)', fontWeight: active ? 500 : 400,
      transition: 'all 0.1s',
    }}>
      {children}
    </button>
  );
}

function StyleRow({ label, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>
      {children}
    </div>
  );
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '18px 20px' };
