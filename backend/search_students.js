const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envPath = fs.existsSync(path.resolve(__dirname, ".env"))
  ? path.resolve(__dirname, ".env")
  : path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

async function searchAll() {
  for (const dbName of ["Webportal", "webportal", "postgres"]) {
    try {
      const dbPool = new Pool({
        host: process.env.DB_HOST || "127.0.0.1",
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
        database: dbName,
      });
      const res = await dbPool.query("SELECT id, student_data FROM students");
      console.log(`DB [${dbName}] total students: ${res.rows.length}`);
      for (const row of res.rows) {
        console.log(`[${dbName}] ID: ${row.id}, Ref: ${row.student_data?.referenceId}, Name: ${row.student_data?.name}, Type: ${row.student_data?.internshipType}`);
      }
      await dbPool.end();
    } catch (e) {
      console.log(`Error on ${dbName}:`, e.message);
    }
  }
}

searchAll();
