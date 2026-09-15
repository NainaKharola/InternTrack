const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Load .env from current dir or parent dir
const envPath = fs.existsSync(path.resolve(__dirname, ".env"))
  ? path.resolve(__dirname, ".env")
  : path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

const pool = fs.existsSync(path.resolve(__dirname, "db.js"))
  ? require("./db")
  : require("../db");

async function checkAndFixPaidStudents() {
  try {
    const res = await pool.query("SELECT id, student_data FROM students");
    console.log(`Found ${res.rows.length} total students.`);
    for (const row of res.rows) {
      const data = row.student_data || {};
      const ref = data.referenceId;
      console.log(`Updating student [${ref}] Name: ${data.name} (was: ${data.internshipType || "Unpaid"}) -> setting to Paid`);
      
      data.internshipType = "Paid";
      if (data.offerLetter) {
        data.offerLetter.internshipType = "Paid";
      }

      await pool.query(
        "UPDATE students SET student_data = $1 WHERE id = $2",
        [data, row.id]
      );
    }
    console.log("✅ Successfully updated all students in database to Paid!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to update students:", err);
    process.exit(1);
  }
}

checkAndFixPaidStudents();
