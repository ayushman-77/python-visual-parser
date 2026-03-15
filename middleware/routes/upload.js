const express = require('express');
const multer  = require('multer');
const axios   = require('axios');
const path    = require('path');
const router  = express.Router();

const JAVA_API = process.env.JAVA_API_URL || 'http://localhost:7070';

// Store files in memory (no disk writes needed)
const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB max
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.java' || ext === '.txt') {
      cb(null, true);
    } else {
      cb(new Error('Only .java or .txt files are accepted.'));
    }
  },
});

/**
 * POST /api/upload
 * Multipart form-data with field "file" containing a .java file.
 * Reads the file content and compiles it via the Java backend.
 */
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
  }

  const code = req.file.buffer.toString('utf-8');

  try {
    const { data } = await axios.post(`${JAVA_API}/compile`, { code }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15_000,
    });
    return res.json({ filename: req.file.originalname, ...data });
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'Java compiler backend is not running.',
      });
    }
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;