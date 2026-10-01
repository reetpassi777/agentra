const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE,
      preferences TEXT[], frequency TEXT DEFAULT 'weekly',
      status TEXT DEFAULT 'pending', verify_token TEXT,
      joined_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS newsletters (
      id TEXT PRIMARY KEY, subject TEXT, content TEXT,
      format TEXT, tone TEXT, word_limit INT,
      status TEXT DEFAULT 'draft',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      sent_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS send_logs (
      id TEXT PRIMARY KEY, newsletter_id TEXT, subject TEXT,
      recipient_count INT, recipients TEXT[],
      failed JSONB DEFAULT '[]', status TEXT DEFAULT 'sent',
      sent_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}
init().catch(console.error);

function toSub(r) {
  return { id: r.id, name: r.name, email: r.email, preferences: r.preferences, frequency: r.frequency, status: r.status, verifyToken: r.verify_token, joinedAt: r.joined_at };
}
function toNl(r) {
  return { id: r.id, subject: r.subject, content: r.content, format: r.format, tone: r.tone, wordLimit: r.word_limit, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at, sentAt: r.sent_at };
}
function toLog(r) {
  return { id: r.id, newsletterId: r.newsletter_id, subject: r.subject, recipientCount: r.recipient_count, recipients: r.recipients, failed: r.failed, status: r.status, sentAt: r.sent_at };
}

const db = {
  async getAllSubscribers() {
    const { rows } = await pool.query('SELECT * FROM subscribers ORDER BY joined_at DESC');
    return rows.map(toSub);
  },
  async getSubscriberByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM subscribers WHERE email=$1', [email]);
    return rows[0] ? toSub(rows[0]) : null;
  },
  async getSubscriberById(id) {
    const { rows } = await pool.query('SELECT * FROM subscribers WHERE id=$1', [id]);
    return rows[0] ? toSub(rows[0]) : null;
  },
  async addSubscriber(data) {
    const id = uuidv4(), token = uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO subscribers (id,name,email,preferences,frequency,status,verify_token)
       VALUES ($1,$2,$3,$4,$5,'pending',$6) RETURNING *`,
      [id, data.name, data.email, data.preferences || ['General'], data.frequency || 'weekly', token]
    );
    return toSub(rows[0]);
  },
  async verifySubscriber(token) {
    const { rows } = await pool.query(
      `UPDATE subscribers SET status='active',verify_token=NULL WHERE verify_token=$1 RETURNING *`, [token]
    );
    return rows[0] ? toSub(rows[0]) : null;
  },
  async removeSubscriber(id) {
    const { rowCount } = await pool.query('DELETE FROM subscribers WHERE id=$1', [id]);
    return rowCount > 0;
  },
  async updateSubscriberStatus(id, status) {
    const { rows } = await pool.query('UPDATE subscribers SET status=$1 WHERE id=$2 RETURNING *', [status, id]);
    return rows[0] ? toSub(rows[0]) : null;
  },
  async unsubscribeById(id) {
    const { rows } = await pool.query(`UPDATE subscribers SET status='inactive' WHERE id=$1 RETURNING *`, [id]);
    return rows[0] ? toSub(rows[0]) : null;
  },
  async getStats() {
    const { rows: s } = await pool.query(`SELECT COUNT(*) total, COUNT(*) FILTER (WHERE status='active') active, COUNT(*) FILTER (WHERE status='pending') pending, COUNT(*) FILTER (WHERE status='inactive') inactive FROM subscribers`);
    const { rows: l } = await pool.query('SELECT COUNT(*) total FROM send_logs');
    const { rows: p } = await pool.query('SELECT unnest(preferences) pref FROM subscribers');
    const freq = {};
    p.forEach(r => (freq[r.pref] = (freq[r.pref] || 0) + 1));
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    return { total: +s[0].total, active: +s[0].active, pending: +s[0].pending, inactive: +s[0].inactive, totalSent: +l[0].total, topCategory: top ? top[0] : null };
  },
  async getAllNewsletters() {
    const { rows } = await pool.query('SELECT * FROM newsletters ORDER BY created_at DESC');
    return rows.map(toNl);
  },
  async saveNewsletter(data) {
    const id = data.id || uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO newsletters (id,subject,content,format,tone,word_limit,status)
       VALUES ($1,$2,$3,$4,$5,$6,'draft')
       ON CONFLICT (id) DO UPDATE SET subject=$2,content=$3,format=$4,tone=$5,word_limit=$6,updated_at=NOW()
       RETURNING *`,
      [id, data.subject, data.content, data.format, data.tone, data.wordLimit || null]
    );
    return toNl(rows[0]);
  },
  async updateNewsletter(id, fields) {
    const { rows } = await pool.query(
      `UPDATE newsletters SET subject=COALESCE($2,subject),content=COALESCE($3,content),status=COALESCE($4,status),updated_at=NOW() WHERE id=$1 RETURNING *`,
      [id, fields.subject, fields.content, fields.status]
    );
    return rows[0] ? toNl(rows[0]) : null;
  },
  async addSendLog(data) {
    const id = uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO send_logs (id,newsletter_id,subject,recipient_count,recipients,failed,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, data.newsletterId||null, data.subject, data.recipientCount, data.recipients, JSON.stringify(data.failed||[]), data.status||'sent']
    );
    if (data.newsletterId) await pool.query(`UPDATE newsletters SET status='sent',sent_at=NOW() WHERE id=$1`, [data.newsletterId]);
    return toLog(rows[0]);
  },
  async getAllSendLogs() {
    const { rows } = await pool.query('SELECT * FROM send_logs ORDER BY sent_at DESC');
    return rows.map(toLog);
  },
};

module.exports = db;
