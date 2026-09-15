const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envPath = fs.existsSync(path.resolve(__dirname, ".env"))
  ? path.resolve(__dirname, ".env")
  : path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

async function cleanup() {
  for (const dbName of ["webportal", "Webportal"]) {
    const p = new Pool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD,
      database: dbName,
    });
    await p.query("DELETE FROM students WHERE student_data->>'referenceId' = 'TESTPAID01'");
    await p.end();
  }
  console.log("Cleanup done!");
  process.exit(0);
}

cleanup();
