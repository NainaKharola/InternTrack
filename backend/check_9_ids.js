const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envPath = fs.existsSync(path.resolve(__dirname, ".env"))
  ? path.resolve(__dirname, ".env")
  : path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

const targetIds = [
  "IYIJXEY",
  "8DL8L6L",
  "E9SZUGS",
  "3RDLE0W",
  "8LCMYQR",
  "YZAPH6M",
  "BST1PNS",
  "YV56435",
  "7DF17IT"
];

async function checkIds() {
  for (const dbName of ["Webportal", "webportal"]) {
    try {
      const p = new Pool({
        host: process.env.DB_HOST || "127.0.0.1",
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
        database: dbName,
      });

      console.log(`\n--- Checking DB: [${dbName}] ---`);
      const res = await p.query("SELECT id, student_data FROM students");
      console.log(`Total students in DB [${dbName}]: ${res.rows.length}`);
      
      const found = [];
      const notFound = [];
      
      for (const id of targetIds) {
        const row = res.rows.find(r => r.student_data?.referenceId?.toUpperCase() === id.toUpperCase());
        if (row) {
          found.push({ id, name: row.student_data.name, email: row.student_data.email, type: row.student_data.internshipType });
        } else {
          notFound.push(id);
        }
      }

      console.log(`Found (${found.length}):`, found);
      console.log(`Not Found (${notFound.length}):`, notFound);
      await p.end();
    } catch (err) {
      console.log(`Error checking ${dbName}:`, err.message);
    }
  }
  process.exit(0);
}

checkIds();
