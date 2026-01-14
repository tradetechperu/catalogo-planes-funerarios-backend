const express = require("express");
const router = express.Router();
const pool = require("../db");

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

    // Evita 304 / caché del navegador y proxies (Cloudflare/Render)
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");

    res.json(rows.map(mapRowToPlan));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error leyendo planes" });
  }
});

// GET /api/planes/:id -> detalle público (solo activos)
router.get("/:id", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT
        id, nombre, descripcion_corta, incluye, ataudes, precio, tags,
        activo, foto_principal, galeria, created_at, updated_at
       FROM planes
       WHERE id = $1 AND activo IS DISTINCT FROM false`,
      [req.params.id]
    );

    if (r.rowCount === 0) return res.status(404).json({ message: "Plan no encontrado" });
    // Evita 304 / caché del navegador y proxies
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error obteniendo plan" });
  }
});

module.exports = router;
