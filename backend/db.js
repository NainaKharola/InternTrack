const { Pool } = require("pg");

const passwordLength = process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0;
console.log("🔌 PostgreSQL Connection Config:", {
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD ? `SET (length: ${passwordLength})` : "NOT SET",
});

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.query("SELECT current_database(), current_user, current_schema()")
  .then((res) => {
    console.log("✅ PostgreSQL connected successfully:", res.rows[0]);
  })
  .catch((err) => {
    console.error("❌ Fatal Database Connection Error:", err);
    process.exit(1);
  });

pool.on("error", (err) => {
  console.error("❌ PostgreSQL error:", err);
});

module.exports = pool;
