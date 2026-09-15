const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envPath = fs.existsSync(path.resolve(__dirname, ".env"))
  ? path.resolve(__dirname, ".env")
  : path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

async function deepSearch() {
  const mainPool = new Pool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database: "postgres",
  });

  const dbs = await mainPool.query("SELECT datname FROM pg_database WHERE datistemplate = false");
  await mainPool.end();

  for (const db of dbs.rows) {
    try {
      const p = new Pool({
        host: process.env.DB_HOST || "127.0.0.1",
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
        database: db.datname,
      });

      const tables = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
      for (const t of tables.rows) {
        try {
          const rows = await p.query(`SELECT * FROM "${t.table_name}"`);
          const str = JSON.stringify(rows.rows);
          if (str.toLowerCase().includes("rohan") || str.toLowerCase().includes("smoke") || str.toLowerCase().includes("ishita")) {
            console.log(`🎯 FOUND in DB [${db.datname}] Table [${t.table_name}]! Count: ${rows.rows.length}`);
            for (const r of rows.rows) {
              console.log("Row:", JSON.stringify(r));
            }
          }
        } catch (err) {}
      }
      await p.end();
    } catch (err) {
      console.log(`Err on ${db.datname}:`, err.message);
    }
  }
}

deepSearch();
