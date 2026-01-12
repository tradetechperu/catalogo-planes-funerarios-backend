const adminRouter = require("./routes/admin");
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const vehiculosRouter = require("./routes/vehiculos");
const uploadRouter = require("./routes/upload"); // <-- si tienes uploads

const app = express();

// IMPORTANTE: primero CORS, luego body/json, luego rutas
const allowedOrigins = [
  "http://localhost:3000",
  "https://catalogovehiculos.netlify.app",
];

// Permitir preflight de forma correcta
app.use(
  cors({
    origin: function (origin, cb) {
      // Permite requests sin origin (ej. health checks, curl, server-to-server)
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);

      return cb(new Error("Not allowed by CORS: " + origin));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-token"],
    credentials: false,
  })
);

// Responder preflight en todas las rutas
app.options("*", cors());

app.use(express.json());

// Servir imágenes estáticas
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// Health check
app.get("/health", (req, res) => res.json({ ok: true }));

// API
app.use("/api/vehiculos", vehiculosRouter);
app.use("/api/admin", adminRouter);
app.use("/api/upload", uploadRouter); // <-- si usas upload

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend activo en http://localhost:${PORT}`);
});
