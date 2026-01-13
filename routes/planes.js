const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const DATA_FILE = path.join(__dirname, "..", "data", "planes.json");

function readPlanes() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

// GET /api/planes  -> lista pública (solo activos)
router.get("/", (req, res) => {
  const planes = readPlanes().filter((p) => p && p.activo !== false);
  res.json(planes);
});

// GET /api/planes/:id -> detalle público
router.get("/:id", (req, res) => {
  const planes = readPlanes().filter((p) => p && p.activo !== false);
  const p = planes.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ message: "Plan no encontrado" });
  res.json(p);
});

module.exports = router;
