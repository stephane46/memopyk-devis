const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const PORT = process.env.PORT || 3001;
const app = express();

const allowList = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "https://memopyk.com",
  "https://www.memopyk.com",
];

function describeLayerPath(layer) {
  if (layer?.route?.path) {
    return layer.route.path;
  }

  if (layer?.regexp?.fast_slash) {
    return "/";
  }

  const source = layer?.regexp?.source;
  if (!source) {
    return "";
  }

  return source
    .replace(/\\\//g, "/")
    .replace(/\^/, "")
    .replace(/\$|\(\?=\\\/\|\$\)|\(\?=\/\|\$\)/g, "")
    .replace(/\\\?/, "")
    .replace(/\(\?:\^\)/, "")
    .replace(/\/+$/, "");
}

function snapshotRouter(router) {
  const stack = Array.isArray(router?.stack) ? router.stack : [];

  return stack.map((layer) => {
    if (layer?.route) {
      const methods = Object.keys(layer.route.methods || {}).filter(
        (method) => Boolean(layer.route.methods?.[method])
      );

      return {
        type: "route",
        path: layer.route.path,
        methods: methods.map((method) => method.toUpperCase()),
      };
    }

    if (layer?.name === "router" && layer?.handle) {
      return {
        type: "router",
        path: describeLayerPath(layer),
        children: snapshotRouter(layer.handle),
      };
    }

    return {
      type: "layer",
      name: layer?.name || "<anonymous>",
    };
  });
}

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowList.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  })
);

app.options("*", cors());

app.use(express.json());
app.use(morgan("tiny"));

let apiRouter;
try {
  // The versioned API is authored in TypeScript and compiled to dist/ via tsup.
  // We lazily require it here so the server can still boot even if a build
  // has not been produced yet (e.g. fresh checkout).
  const compiled = require("./dist/routes");
  apiRouter = compiled?.default || compiled?.router;

  if (!apiRouter) {
    const fallback = require("./dist/routes/v1");
    apiRouter = fallback?.default || fallback?.router;
  }
} catch (err) {
  console.warn("[bootstrap] /v1 routes unavailable", { message: err?.message });
}

if (apiRouter) {
  const snapshot = snapshotRouter(apiRouter);
  console.log("[bootstrap] /v1 router snapshot", JSON.stringify(snapshot));
  app.use("/v1", apiRouter);
} else {
  console.warn("[bootstrap] /v1 router not mounted");
}

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
  res.status(404).json({
    error: {
      code: "not_found",
      message: "Cannot " + req.method + " " + req.path,
    },
  });
});

// Error (never leak secrets/PII)
app.use((err, _req, res, _next) => {
  const status = typeof err?.status === "number" ? err.status : 500;
  const code = typeof err?.code === "string" ? err.code : "internal_server_error";
  const message =
    status >= 500
      ? "An unexpected error occurred. Please try again later."
      : err?.message || "Request failed.";

  if (status >= 500) {
    console.error(err);
  } else {
    console.warn("[request_error]", { code, message });
  }

  const payload = { code, message };
  if (err?.details) {
    payload.details = err.details;
  }

  res.status(status).json({ error: payload });
});

app.listen(PORT, () => {
  console.log("API listening on " + PORT);
});
