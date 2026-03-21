const express = require("express");
const multer  = require("multer");
const axios   = require("axios");
const cors    = require("cors");

const app    = express();
const upload = multer({ storage: multer.memoryStorage() });

// ── Config ──────────────────────────────────────────────────────────────────
const PORT      = process.env.PORT      || 3001;
const JAVA_HOST = process.env.JAVA_HOST || "http://localhost:7070";

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());                        // allow React dev server (port 5173)
app.use(express.json({ limit: "2mb" }));

// ── Helpers ──────────────────────────────────────────────────────────────────
async function compileCode(code, res) {
  try {
    const { data } = await axios.post(
      `${JAVA_HOST}/api/compile`,
      { code },
      { headers: { "Content-Type": "application/json" }, timeout: 15000 }
    );
    res.json(data);
  } catch (err) {
    // Java is down or timed out
    if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
      return res.status(503).json({
        error: "Java compiler service is not reachable. Make sure it is running on port 7070."
      });
    }
    // Java returned a 4xx/5xx
    const status  = err.response?.status  || 500;
    const message = err.response?.data?.error || err.message;
    res.status(status).json({ error: message });
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/compile
 * Body: { code: "<source string>" }
 * Forwards to Java and returns CompilerResult JSON.
 */
app.post("/api/compile", async (req, res) => {
  const { code } = req.body;
  if (!code || !code.trim()) {
    return res.status(400).json({ error: "Request body must contain a non-empty 'code' field." });
  }
  await compileCode(code, res);
});

/**
 * POST /api/upload
 * Multipart form: field name = "file", content = .py source file
 * Extracts text from uploaded file and compiles it.
 */
app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded. Send a .py file as multipart 'file' field." });
  }
  const code = req.file.buffer.toString("utf-8");
  if (!code.trim()) {
    return res.status(400).json({ error: "Uploaded file is empty." });
  }
  await compileCode(code, res);
});

/**
 * GET /api/health
 * Checks both Node and Java health.
 */
app.get("/api/health", async (req, res) => {
  let javaStatus = "unreachable";
  try {
    const { data } = await axios.get(`${JAVA_HOST}/api/health`, { timeout: 3000 });
    javaStatus = data.status ?? "ok";
  } catch (_) { /* java down */ }

  res.json({
    node:  "ok",
    java:  javaStatus,
    ports: { node: PORT, java: 7070 }
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Middleware running on http://localhost:${PORT}`);
  console.log(`Proxying compiler requests to ${JAVA_HOST}`);
});