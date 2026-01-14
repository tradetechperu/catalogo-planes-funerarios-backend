const { Pool } = require("pg");

function getPool() {
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("DATABASE_URL no está configurado");

  const isProd = process.env.NODE_ENV === "production";
  const needsSSL = isProd; // Render prod normalmente requiere SSL

  return new Pool({
    connectionString: cs,
    ssl: needsSSL ? { rejectUnauthorized: false } : false,
  });
}

const pool = getPool();

module.exports = { pool };
