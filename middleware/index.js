const express = require("express");
const multer  = require("multer");
const axios   = require("axios");
const cors    = require("cors");

const app    = express();
const upload = multer({ storage: multer.memoryStorage() });

const PORT      = process.env.PORT      || 3001;
const JAVA_HOST = process.env.JAVA_HOST || "http://localhost:7070";

app.use(cors());
app.use(express.json({ limit: "2mb" }));

async function compileCode(code, res) {
  try {
    const { data } = await axios.post(
      `${JAVA_HOST}/api/compile`,
      { code },
      { headers: { "Content-Type": "application/json" }, timeout: 15000 }
    );
    res.json(data);
  } catch (err) {
    if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
      return res.status(503).json({
        error: "Java compiler service is not reachable. Make sure it is running on port 7070."
      });
    }
    const status  = err.response?.status  || 500;
    const message = err.response?.data?.error || err.message;
    res.status(status).json({ error: message });
  }
}

app.post("/api/compile", async (req, res) => {
  const { code } = req.body;
  if (!code || !code.trim()) {
    return res.status(400).json({ error: "Request body must contain a non-empty 'code' field." });
  }
  await compileCode(code, res);
});

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

app.get("/api/health", async (req, res) => {
  let javaStatus = "unreachable";
  try {
    const { data } = await axios.get(`${JAVA_HOST}/api/health`, { timeout: 3000 });
    javaStatus = data.status ?? "ok";
  } catch (_) {}

  res.json({
    node:  "ok",
    java:  javaStatus,
    ports: { node: PORT, java: 7070 }
  });
});

app.listen(PORT, () => {
  console.log(`Middleware running on http://localhost:${PORT}`);
  console.log(`Proxying compiler requests to ${JAVA_HOST}`);
});