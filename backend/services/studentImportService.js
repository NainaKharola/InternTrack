const ExcelJS = require("exceljs");
const Student = require("../models/Student");
const crypto = require("crypto");

function generateReferenceId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 7 }, () => {
    const index = crypto.randomInt(0, chars.length);
    return chars[index];
  }).join("");
}

async function createUniqueReferenceId() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const referenceId = generateReferenceId();
    const exists = await Student.exists({ referenceId });
    if (!exists) return referenceId;
  }
  return `STU${Date.now().toString().slice(-6)}`;
}

function normalizeHeader(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function extractCellValue(cell) {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "object") {
    if (cell.text !== undefined) return String(cell.text).trim();
    if (cell.result !== undefined) return String(cell.result).trim();
    if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  }
  return String(cell).trim();
}

/**
 * Imports student records from an Excel buffer.
 * @param {Buffer} buffer - Uploaded Excel file buffer.
 * @param {Object} [options] - Additional options (e.g. defaultStatus).
 * @returns {Promise<{ summary: Object, errors: Array }>}
 */
async function importStudentsFromExcel(buffer, options = {}) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("The uploaded Excel workbook contains no worksheets.");
  }

  const headerRow = worksheet.getRow(1);
  const columnMap = {};

  headerRow.eachCell((cell, colNumber) => {
    const val = normalizeHeader(cell.value);
    if (!val) return;

    if (val.includes("referenceid") || val.includes("applicationid") || val.includes("appid") || val === "refid" || val === "id") {
      columnMap.referenceId = colNumber;
    } else if (val.includes("name") || val.includes("studentname") || val.includes("fullname")) {
      columnMap.name = colNumber;
    } else if (val.includes("email") || val.includes("mail")) {
      columnMap.email = colNumber;
    } else if (val.includes("phone") || val.includes("mobile") || val.includes("contact")) {
      columnMap.phone = colNumber;
    } else if (val.includes("college") || val.includes("institution") || val.includes("university")) {
      columnMap.collegeName = colNumber;
    } else if (val.includes("branch") || val.includes("department") || val.includes("discipline")) {
      columnMap.branch = colNumber;
    } else if (val.includes("course") || val.includes("degree")) {
      columnMap.course = colNumber;
    } else if (val.includes("year") || val.includes("semester") || val.includes("sem")) {
      columnMap.year = colNumber;
    } else if (val.includes("division") || val.includes("lab") || val.includes("allotteddivision")) {
      columnMap.division = colNumber;
    } else if (val.includes("seat") || val.includes("seatnumber") || val.includes("serialnumber")) {
      columnMap.seatNumber = colNumber;
    } else if (val.includes("status")) {
      columnMap.status = colNumber;
    } else if (val.includes("type") || val.includes("internshiptype")) {
      columnMap.internshipType = colNumber;
    } else if (val.includes("joining") || val.includes("fromdate") || val.includes("startdate")) {
      columnMap.fromDate = colNumber;
    } else if (val.includes("completion") || val.includes("todate") || val.includes("enddate")) {
      columnMap.toDate = colNumber;
    }
  });

  const summary = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };
  const errors = [];

  const rowCount = worksheet.rowCount;
  for (let rowNumber = 2; rowNumber <= rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (!row || row.cellCount === 0) continue;

    const rowValues = {};
    Object.entries(columnMap).forEach(([key, colIdx]) => {
      rowValues[key] = extractCellValue(row.getCell(colIdx).value);
    });

    // Check if row is completely empty
    const hasAnyValue = Object.values(rowValues).some(v => Boolean(v));
    if (!hasAnyValue) continue;

    summary.total += 1;

    try {
      const name = rowValues.name;
      const email = rowValues.email;
      const referenceId = rowValues.referenceId;

      if (!name && !email && !referenceId) {
        summary.failed += 1;
        errors.push({ row: rowNumber, error: "Row missing both Student Name and Reference ID / Email." });
        continue;
      }

      // Search for existing student by referenceId or email
      let existingStudent = null;
      if (referenceId) {
        existingStudent = await Student.findOne({ referenceId: referenceId.trim() });
      }
      if (!existingStudent && email) {
        existingStudent = await Student.findOne({ email: email.trim().toLowerCase() });
      }

      if (existingStudent) {
        // Prepare partial updates: do not overwrite existing data with empty Excel cells
        const updates = {};
        if (rowValues.name) updates.name = rowValues.name;
        if (rowValues.email) updates.email = rowValues.email.toLowerCase();
        if (rowValues.phone) updates.phone = rowValues.phone;
        if (rowValues.collegeName) updates.collegeName = rowValues.collegeName;
        if (rowValues.branch) updates.branch = rowValues.branch;
        if (rowValues.course) updates.course = rowValues.course;
        if (rowValues.year) updates.year = rowValues.year;
        if (rowValues.status) {
          const formattedStatus = rowValues.status.charAt(0).toUpperCase() + rowValues.status.slice(1).toLowerCase();
          if (["Approved", "Pending", "Rejected"].includes(formattedStatus)) {
            updates.status = formattedStatus;
          }
        }
        if (rowValues.internshipType) {
          const formattedType = rowValues.internshipType.toLowerCase().includes("paid") ? "Paid" : "Unpaid";
          updates.internshipType = formattedType;
        }

        // Handle training management updates
        const existingTraining = existingStudent.trainingManagement || {};
        const newTraining = { ...existingTraining };
        let trainingUpdated = false;

        if (rowValues.division) {
          newTraining.division = rowValues.division;
          trainingUpdated = true;
        }
        if (rowValues.seatNumber) {
          newTraining.seatNumber = rowValues.seatNumber;
          trainingUpdated = true;
        }
        if (rowValues.fromDate) {
          newTraining.fromDate = rowValues.fromDate;
          trainingUpdated = true;
        }
        if (rowValues.toDate) {
          newTraining.toDate = rowValues.toDate;
          trainingUpdated = true;
        }
        if (trainingUpdated) {
          updates.trainingManagement = newTraining;
        }

        if (Object.keys(updates).length > 0) {
          await Student.findByIdAndUpdate(existingStudent._id, updates);
          summary.updated += 1;
        } else {
          summary.skipped += 1;
        }
      } else {
        // Create new student
        const newRefId = referenceId ? referenceId.trim().toUpperCase() : await createUniqueReferenceId();
        const initialStatus = rowValues.status
          ? (["Approved", "Pending", "Rejected"].includes(rowValues.status) ? rowValues.status : "Approved")
          : (options.defaultStatus || "Approved");

        const newStudentData = {
          referenceId: newRefId,
          name: rowValues.name || "Student",
          email: rowValues.email ? rowValues.email.toLowerCase() : `${newRefId.toLowerCase()}@imported.local`,
          phone: rowValues.phone || "",
          collegeName: rowValues.collegeName || "",
          branch: rowValues.branch || "",
          course: rowValues.course || "",
          year: rowValues.year || "",
          status: initialStatus,
          internshipType: rowValues.internshipType?.toLowerCase().includes("paid") ? "Paid" : "Unpaid",
          submittedAt: new Date().toISOString(),
          approvedDate: initialStatus === "Approved" ? new Date().toISOString().slice(0, 10) : null,
          trainingManagement: {
            division: rowValues.division || "",
            seatNumber: rowValues.seatNumber || "",
            fromDate: rowValues.fromDate || "",
            toDate: rowValues.toDate || "",
          },
        };

        await Student.create(newStudentData);
        summary.created += 1;
      }
    } catch (err) {
      summary.failed += 1;
      errors.push({ row: rowNumber, error: err.message || "Unknown error parsing row." });
    }
  }

  return { summary, errors };
}

module.exports = {
  importStudentsFromExcel,
};
