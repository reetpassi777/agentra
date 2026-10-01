module.exports = (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), smtp: !!process.env.SMTP_USER, ai: !!process.env.MISTRAL_API_KEY });
};
