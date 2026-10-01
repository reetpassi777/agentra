const express = require('express');
const router = express.Router();

router.get('/list', async (req, res) => {
  res.json([]);
});

router.post('/create', async (req, res) => {
  res.json({
    success: true
  });
});

module.exports = router;