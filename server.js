const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const planesRouter = require("./routes/planes");
const uploadRouter = require("./routes/upload");
const adminPlanesRouter = require("./routes/adminPlanes");

const app = express();

// ===== CORS PRIMERO =====
// En Render define FRONTEND_ORIGIN con tu Netlify final.
// Local: localhost.
const allowedOrigins = ["http://localhost:3000"];
if (process.env.FRONTEND_ORIGIN) allowedOrigins.push(process.env.FRONTEND_ORIGIN);

app.use(
  cors({
    origin: function (origin, cb) {
      if (!origin) return cb(null, true); // curl/healthchecks
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS: " + origin));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-token"],
    credentials: false,
  })
);

// Preflight para todo
app.options(/.*/, cors());

// ===== BODY PARSER =====
app.use(express.json({ limit: "10mb" }));

// ===== STATIC FILES =====
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// ===== HEALTH =====
app.get("/health", (req, res) => res.json({ ok: true }));

// ===== API PUBLICA =====
app.use("/api/planes", planesRouter);

// ===== API ADMIN =====
app.use("/api/admin", adminPlanesRouter);
app.use("/api/upload", uploadRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend activo en puerto ${PORT}`));
