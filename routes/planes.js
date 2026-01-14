const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// Helper: parseo robusto para json/jsonb que a veces llega como string
function safeJson(v, fallback) {
  if (v === null || v === undefined) return fallback;
  if (Array.isArray(v) || typeof v === "object") return v;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function mapRowToPlan(r) {
  const incluye = safeJson(r.incluye, []);
  const ataudes = safeJson(r.ataudes, []);
  const tags = safeJson(r.tags, []);
  const galeria = safeJson(r.galeria, []);
  const fotoPrincipal = safeJson(r.foto_principal, { src: "", titulo: "" });

  return {
    id: r.id,
    nombre: r.nombre,
    descripcionCorta: r.descripcion_corta || "",
    incluye: Array.isArray(incluye) ? incluye : [],
    ataudes: Array.isArray(ataudes) ? ataudes : [],
    precio: r.precio === null ? null : Number(r.precio),
    tags: Array.isArray(tags) ? tags : [],
    activo: r.activo !== false,
    fotoPrincipal: fotoPrincipal && typeof fotoPrincipal === "object" ? fotoPrincipal : { src: "", titulo: "" },
    galeria: Array.isArray(galeria) ? galeria : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// GET /api/planes -> lista pública (solo activos)
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT id, nombre, descripcion_corta, incluye, ataudes, precio, tags, activo,
             foto_principal, galeria, created_at, updated_at
      FROM planes
      WHERE activo = true
      ORDER BY created_at DESC
      `
    );

    // (opcional) anti-cache para evitar 304
    res.set("Cache-Control", "no-store");

    res.json(rows.map(mapRowToPlan));
  } catch (e) {
    // Log real para Render
    console.error("ERROR /api/planes:", {
      message: e?.message,
      code: e?.code,
      detail: e?.detail,
      where: e?.where,
      stack: e?.stack,
    });

    res.status(500).json({ message: "Error leyendo planes" });
  }
});

// GET /api/planes/:id -> detalle público
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT id, nombre, descripcion_corta, incluye, ataudes, precio, tags, activo,
             foto_principal, galeria, created_at, updated_at
      FROM planes
      WHERE id = $1 AND activo = true
      `,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: "Plan no encontrado" });

    res.set("Cache-Control", "no-store");
    res.json(mapRowToPlan(rows[0]));
  } catch (e) {
    console.error("ERROR /api/planes/:id:", {
      message: e?.message,
      code: e?.code,
      detail: e?.detail,
      where: e?.where,
      stack: e?.stack,
    });

    res.status(500).json({ message: "Error leyendo plan" });
  }
});

module.exports = router;
