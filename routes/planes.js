const express = require("express");
const router = express.Router();
const { pool } = require("../db");

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
    res.json(rows.map(mapRowToPlan));
  } catch (e) {
    console.error(e);
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
    res.json(mapRowToPlan(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error leyendo plan" });
  }
});

function mapRowToPlan(r) {
  return {
    id: r.id,
    nombre: r.nombre,
    descripcionCorta: r.descripcion_corta || "",
    incluye: Array.isArray(r.incluye) ? r.incluye : (r.incluye || []),
    ataudes: Array.isArray(r.ataudes) ? r.ataudes : (r.ataudes || []),
    precio: r.precio === null ? null : Number(r.precio),
    tags: Array.isArray(r.tags) ? r.tags : (r.tags || []),
    activo: r.activo !== false,
    fotoPrincipal: r.foto_principal || { src: "", titulo: "" },
    galeria: Array.isArray(r.galeria) ? r.galeria : (r.galeria || []),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

module.exports = router;
