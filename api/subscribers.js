const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  rejectUnauthorized: false
});
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE,
      preferences TEXT[], frequency TEXT DEFAULT 'weekly',
      status TEXT DEFAULT 'pending', verify_token TEXT,
      joined_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS send_logs (
      id TEXT PRIMARY KEY, newsletter_id TEXT, subject TEXT,
      recipient_count INT, recipients TEXT[],
      failed JSONB DEFAULT '[]', status TEXT DEFAULT 'sent',
      sent_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

function toSub(r) {
  return { id: r.id, name: r.name, email: r.email, preferences: r.preferences, frequency: r.frequency, status: r.status, verifyToken: r.verify_token, joinedAt: r.joined_at };
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  await initDb();
  const parts = (req.url || '/').split('?')[0].split('/').filter(Boolean);

  try {
    if (req.method === 'GET' && parts.includes('stats')) {
      const { rows: s } = await pool.query(`SELECT COUNT(*) total, COUNT(*) FILTER (WHERE status='active') active, COUNT(*) FILTER (WHERE status='pending') pending, COUNT(*) FILTER (WHERE status='inactive') inactive FROM subscribers`);
      const { rows: l } = await pool.query('SELECT COUNT(*) total FROM send_logs').catch(() => ([{ rows: [{ total: 0 }] }]));
      return res.json({ total: +s[0].total, active: +s[0].active, pending: +s[0].pending, inactive: +s[0].inactive, totalSent: +l[0].total });
    }

    if (req.method === 'GET' && parts.includes('verify')) {
      const token = parts[parts.indexOf('verify') + 1];
      const { rows } = await pool.query(`UPDATE subscribers SET status='active', verify_token=NULL WHERE verify_token=$1 RETURNING *`, [token]);
      if (!rows[0]) return res.status(400).send('<h2>Invalid link.</h2>');
      return res.send(`<html><body style="font-family:Arial;text-align:center;padding:80px;background:#f4f4f8;"><h1 style="color:#3d9e6a">Confirmed!</h1><p>Hi ${rows[0].name}, you are subscribed.</p></body></html>`);
    }

    if (req.method === 'GET' && parts.includes('unsubscribe')) {
      const id = parts[parts.indexOf('unsubscribe') + 1];
      const { rows } = await pool.query(`UPDATE subscribers SET status='inactive' WHERE id=$1 RETURNING *`, [id]);
      if (!rows[0]) return res.status(400).send('<h2>Not found.</h2>');
      return res.send(`<html><body style="font-family:Arial;text-align:center;padding:80px;background:#f4f4f8;"><h1 style="color:#555">Unsubscribed</h1><p>${rows[0].email} removed.</p></body></html>`);
    }

    if (req.method === 'GET') {
      const search = new URLSearchParams((req.url || '').split('?')[1] || '').get('search') || '';
      let { rows } = await pool.query('SELECT * FROM subscribers ORDER BY joined_at DESC');
      if (search) rows = rows.filter(r => r.email.toLowerCase().includes(search.toLowerCase()) || r.name.toLowerCase().includes(search.toLowerCase()));
      return res.json({ subscribers: rows.map(toSub), total: rows.length });
    }

    if (req.method === 'POST') {
      const { name, email, preferences, frequency } = req.body;
      if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
      const existing = await pool.query('SELECT * FROM subscribers WHERE email=$1', [email]);
      if (existing.rows[0]) {
        if (existing.rows[0].status === 'active') return res.status(409).json({ error: 'Already subscribed.' });
        if (existing.rows[0].status === 'pending') return res.status(409).json({ error: 'Check your email to confirm.' });
      }
      const id = uuidv4(), token = uuidv4();
      const { rows } = await pool.query(
        `INSERT INTO subscribers (id,name,email,preferences,frequency,status,verify_token) VALUES ($1,$2,$3,$4,$5,'pending',$6) RETURNING *`,
        [id, name, email, preferences || ['General'], frequency || 'weekly', token]
      );
      const appUrl = process.env.APP_URL || 'https://agentra-newsletter.vercel.app';
      const verifyUrl = `${appUrl}/api/subscribers/verify/${token}`;
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const t = nodemailer.createTransport({ host: process.env.SMTP_HOST || 'smtp.gmail.com', port: 587, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }, tls: { rejectUnauthorized: false } });
          await t.sendMail({ from: `"${process.env.SENDER_NAME||'Agentra'}" <${process.env.SMTP_USER}>`, to: `"${name}" <${email}>`, subject: 'Confirm your subscription', html: `<div style="font-family:Arial;max-width:500px;margin:auto;padding:32px;background:#f4f4f8;border-radius:12px;"><h2>Confirm subscription</h2><p>Hi ${name}, click below.</p><a href="${verifyUrl}" style="display:inline-block;background:#d4a843;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Confirm</a></div>` });
        } catch (e) { console.error('[Email]', e.message); }
      }
      return res.status(201).json({ message: 'Check your email to confirm!', subscriber: toSub(rows[0]) });
    }

    if (req.method === 'DELETE') {
      const id = parts[parts.length - 1];
      await pool.query('DELETE FROM subscribers WHERE id=$1', [id]);
      return res.json({ message: 'Removed' });
    }

    if (req.method === 'PUT') {
      const id = parts[parts.indexOf('subscribers') + 1] || parts[parts.length - 2];
      const { status } = req.body;
      const { rows } = await pool.query('UPDATE subscribers SET status=$1 WHERE id=$2 RETURNING *', [status, id]);
      return res.json({ subscriber: toSub(rows[0]) });
    }

    res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
