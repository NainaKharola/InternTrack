const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envPath = fs.existsSync(path.resolve(__dirname, ".env"))
  ? path.resolve(__dirname, ".env")
  : path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

const targetIds = [
  "IYIJXEY", "8DL8L6L", "E9SZUGS", "3RDLE0W", "8LCMYQR", "YZAPH6M", "BST1PNS", "YV56435", "7DF17IT"
];

async function cleanup() {
  for (const dbName of ["webportal", "Webportal"]) {
    try {
      const p = new Pool({
        host: process.env.DB_HOST || "127.0.0.1",
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
        database: dbName,
      });
      for (const id of targetIds) {
        await p.query("DELETE FROM students WHERE UPPER(student_data->>'referenceId') = $1", [id]);
      }
      await p.end();
    } catch (e) {}
  }
  console.log("Cleaned up test IDs from databases.");
  process.exit(0);
}

cleanup();
