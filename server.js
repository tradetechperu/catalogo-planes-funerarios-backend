const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const planesRouter = require("./routes/planes");
const uploadRouter = require("./routes/upload");
const adminPlanesRouter = require("./routes/adminPlanes");

const app = express();

// ===== CORS PRIMERO (robusto) =====
const allowedOrigins = new Set([
  "http://localhost:3000",
  "https://catalogo-planes-funerarios-frontend.netlify.app",
]);

if (process.env.FRONTEND_ORIGIN) {
  allowedOrigins.add(process.env.FRONTEND_ORIGIN.trim());
}

if (process.env.FRONTEND_ORIGINS) {
  process.env.FRONTEND_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((o) => allowedOrigins.add(o));
}

// Permitir Netlify previews (opcional)
const netlifyRegex = /^https:\/\/.*\.netlify\.app$/;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);

      if (allowedOrigins.has(origin) || netlifyRegex.test(origin)) {
        return cb(null, true);
      }

      // No lanzar error: simplemente no se agregan headers CORS
      return cb(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-token"],
    credentials: false,
    optionsSuccessStatus: 204,
  })
);

// Preflight para todo (IMPORTANTE: no usar "*" en tu versión)
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
