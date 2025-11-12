const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const PORT = process.env.PORT || 3001;
const app = express();

// Build allow-list from env (comma-separated)
const allowList = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// CORS delegate: reflect allowed origin, disable for others — never throw
const corsDelegate = (req, cb) => {
  const origin = req.header("Origin");
  const isAllowed = origin && allowList.includes(origin);
  const options = {
    origin: isAllowed ? origin : false,
    credentials: true,
    methods: ["GET","HEAD","PUT","PATCH","POST","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization"],
    optionsSuccessStatus: 204
  };
  cb(null, options);
};

// Global CORS + explicit preflight handler
app.use(cors(corsDelegate));
app.options("*", cors(corsDelegate), (_req, res) => res.sendStatus(204));

app.use(express.json());
app.use(morgan("tiny"));

// Health & root
app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) => res.json({ name: "MEMOPYK API", status: "ok" }));

// Minimal docs route to keep a versioned path alive
app.get("/v1/docs", (_req, res) => {
  res.json({
    openapi: "3.1.0",
    info: { title: "MEMOPYK Quote System API", version: "0.1.0" }
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ code: "not_found", message: "Cannot " + req.method + " " + req.path });
});

// Error (never leak secrets/PII)
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ code: "internal_server_error", message: "An unexpected error occurred. Please try again later." });
});

app.listen(PORT, () => {
  console.log("API listening on " + PORT);
});
