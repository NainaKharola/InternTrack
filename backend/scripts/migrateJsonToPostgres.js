const fs = require("fs");
const path = require("path");
const db = require("../db");

function readJson(file) {
    const filePath = path.join(__dirname, "..", "data", file);
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function migrate() {
    try {
        // Students
        const students = readJson("students.json");

        for (const student of students) {
            await db.query(
                `INSERT INTO students (student_data)
                 VALUES ($1)`,
                [JSON.stringify(student)]
            );
        }

        console.log(`✅ Migrated ${students.length} students`);

        // Admins
        const admins = readJson("admins.json");

        for (const admin of admins) {
            await db.query(
                `INSERT INTO admins (admin_data)
                 VALUES ($1)`,
                [JSON.stringify(admin)]
            );
        }

        console.log(`✅ Migrated ${admins.length} admins`);

        // Administration
        const administration = readJson("administration.json");

        for (const item of administration) {
            await db.query(
                `INSERT INTO administration (data)
                 VALUES ($1)`,
                [JSON.stringify(item)]
            );
        }

        console.log(`✅ Migrated administration data`);

        // Gyapan
        const gyapan = readJson("gyapan.json");

        for (const item of gyapan) {
            await db.query(
                `INSERT INTO gyapan (data)
                 VALUES ($1)`,
                [JSON.stringify(item)]
            );
        }

        console.log(`✅ Migrated gyapan data`);

        // Activity logs
        const logs = readJson("activityLogs.json");

        for (const item of logs) {
            await db.query(
                `INSERT INTO activity_logs (data)
                 VALUES ($1)`,
                [JSON.stringify(item)]
            );
        }

        console.log(`✅ Migrated activity logs`);

        // Durations
        const durations = readJson("durations.json");

        for (const item of durations) {
            await db.query(
                `INSERT INTO durations (data)
                 VALUES ($1)`,
                [JSON.stringify(item)]
            );
        }

        console.log(`✅ Migrated durations`);

        console.log("🎉 JSON → PostgreSQL migration completed");

    } catch (error) {
        console.error("❌ Migration failed:", error);
    } finally {
        await db.end();
    }
}

migrate();