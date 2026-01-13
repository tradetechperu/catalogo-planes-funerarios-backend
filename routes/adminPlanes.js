const express = require("express");
const fs = require("fs");
const path = require("path");
const { nanoid } = require("nanoid");
const jwt = require("jsonwebtoken");

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

function writePlanes(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
}

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ")
    ? auth.slice(7)
    : (req.headers["x-admin-token"] || "");

  if (!token) return res.status(401).json({ message: "No autorizado" });

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ message: "JWT_SECRET no configurado" });

    const payload = jwt.verify(token, secret);
    req.admin = payload;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

/**
 * =========================
 * LOGIN ADMIN
 * POST /api/admin/login
 * =========================
 */
router.post("/login", (req, res) => {
  const { user, pass } = req.body || {};

  const ADMIN_USER = (process.env.ADMIN_USER || "admin").trim();
  const ADMIN_PASS = String(process.env.ADMIN_PASS || "").trim(); // en prod DEBE venir de env

  // Si no configuraste ADMIN_PASS en Render, te lo digo claramente
  if (!ADMIN_PASS) {
    return res.status(500).json({
      message: "ADMIN_PASS no configurado en el servidor (Render).",
    });
  }

  const u = String(user || "").trim();
  const p = String(pass || "").trim();

  if (u !== ADMIN_USER || p !== ADMIN_PASS) {
    return res.status(401).json({ message: "Credenciales inválidas" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ message: "JWT_SECRET no configurado" });

  // token 8 horas (ajústalo si quieres)
  const token = jwt.sign({ sub: u, role: "admin" }, secret, { expiresIn: "8h" });

  return res.json({ ok: true, token });
});

/**
 * =========================
 * CRUD PLANES (ADMIN)
 * =========================
 */

// GET /api/admin/planes
router.get("/planes", requireAdmin, (req, res) => {
  res.json(readPlanes());
});

// POST /api/admin/planes
router.post("/planes", requireAdmin, (req, res) => {
  const list = readPlanes();
  const body = req.body || {};

  const nuevo = {
    id: nanoid(10),
    nombre: String(body.nombre || "").trim(),
    descripcionCorta: String(body.descripcionCorta || "").trim(),
    incluye: Array.isArray(body.incluye) ? body.incluye.map((x) => String(x).trim()).filter(Boolean) : [],
    ataudes: Array.isArray(body.ataudes) ? body.ataudes.map((x) => String(x).trim()).filter(Boolean) : [],
    precio: body.precio === null || body.precio === undefined || body.precio === "" ? null : Number(body.precio),
    tags: Array.isArray(body.tags) ? body.tags.map((x) => String(x).trim()).filter(Boolean) : [],
    activo: body.activo === undefined ? true : Boolean(body.activo),

    fotoPrincipal:
      body.fotoPrincipal && typeof body.fotoPrincipal === "object"
        ? { src: String(body.fotoPrincipal.src || ""), titulo: String(body.fotoPrincipal.titulo || "") }
        : { src: "", titulo: "" },

    galeria: Array.isArray(body.galeria)
      ? body.galeria
          .filter((x) => x && typeof x === "object")
          .map((x) => ({ src: String(x.src || ""), titulo: String(x.titulo || "") }))
          .filter((x) => x.src)
      : [],
  };

  if (!nuevo.nombre) return res.status(400).json({ message: "El nombre del plan es obligatorio" });

  list.unshift(nuevo);
  writePlanes(list);
  res.status(201).json(nuevo);
});

// PUT /api/admin/planes/:id
router.put("/planes/:id", requireAdmin, (req, res) => {
  const list = readPlanes();
  const idx = list.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "No encontrado" });

  const body = req.body || {};
  const curr = list[idx];

  const updated = {
    ...curr,
    nombre: body.nombre !== undefined ? String(body.nombre || "").trim() : curr.nombre,
    descripcionCorta: body.descripcionCorta !== undefined ? String(body.descripcionCorta || "").trim() : curr.descripcionCorta,
    incluye: Array.isArray(body.incluye) ? body.incluye.map((x) => String(x).trim()).filter(Boolean) : curr.incluye,
    ataudes: Array.isArray(body.ataudes) ? body.ataudes.map((x) => String(x).trim()).filter(Boolean) : curr.ataudes,
    precio:
      body.precio !== undefined
        ? (body.precio === null || body.precio === "" ? null : Number(body.precio))
        : curr.precio,
    tags: Array.isArray(body.tags) ? body.tags.map((x) => String(x).trim()).filter(Boolean) : curr.tags,
    activo: body.activo !== undefined ? Boolean(body.activo) : curr.activo,
    fotoPrincipal:
      body.fotoPrincipal && typeof body.fotoPrincipal === "object"
        ? { src: String(body.fotoPrincipal.src || ""), titulo: String(body.fotoPrincipal.titulo || "") }
        : curr.fotoPrincipal,
    galeria: Array.isArray(body.galeria)
      ? body.galeria
          .filter((x) => x && typeof x === "object")
          .map((x) => ({ src: String(x.src || ""), titulo: String(x.titulo || "") }))
          .filter((x) => x.src)
      : curr.galeria,
  };

  if (!updated.nombre) return res.status(400).json({ message: "El nombre del plan es obligatorio" });

  list[idx] = updated;
  writePlanes(list);
  res.json(updated);
});

// DELETE /api/admin/planes/:id
router.delete("/planes/:id", requireAdmin, (req, res) => {
  const list = readPlanes();
  const idx = list.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "No encontrado" });

  const removed = list.splice(idx, 1)[0];
  writePlanes(list);
  res.json({ ok: true, removed });
});

module.exports = router;
