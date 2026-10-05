require("dotenv").config();
const { Pool } = require("pg");

const dbHost = process.env.DB_HOST || "127.0.0.1";
const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432;
const dbName = process.env.DB_NAME || "webportal";
const dbUser = process.env.DB_USER || "postgres";

console.log("🔔 PostgreSQL Connection Config:", {
  DB_HOST: dbHost,
  DB_PORT: dbPort,
  DB_NAME: dbName,
  DB_USER: dbUser,
});

const pool = new Pool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: process.env.DB_PASSWORD,
  database: dbName,
});

pool.query("SELECT current_database(), current_user, current_schema()")
  .then((res) => {
    console.log("✅ PostgreSQL connected successfully:", res.rows[0]);
  })
  .catch((err) => {
    console.error("❌ Fatal Database Connection Error:", err.message || err);
    process.exit(1);
  });

pool.on("error", (err) => {
  console.error("❌ PostgreSQL error:", err.message || err);
});

module.exports = pool;
