const express = require('express');
const axios   = require('axios');
const router  = express.Router();

const JAVA_API = process.env.JAVA_API_URL || 'http://localhost:7070';

router.post('/', async (req, res) => {
  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Request body must contain a "code" string.' });
  }

  try {
    const { data } = await axios.post(`${JAVA_API}/compile`, { code }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15_000,
    });
    return res.json(data);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'Java compiler backend is not running. Start it with: mvn exec:java',
      });
    }
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;