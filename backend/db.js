const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "Webportal",
});

pool.on("connect", () => {
    console.log("✅ PostgreSQL connected");
});

pool.on("error", (err) => {
    console.error("❌ PostgreSQL error:", err.message);
});

module.exports = pool;