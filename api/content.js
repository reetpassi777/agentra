const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function initDb() {
  await pool.query(`
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

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  await initDb();
  const parts = (req.url || '/').split('?')[0].split('/').filter(Boolean);

  try {
    if (req.method === 'GET' && parts.includes('history')) {
      const { rows } = await pool.query('SELECT * FROM newsletters ORDER BY created_at DESC');
      return res.json({ newsletters: rows });
    }

    if (req.method === 'GET' && parts.includes('logs')) {
      const { rows } = await pool.query('SELECT * FROM send_logs ORDER BY sent_at DESC');
      return res.json({ logs: rows });
    }

    if (req.method === 'POST' && parts.includes('generate')) {
      const { prompt, format, tone, wordLimit } = req.body;
      if (!prompt) return res.status(400).json({ error: 'Prompt required' });
      const apiKey = process.env.MISTRAL_API_KEY;
      if (!apiKey) return res.status(503).json({ error: 'MISTRAL_API_KEY not configured' });

      const formats = { newsletter: 'a structured email newsletter with Subject line, greeting, sections, call-to-action, sign-off.', article: 'a well-structured article with Title, introduction, sections, conclusion.', report: 'a professional report with Title, executive summary, findings, recommendations.', summary: 'a concise summary with key points and conclusion.' };
      const system = `You are an expert newsletter writer. Write ${formats[format]||formats.newsletter} Use a ${tone||'professional'} tone.${wordLimit ? ` About ${wordLimit} words.` : ''} Always start with "Subject: [subject]" on the first line.`;

      const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: process.env.MISTRAL_MODEL || 'mistral-small-latest', max_tokens: wordLimit ? Math.round(wordLimit * 1.8) : 2048, temperature: 0.7, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] })
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.message || 'Mistral error' });

      const content = data.choices[0].message.content;
      const subjectMatch = content.match(/^Subject:\s*(.+)/im);
      const subject = subjectMatch ? subjectMatch[1].trim() : prompt.slice(0, 80);
      const id = uuidv4();
      await pool.query(`INSERT INTO newsletters (id,subject,content,format,tone,word_limit,status) VALUES ($1,$2,$3,$4,$5,$6,'draft')`, [id, subject, content, format, tone, wordLimit || null]);
      return res.json({ id, subject, content, wordCount: content.trim().split(/\s+/).length, format, tone, createdAt: new Date() });
    }

    if (req.method === 'PATCH') {
      const id = parts[parts.length - 1];
      const { subject, content } = req.body;
      const { rows } = await pool.query(`UPDATE newsletters SET subject=COALESCE($2,subject),content=COALESCE($3,content),updated_at=NOW() WHERE id=$1 RETURNING *`, [id, subject, content]);
      return res.json({ newsletter: rows[0] });
    }

    res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
