const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const compileRouter = require('./routes/compile');
const uploadRouter  = require('./routes/upload');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/compile', compileRouter);
app.use('/api/upload',  uploadRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Error handler ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Middleware running on http://localhost:${PORT}`);
});