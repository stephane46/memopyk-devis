const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const PORT = process.env.PORT || 3001;
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));

app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) => res.json({ name: "MEMOPYK API", status: "ok" }));

app.listen(PORT, () => {
  console.log(`API listening on ${PORT}`);
});
