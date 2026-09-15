const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envPath = fs.existsSync(path.resolve(__dirname, ".env"))
  ? path.resolve(__dirname, ".env")
  : path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

async function listDbs() {
  const pool = new Pool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database: "postgres",
  });

  try {
    const dbs = await pool.query("SELECT datname FROM pg_database WHERE datistemplate = false");
    console.log("Databases in PostgreSQL:", dbs.rows.map(r => r.datname));

    for (const db of dbs.rows) {
      try {
        const dbPool = new Pool({
          host: process.env.DB_HOST || "127.0.0.1",
          port: process.env.DB_PORT || 5432,
          user: process.env.DB_USER || "postgres",
          password: process.env.DB_PASSWORD,
          database: db.datname,
        });
        const tables = await dbPool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log(`DB [${db.datname}] has tables:`, tables.rows.map(t => t.table_name));
        
        if (tables.rows.some(t => t.table_name === "students")) {
          const studentsCount = await dbPool.query("SELECT count(*) FROM students");
          console.log(`DB [${db.datname}] students count:`, studentsCount.rows[0].count);
          if (parseInt(studentsCount.rows[0].count) > 0) {
            const studentRows = await dbPool.query("SELECT id, student_data FROM students");
            for (const s of studentRows.rows) {
              const d = s.student_data || {};
              console.log(`  -> Student in [${db.datname}]: ${d.name} (${d.referenceId}), Type: ${d.internshipType}`);
              // UPDATE to Paid
              d.internshipType = "Paid";
              if (d.offerLetter) d.offerLetter.internshipType = "Paid";
              await dbPool.query("UPDATE students SET student_data = $1 WHERE id = $2", [d, s.id]);
              console.log(`  ✅ Updated ${d.name} to Paid in DB [${db.datname}]`);
            }
          }
        }
        await dbPool.end();
      } catch (err) {
        console.log(`Error checking db ${db.datname}:`, err.message);
      }
    }
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("Error connecting to postgres:", err);
    process.exit(1);
  }
}

listDbs();
