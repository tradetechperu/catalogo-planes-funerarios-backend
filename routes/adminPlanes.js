const express = require("express");
const { nanoid } = require("nanoid");
const jwt = require("jsonwebtoken");
const { pool } = require("../db");

const router = express.Router();

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ")
    ? auth.slice(7)
    : (req.headers["x-admin-token"] || "");

  if (!token) return res.status(401).json({ message: "No autorizado" });

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ message: "JWT_SECRET no configurado" });

    req.admin = jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

/**
 * LOGIN ADMIN
 * POST /api/admin/login
 */
router.post("/login", (req, res) => {
  const { user, pass } = req.body || {};

  const ADMIN_USER = (process.env.ADMIN_USER || "admin").trim();
  const ADMIN_PASS = String(process.env.ADMIN_PASS || "").trim();

  if (!ADMIN_PASS) {
    return res.status(500).json({ message: "ADMIN_PASS no configurado en el servidor (Render)." });
  }

  const u = String(user || "").trim();
  const p = String(pass || "").trim();

  if (u !== ADMIN_USER || p !== ADMIN_PASS) {
    return res.status(401).json({ message: "Credenciales inválidas" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ message: "JWT_SECRET no configurado" });

  const token = jwt.sign({ sub: u, role: "admin" }, secret, { expiresIn: "8h" });
  return res.json({ ok: true, token });
});

/**
 * GET /api/admin/planes
 */
router.get("/planes", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT id, nombre, descripcion_corta, incluye, ataudes, precio, tags, activo,
             foto_principal, galeria, created_at, updated_at
      FROM planes
      ORDER BY created_at DESC
      `
    );
    res.json(rows.map(mapRowToPlan));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error leyendo planes" });
  }
});

/**
 * POST /api/admin/planes
 */
router.post("/planes", requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const nuevo = normalizePayload(body);
    if (!nuevo.nombre) return res.status(400).json({ message: "El nombre del plan es obligatorio" });

    const id = nanoid(10);

    const { rows } = await pool.query(
      `
      INSERT INTO planes
        (id, nombre, descripcion_corta, incluye, ataudes, precio, tags, activo, foto_principal, galeria, created_at, updated_at)
      VALUES
        ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7::jsonb,$8,$9::jsonb,$10::jsonb, now(), now())
      RETURNING *
      `,
      [
        id,
        nuevo.nombre,
        nuevo.descripcionCorta,
        JSON.stringify(nuevo.incluye),
        JSON.stringify(nuevo.ataudes),
        nuevo.precio,
        JSON.stringify(nuevo.tags),
        nuevo.activo,
        JSON.stringify(nuevo.fotoPrincipal),
        JSON.stringify(nuevo.galeria),
      ]
    );

    res.status(201).json(mapRowToPlan(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error creando plan" });
  }
});

/**
 * PUT /api/admin/planes/:id
 */
router.put("/planes/:id", requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const upd = normalizePayload(body);

    if (!upd.nombre) return res.status(400).json({ message: "El nombre del plan es obligatorio" });

    const { rows } = await pool.query(
      `
      UPDATE planes
      SET nombre = $2,
          descripcion_corta = $3,
          incluye = $4::jsonb,
          ataudes = $5::jsonb,
          precio = $6,
          tags = $7::jsonb,
          activo = $8,
          foto_principal = $9::jsonb,
          galeria = $10::jsonb,
          updated_at = now()
      WHERE id = $1
      RETURNING *
      `,
      [
        req.params.id,
        upd.nombre,
        upd.descripcionCorta,
        JSON.stringify(upd.incluye),
        JSON.stringify(upd.ataudes),
        upd.precio,
        JSON.stringify(upd.tags),
        upd.activo,
        JSON.stringify(upd.fotoPrincipal),
        JSON.stringify(upd.galeria),
      ]
    );

    if (!rows.length) return res.status(404).json({ message: "No encontrado" });
    res.json(mapRowToPlan(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error actualizando plan" });
  }
});

/**
 * DELETE /api/admin/planes/:id
 */
router.delete("/planes/:id", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM planes WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "No encontrado" });
    res.json({ ok: true, removed: rows[0].id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error eliminando plan" });
  }
});

function normalizePayload(body) {
  return {
    nombre: String(body.nombre || "").trim(),
    descripcionCorta: String(body.descripcionCorta || "").trim(),
    incluye: Array.isArray(body.incluye) ? body.incluye.map(String).map(s => s.trim()).filter(Boolean) : [],
    ataudes: Array.isArray(body.ataudes) ? body.ataudes.map(String).map(s => s.trim()).filter(Boolean) : [],
    precio: body.precio === null || body.precio === undefined || body.precio === "" ? null : Number(body.precio),
    tags: Array.isArray(body.tags) ? body.tags.map(String).map(s => s.trim()).filter(Boolean) : [],
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
}

function mapRowToPlan(r) {
  return {
    id: r.id,
    nombre: r.nombre,
    descripcionCorta: r.descripcion_corta || "",
    incluye: r.incluye || [],
    ataudes: r.ataudes || [],
    precio: r.precio === null ? null : Number(r.precio),
    tags: r.tags || [],
    activo: r.activo !== false,
    fotoPrincipal: r.foto_principal || { src: "", titulo: "" },
    galeria: r.galeria || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

module.exports = router;
