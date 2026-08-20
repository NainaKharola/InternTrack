const pool = require("../db");

function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

function comparableName(name) {
  return normalizeName(name).toLocaleLowerCase("en-US");
}

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function readColleges() {
  try {
    const res = await pool.query("SELECT id, name FROM colleges ORDER BY name ASC");
    return res.rows;
  } catch (error) {
    throw createError(`Unable to read college data: ${error.message}`, 500);
  }
}

async function saveColleges(colleges) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM colleges");
    for (const c of colleges) {
      await client.query("INSERT INTO colleges (id, name) VALUES ($1, $2)", [c.id, c.name]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw createError(`Unable to save college data: ${error.message}`, 500);
  } finally {
    client.release();
  }
}

async function findCollege(id) {
  try {
    const res = await pool.query("SELECT id, name FROM colleges WHERE id = $1", [Number(id)]);
    return res.rows[0] || null;
  } catch (error) {
    return null;
  }
}

async function addCollege(name) {
  const cleanedName = normalizeName(name);
  if (!cleanedName) throw createError("College name is required.", 400);
  try {
    const checkRes = await pool.query("SELECT 1 FROM colleges WHERE LOWER(name) = LOWER($1)", [cleanedName]);
    if (checkRes.rows.length > 0) throw createError("College already exists.", 409);
    
    const idRes = await pool.query("SELECT COALESCE(MAX(id), 0) as max_id FROM colleges");
    const id = Number(idRes.rows[0].max_id) + 1;
    
    await pool.query("INSERT INTO colleges (id, name) VALUES ($1, $2)", [id, cleanedName]);
    return { id, name: cleanedName };
  } catch (error) {
    if (error.statusCode) throw error;
    throw createError(`Unable to add college: ${error.message}`, 500);
  }
}

async function updateCollege(id, name) {
  const numericId = Number(id);
  const cleanedName = normalizeName(name);
  if (!cleanedName) throw createError("College name is required.", 400);
  try {
    const collegeRes = await pool.query("SELECT 1 FROM colleges WHERE id = $1", [numericId]);
    if (collegeRes.rows.length === 0) throw createError("College not found.", 404);
    
    const checkRes = await pool.query("SELECT 1 FROM colleges WHERE LOWER(name) = LOWER($1) AND id != $2", [cleanedName, numericId]);
    if (checkRes.rows.length > 0) throw createError("College already exists.", 409);
    
    await pool.query("UPDATE colleges SET name = $1 WHERE id = $2", [cleanedName, numericId]);
    return { id: numericId, name: cleanedName };
  } catch (error) {
    if (error.statusCode) throw error;
    throw createError(`Unable to update college: ${error.message}`, 500);
  }
}

async function deleteCollege(id) {
  const numericId = Number(id);
  try {
    const collegeRes = await pool.query("SELECT id, name FROM colleges WHERE id = $1", [numericId]);
    if (collegeRes.rows.length === 0) throw createError("College not found.", 404);
    
    await pool.query("DELETE FROM colleges WHERE id = $1", [numericId]);
    return collegeRes.rows[0];
  } catch (error) {
    if (error.statusCode) throw error;
    throw createError(`Unable to delete college: ${error.message}`, 500);
  }
}

module.exports = { readColleges, saveColleges, findCollege, addCollege, updateCollege, deleteCollege };
