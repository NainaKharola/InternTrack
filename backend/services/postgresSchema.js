const pool = require("../db");

async function ensurePostgresSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS students (id BIGSERIAL PRIMARY KEY, student_data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS admins (id BIGSERIAL PRIMARY KEY, admin_data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS gyapan (id BIGSERIAL PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS activity_logs (id BIGSERIAL PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS durations (id BIGSERIAL PRIMARY KEY, data JSONB NOT NULL);
    CREATE TABLE IF NOT EXISTS administration (id BIGSERIAL PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS colleges (id INTEGER PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS branches (id INTEGER PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE);
    CREATE INDEX IF NOT EXISTS idx_students_email ON students ((student_data->>'email'));
    CREATE INDEX IF NOT EXISTS idx_students_status ON students ((student_data->>'status'));
    CREATE INDEX IF NOT EXISTS idx_students_reference_id ON students ((student_data->>'referenceId'));
    CREATE INDEX IF NOT EXISTS idx_admins_email ON admins ((admin_data->>'email'));
  `);
}

module.exports = { ensurePostgresSchema };
