const fs = require("fs/promises");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const pool = require("../db");

const dataDirectory = path.join(__dirname, "..", "data");

async function loadJsonFile(fileName) {
  const filePath = path.join(dataDirectory, fileName);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(`⚠️  JSON file ${fileName} not found, skipping.`);
      return null;
    }
    throw error;
  }
}

async function run() {
  console.log("🚀 Initializing reference tables in PostgreSQL...");

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS colleges (
      id INT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE
    )
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id INT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS branches (
      id INT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE
    )
  `);

  const defaults = {
    courses: ["B.Tech", "M.Tech", "M.Sc", "PhD"],
    branches: [
      "Computer Science and Engineering",
      "Information Technology",
      "Electronics and Communication",
      "Electrical Engineering",
      "Mechanical Engineering",
      "Civil Engineering",
      "Aerospace Engineering",
      "Artificial Intelligence and Data Science",
    ],
  };

  console.log("✅ Tables created or verified.");

  // Migrate Colleges
  const colleges = await loadJsonFile("colleges.json");
  if (Array.isArray(colleges)) {
    console.log(`Migrating ${colleges.length} colleges...`);
    let count = 0;
    for (const c of colleges) {
      try {
        await pool.query(
          "INSERT INTO colleges (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name",
          [c.id, c.name]
        );
        count++;
      } catch (err) {
        // Handle name unique violation
      }
    }
    console.log(`✅ Migrated ${count} colleges.`);
  }

  // Migrate Courses
  let courses = await loadJsonFile("courses.json");
  if (!courses || !courses.length) {
    courses = defaults.courses.map((name, idx) => ({ id: idx + 1, name }));
  }
  if (Array.isArray(courses)) {
    console.log(`Migrating ${courses.length} courses...`);
    let count = 0;
    for (const c of courses) {
      try {
        await pool.query(
          "INSERT INTO courses (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name",
          [c.id, c.name]
        );
        count++;
      } catch (err) {
      }
    }
    console.log(`✅ Migrated ${count} courses.`);
  }

  // Migrate Branches
  let branches = await loadJsonFile("branches.json");
  if (!branches || !branches.length) {
    branches = defaults.branches.map((name, idx) => ({ id: idx + 1, name }));
  }
  if (Array.isArray(branches)) {
    console.log(`Migrating ${branches.length} branches...`);
    let count = 0;
    for (const b of branches) {
      try {
        await pool.query(
          "INSERT INTO branches (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name",
          [b.id, b.name]
        );
        count++;
      } catch (err) {
      }
    }
    console.log(`✅ Migrated ${count} branches.`);
  }

  console.log("🎉 Reference data migration completed!");
  await pool.end();
}

run().catch(err => {
  console.error("❌ Reference migration failed:", err);
  process.exit(1);
});
