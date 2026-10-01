const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getTransporter() {
  return nodemailer.createTransport({ host: process.env.SMTP_HOST || 'smtp.gmail.com', port: parseInt(process.env.SMTP_PORT) || 587, secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }, tls: { rejectUnauthorized: false } });
}

function mdToHtml(md) {
  if (!md) return '';
  md = md.replace(/^Subject:.*$/im, '').trim();
  let html = '', inUl = false, inOl = false;
  const close = () => { if (inUl) { html += '</ul>'; inUl = false; } if (inOl) { html += '</ol>'; inOl = false; } };
  const il = t => t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  for (const line of md.split('\n')) {
    if (line.startsWith('### ')) { close(); html += `<h3>${il(line.slice(4))}</h3>`; }
    else if (line.startsWith('## ')) { close(); html += `<h2>${il(line.slice(3))}</h2>`; }
    else if (line.startsWith('# ')) { close(); html += `<h1>${il(line.slice(2))}</h1>`; }
    else if (line.match(/^[\*\-] /)) { if (!inUl) { html += '<ul>'; inUl = true; } html += `<li>${il(line.slice(2))}</li>`; }
    else if (line.trim() === '') { close(); }
    else { close(); html += `<p>${il(line)}</p>`; }
  }
  close();
  return html;
}

function buildHTML(subject, content, name, id, style = {}) {
  const { fontFamily = "Georgia,serif", fontSize = '16px', textColor = '#1a1a2e', bgColor = '#f4f4f8', cardColor = '#ffffff', accentColor = '#d4a843' } = style;
  const appUrl = process.env.APP_URL || 'https://agentra-newsletter.vercel.app';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${subject}</title></head><body style="margin:0;padding:0;background:${bgColor};font-family:${fontFamily};"><table width="100%" cellpadding="0" cellspacing="0" style="background:${bgColor};padding:32px 16px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${cardColor};border-radius:12px;overflow:hidden;"><tr><td style="background:${accentColor};padding:28px 40px;"><div style="font-size:22px;font-weight:700;color:#0a0a0f;">${subject}</div><div style="font-size:14px;color:rgba(0,0,0,0.6);margin-top:8px;">Hello ${name||'there'} 👋</div></td></tr><tr><td style="padding:36px 40px;font-size:${fontSize};line-height:1.85;color:${textColor};">${mdToHtml(content)}</td></tr><tr><td style="padding:18px 40px;background:#fafafa;"><p style="margin:0;font-size:12px;color:#999;">You subscribed to Agentra Newsletter. <a href="${appUrl}/api/subscribers/unsubscribe/${id}" style="color:#999;">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>`;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const parts = (req.url || '/').split('?')[0].split('/').filter(Boolean);

  try {
    if (req.method === 'GET' && parts.includes('verify')) {
      if (!process.env.SMTP_USER) return res.status(503).json({ ok: false, error: 'SMTP not configured' });
      try { await getTransporter().verify(); return res.json({ ok: true }); }
      catch (e) { return res.status(503).json({ ok: false, error: e.message }); }
    }

    if (req.method === 'POST' && parts.includes('test')) {
      const { email, subject, content, style } = req.body;
      if (!process.env.SMTP_USER) return res.status(503).json({ error: 'SMTP not configured' });
      await getTransporter().sendMail({ from: `"Agentra" <${process.env.SMTP_USER}>`, to: email, subject: `[TEST] ${subject}`, html: buildHTML(subject, content, 'Preview', 'test', style||{}) });
      return res.json({ message: `Test sent to ${email}` });
    }

    if (req.method === 'POST' && parts.includes('send')) {
      if (!process.env.SMTP_USER) return res.status(503).json({ error: 'SMTP not configured' });
      const { subject, content, newsletterId, style } = req.body;
      const { rows: active } = await pool.query(`SELECT * FROM subscribers WHERE status='active'`);
      if (!active.length) return res.status(400).json({ error: 'No active subscribers' });

      const t = getTransporter();
      const success = [], failed = [];
      for (const sub of active) {
        try {
          await t.sendMail({ from: `"${process.env.SENDER_NAME||'Agentra'}" <${process.env.SMTP_USER}>`, to: `"${sub.name}" <${sub.email}>`, subject, html: buildHTML(subject, content, sub.name, sub.id, style||{}), text: content.replace(/[#*`_]/g, '') });
          success.push(sub.email);
        } catch (e) { failed.push({ email: sub.email, error: e.message }); }
      }

      const logId = uuidv4();
      await pool.query(`INSERT INTO send_logs (id,newsletter_id,subject,recipient_count,recipients,failed,status) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [logId, newsletterId||null, subject, success.length, success, JSON.stringify(failed), failed.length === 0 ? 'sent' : success.length === 0 ? 'failed' : 'partial']);
      if (newsletterId) await pool.query(`UPDATE newsletters SET status='sent',sent_at=NOW() WHERE id=$1`, [newsletterId]);

      return res.json({ message: `Sent to ${success.length} of ${active.length} subscribers.`, success, failed, sentAt: new Date() });
    }

    res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
