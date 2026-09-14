const path = require("path");
const pool = require("../db");

const defaultConfiguration = {
  totalAllocatedSeats: 250,
  paidSeatLimit: undefined,
  unpaidSeatLimit: undefined,
  totalSeatLimit: undefined,
  nextCertificateNumber: 100,
  divisions: [
    "Servo System", "ABS", "SS & ST", "NS (Naval System)", "OD (Optical Design)", "CS & S", "ALTDS", "LI", "LS", "LPF", "Photonics", "EAD", "LIDAR", "FTIR", "HR", "MS", "ISO", "AI", "VI", "IRST", "OME", "LIC", "ENV", "Reprography", "MT", "P & C", "AV", "CMD", "DIR", "HRD", "WORKS", "MI", "SECURITY",
  ],
  divisionConfigurations: {},
};

const clone = (value) => JSON.parse(JSON.stringify(value));

async function getAdministration() {
  try {
    const res = await pool.query("SELECT data FROM administration ORDER BY id ASC LIMIT 1");
    let value;
    if (res.rows.length > 0) {
      value = res.rows[0].data;
    } else {
      value = clone(defaultConfiguration);
      await saveAdministration(value);
    }

    if (!Array.isArray(value.divisions) || !Number.isInteger(value.totalAllocatedSeats)) throw new Error("Invalid administration configuration");
    value.divisions.sort((left, right) => left.localeCompare(right));
    value.divisionConfigurations = value.divisionConfigurations && typeof value.divisionConfigurations === "object" ? value.divisionConfigurations : {};
    
    value.paidSeatLimit = Number.isSafeInteger(value.paidSeatLimit) && value.paidSeatLimit >= 0 ? value.paidSeatLimit : undefined;
    value.unpaidSeatLimit = Number.isSafeInteger(value.unpaidSeatLimit) && value.unpaidSeatLimit >= 0 ? value.unpaidSeatLimit : undefined;
    value.totalSeatLimit = value.paidSeatLimit !== undefined && value.unpaidSeatLimit !== undefined
      ? value.paidSeatLimit + value.unpaidSeatLimit
      : undefined;
    value.divisions.forEach((division) => {
      const entry = value.divisionConfigurations[division];
      value.divisionConfigurations[division] = {
        allowedBranches: Array.isArray(entry?.allowedBranches) ? entry.allowedBranches : [],
        paidSeats: Number.isSafeInteger(entry?.paidSeats) && entry.paidSeats >= 0 ? entry.paidSeats : undefined,
        unpaidSeats: Number.isSafeInteger(entry?.unpaidSeats) && entry.unpaidSeats >= 0 ? entry.unpaidSeats : undefined,
        totalVacancy: Number.isSafeInteger(entry?.paidSeats) && entry.paidSeats >= 0 && Number.isSafeInteger(entry?.unpaidSeats) && entry.unpaidSeats >= 0
          ? entry.paidSeats + entry.unpaidSeats
          : (Number.isSafeInteger(entry?.totalVacancy) && entry.totalVacancy >= 0 ? entry.totalVacancy : 0),
        branchSeats: entry?.branchSeats && typeof entry.branchSeats === "object" && !Array.isArray(entry.branchSeats)
          ? Object.fromEntries(Object.entries(entry.branchSeats).map(([branch, seats]) => {
              if (seats && typeof seats === "object") {
                return [branch, {
                  paid: Number.isSafeInteger(seats.paid) && seats.paid >= 0 ? seats.paid : 0,
                  unpaid: Number.isSafeInteger(seats.unpaid) && seats.unpaid >= 0 ? seats.unpaid : 0
                }];
              }
              return [branch, { paid: 0, unpaid: Number.isSafeInteger(seats) && seats >= 0 ? seats : 0 }];
            }))
          : {},
      };
    });
    Object.keys(value.divisionConfigurations).forEach((division) => {
      if (!value.divisions.includes(division)) delete value.divisionConfigurations[division];
    });
    value.nextCertificateNumber = Number.isSafeInteger(value.nextCertificateNumber) && value.nextCertificateNumber > 0 ? value.nextCertificateNumber : 100;
    return value;
  } catch (error) {
    const config = clone(defaultConfiguration);
    await saveAdministration(config);
    return config;
  }
}

async function saveAdministration(configuration) {
  if (Array.isArray(configuration.divisions)) {
    configuration.divisions = [...configuration.divisions].sort((left, right) => left.localeCompare(right));
  }
  const res = await pool.query("SELECT id FROM administration ORDER BY id ASC LIMIT 1");
  if (res.rows.length > 0) {
    await pool.query("UPDATE administration SET data = $1, updated_at = NOW() WHERE id = $2", [configuration, res.rows[0].id]);
    await pool.query("DELETE FROM administration WHERE id != $1", [res.rows[0].id]);
  } else {
    await pool.query("INSERT INTO administration (data) VALUES ($1)", [configuration]);
  }
  return configuration;
}

async function reserveNextCertificateNumber(studentId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const studentRes = await client.query(
      "SELECT id, student_data FROM students WHERE student_data->>'_id' = $1 OR id::text = $1 FOR UPDATE",
      [String(studentId)]
    );
    if (studentRes.rows.length === 0) throw new Error("Student not found");
    
    const studentRow = studentRes.rows[0];
    const studentData = studentRow.student_data || {};
    
    const adminRes = await client.query("SELECT id, data FROM administration ORDER BY id ASC LIMIT 1 FOR UPDATE");
    let adminId;
    let adminData;
    
    if (adminRes.rows.length === 0) {
      const config = clone(defaultConfiguration);
      const insertRes = await client.query("INSERT INTO administration (data) VALUES ($1) RETURNING id, data", [config]);
      adminId = insertRes.rows[0].id;
      adminData = insertRes.rows[0].data;
    } else {
      adminId = adminRes.rows[0].id;
      adminData = adminRes.rows[0].data;
    }
    
    let nextNum = Number(adminData.nextCertificateNumber);
    if (!Number.isInteger(nextNum) || nextNum <= 0) nextNum = 100;
    
    const existingCertNo = Number(studentData.certificateNumber);
    // If student already has a certificate number that is valid and assigned in the current sequence
    if (Number.isInteger(existingCertNo) && existingCertNo > 0 && existingCertNo >= nextNum - 1 && existingCertNo < nextNum) {
      await client.query("COMMIT");
      return existingCertNo;
    }
    
    const assignedNum = nextNum;
    adminData.nextCertificateNumber = nextNum + 1;
    
    await client.query("UPDATE administration SET data = $1, updated_at = NOW() WHERE id = $2", [adminData, adminId]);
    
    studentData.certificateNumber = assignedNum;
    studentData.certificateGenerated = true;
    await client.query("UPDATE students SET student_data = $1, updated_at = NOW() WHERE id = $2", [studentData, studentRow.id]);
    
    await client.query("COMMIT");
    return assignedNum;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { getAdministration, saveAdministration, reserveNextCertificateNumber };

