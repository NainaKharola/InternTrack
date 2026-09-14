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
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

function extractCellValue(cell) {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "object") {
    if (cell.text !== undefined) return String(cell.text).trim();
    if (cell.result !== undefined) return String(cell.result).trim();
    if (cell instanceof Date) {
      const year = cell.getFullYear();
      const month = String(cell.getMonth() + 1).padStart(2, "0");
      const day = String(cell.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }
  return String(cell).trim();
}

function isNonEmptyValue(value) {
  if (value === null || value === undefined) return false;
  const str = String(value).trim();
  return str !== "" && str !== "-" && str.toLowerCase() !== "null" && str.toLowerCase() !== "undefined";
}

const standardBranches = [
  "Computer Science and Engineering",
  "Information Technology",
  "Electronics and Communication",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Aerospace Engineering",
  "Artificial Intelligence and Data Science",
];

function normalizeBranch(branch) {
  if (!branch || typeof branch !== "string") return "";
  const raw = branch.trim();
  if (!raw || raw === "-" || raw.toLowerCase() === "null" || raw.toLowerCase() === "undefined") return "";

  const exact = standardBranches.find(b => b.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;

  let clean = raw
    .replace(/\s*\([0-9a-zA-Z\s_-]+\)\s*/g, " ")
    .replace(/\s*\[[0-9a-zA-Z\s_-]+\]\s*/g, " ")
    .replace(/^\s*\d+\s*[-_.:]\s*/, "")
    .replace(/\s*[-_.:]\s*\d+\s*$/, "")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();

  const lower = (clean || raw).toLowerCase();

  if (
    lower === "01" ||
    lower === "cs" ||
    lower === "cse" ||
    lower.includes("computer") ||
    lower.includes("comp sci") ||
    lower.includes("software")
  ) {
    return "Computer Science and Engineering";
  }

  if (
    lower === "02" ||
    lower === "it" ||
    lower.includes("information tech") ||
    lower.includes("info tech")
  ) {
    return "Information Technology";
  }

  if (
    lower === "03" ||
    lower === "04" ||
    lower === "ece" ||
    lower === "ec" ||
    lower.includes("electronics") ||
    lower.includes("telecom") ||
    lower.includes("communication")
  ) {
    return "Electronics and Communication";
  }

  if (
    lower === "05" ||
    lower === "ee" ||
    lower === "eee" ||
    lower.includes("electrical")
  ) {
    return "Electrical Engineering";
  }

  if (
    lower === "06" ||
    lower === "me" ||
    lower === "mech" ||
    lower.includes("mechanical")
  ) {
    return "Mechanical Engineering";
  }

  if (
    lower === "07" ||
    lower === "ce" ||
    lower === "civil" ||
    lower.includes("civil")
  ) {
    return "Civil Engineering";
  }

  if (
    lower === "08" ||
    lower === "ae" ||
    lower.includes("aero") ||
    lower.includes("space")
  ) {
    return "Aerospace Engineering";
  }

  if (
    lower === "09" ||
    lower === "ai" ||
    lower === "aids" ||
    lower === "ai&ds" ||
    lower === "ds" ||
    lower.includes("artificial intelligence") ||
    lower.includes("data science")
  ) {
    return "Artificial Intelligence and Data Science";
  }

  for (const std of standardBranches) {
    if (std.toLowerCase().includes(lower) || lower.includes(std.toLowerCase())) {
      return std;
    }
  }

  return clean || raw;
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

    if (val.includes("referenceid") || val.includes("applicationid") || val.includes("appid") || val === "refid" || (val.includes("id") && !val.includes("email") && !val.includes("guide"))) {
      columnMap.referenceId = colNumber;
    } else if (val.includes("collegelocation") || val.includes("collegeaddress") || (val.includes("location") && !val.includes("name")) || val === "address" || val.includes("city")) {
      columnMap.collegeLocation = colNumber;
    } else if (val.includes("collegename") || val.includes("college") || val.includes("institution") || val.includes("university")) {
      columnMap.collegeName = colNumber;
    } else if (val.includes("branch") || val.includes("department") || val.includes("discipline")) {
      columnMap.branch = colNumber;
    } else if (val.includes("coursename") || val.includes("course") || val.includes("degree")) {
      columnMap.course = colNumber;
    } else if (val.includes("courseyear") || val.includes("year") || val.includes("semester") || val.includes("sem")) {
      columnMap.year = colNumber;
    } else if (val.includes("studentname") || val.includes("fullname") || (val.includes("name") && !val.includes("college") && !val.includes("course") && !val.includes("guide"))) {
      columnMap.name = colNumber;
    } else if (val.includes("email") || val.includes("mail")) {
      columnMap.email = colNumber;
    } else if (val.includes("phone") || val.includes("mobile") || val.includes("contact")) {
      columnMap.phone = colNumber;
    } else if (val === "gender" || val === "sex") {
      columnMap.gender = colNumber;
    } else if (val === "dob" || val.includes("dateofbirth") || val.includes("birthdate")) {
      columnMap.dob = colNumber;
    } else if (val === "cgpa" || val === "gpa" || val.includes("percentage") || val.includes("marks")) {
      columnMap.cgpa = colNumber;
    } else if (val.includes("duration") || val.includes("period")) {
      columnMap.duration = colNumber;
    } else if (val.includes("division") || val.includes("lab") || val.includes("allotteddivision")) {
      columnMap.division = colNumber;
    } else if (val.includes("seatnumber") || val.includes("seatno") || val.includes("seat")) {
      columnMap.seatNumber = colNumber;
    } else if (val === "sno" || val === "slno" || val === "serialnumber") {
      columnMap.serialNumber = colNumber;
    } else if (val.includes("status") && !val.includes("resignation") && !val.includes("joined") && !val.includes("completed")) {
      columnMap.status = colNumber;
    } else if (val.includes("internshiptype") || val === "type") {
      columnMap.internshipType = colNumber;
    } else if (val.includes("fromdate") || val.includes("joiningdate") || val.includes("startdate")) {
      columnMap.fromDate = colNumber;
    } else if (val.includes("todate") || val.includes("completiondate") || val.includes("enddate")) {
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
    const hasAnyValue = Object.values(rowValues).some(v => isNonEmptyValue(v));
    if (!hasAnyValue) continue;

    summary.total += 1;

    try {
      const name = isNonEmptyValue(rowValues.name) ? rowValues.name : "";
      const email = isNonEmptyValue(rowValues.email) ? rowValues.email.toLowerCase() : "";
      const referenceId = isNonEmptyValue(rowValues.referenceId) ? rowValues.referenceId.trim().toUpperCase() : "";

      if (!name && !email && !referenceId) {
        summary.failed += 1;
        errors.push({ row: rowNumber, error: "Row missing Student Name, Reference ID, and Email." });
        continue;
      }

      // Search for existing student primarily by referenceId, then by email
      let existingStudent = null;
      if (referenceId) {
        existingStudent = await Student.findOne({ referenceId });
      }
      if (!existingStudent && email) {
        existingStudent = await Student.findOne({ email });
      }

      if (existingStudent) {
        // Prepare partial updates: NEVER overwrite existing database values with blank Excel cells
        const updates = {};
        const existingTraining = existingStudent.trainingManagement || {};
        const newTraining = { ...existingTraining };
        let trainingUpdated = false;

        if (isNonEmptyValue(rowValues.name)) {
          updates.name = rowValues.name;
          newTraining.studentName = rowValues.name;
          trainingUpdated = true;
        }
        if (isNonEmptyValue(rowValues.email)) updates.email = rowValues.email.toLowerCase();
        if (isNonEmptyValue(rowValues.phone)) updates.phone = rowValues.phone;
        if (isNonEmptyValue(rowValues.gender)) updates.gender = rowValues.gender;
        if (isNonEmptyValue(rowValues.dob)) updates.dob = rowValues.dob;
        if (isNonEmptyValue(rowValues.cgpa)) updates.cgpa = rowValues.cgpa;

        if (isNonEmptyValue(rowValues.collegeName)) {
          updates.collegeName = rowValues.collegeName;
          newTraining.collegeName = rowValues.collegeName;
          trainingUpdated = true;
        }
        if (isNonEmptyValue(rowValues.collegeLocation)) {
          updates.location = rowValues.collegeLocation;
          updates.collegeAddress = rowValues.collegeLocation;
          newTraining.collegeLocation = rowValues.collegeLocation;
          trainingUpdated = true;
        }
        if (isNonEmptyValue(rowValues.branch)) {
          const normBranch = normalizeBranch(rowValues.branch) || rowValues.branch;
          updates.branch = normBranch;
          newTraining.branch = normBranch;
          trainingUpdated = true;
        }
        if (isNonEmptyValue(rowValues.course)) {
          updates.course = rowValues.course;
          newTraining.courseName = rowValues.course;
          trainingUpdated = true;
        }
        if (isNonEmptyValue(rowValues.year)) {
          updates.year = rowValues.year;
          newTraining.courseYear = rowValues.year;
          trainingUpdated = true;
        }
        if (isNonEmptyValue(rowValues.duration)) {
          updates.internshipDuration = rowValues.duration;
          newTraining.trainingDuration = rowValues.duration;
          trainingUpdated = true;
        }

        if (isNonEmptyValue(rowValues.status)) {
          const formattedStatus = rowValues.status.charAt(0).toUpperCase() + rowValues.status.slice(1).toLowerCase();
          if (["Approved", "Pending", "Rejected"].includes(formattedStatus)) {
            updates.status = formattedStatus;
          }
        }
        if (isNonEmptyValue(rowValues.internshipType)) {
          const formattedType = rowValues.internshipType.toLowerCase().includes("paid") ? "Paid" : "Unpaid";
          updates.internshipType = formattedType;
        }

        if (isNonEmptyValue(rowValues.division)) {
          newTraining.division = rowValues.division;
          trainingUpdated = true;
        }
        if (isNonEmptyValue(rowValues.seatNumber)) {
          newTraining.seatNumber = rowValues.seatNumber;
          trainingUpdated = true;
        }
        if (isNonEmptyValue(rowValues.fromDate)) {
          newTraining.fromDate = rowValues.fromDate;
          trainingUpdated = true;
        }
        if (isNonEmptyValue(rowValues.toDate)) {
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
        const newRefId = referenceId || await createUniqueReferenceId();
        const initialStatus = isNonEmptyValue(rowValues.status)
          ? (["Approved", "Pending", "Rejected"].includes(rowValues.status) ? rowValues.status : "Approved")
          : (options.defaultStatus || "Approved");

        const studentName = isNonEmptyValue(rowValues.name) ? rowValues.name : "Student";
        const course = isNonEmptyValue(rowValues.course) ? rowValues.course : "";
        const branch = isNonEmptyValue(rowValues.branch) ? (normalizeBranch(rowValues.branch) || rowValues.branch) : "";
        const year = isNonEmptyValue(rowValues.year) ? rowValues.year : "";
        const collegeName = isNonEmptyValue(rowValues.collegeName) ? rowValues.collegeName : "";
        const collegeLocation = isNonEmptyValue(rowValues.collegeLocation) ? rowValues.collegeLocation : "";
        const duration = isNonEmptyValue(rowValues.duration) ? rowValues.duration : "";

        const newStudentData = {
          referenceId: newRefId,
          name: studentName,
          email: email || `${newRefId.toLowerCase()}@imported.local`,
          phone: isNonEmptyValue(rowValues.phone) ? rowValues.phone : "",
          gender: isNonEmptyValue(rowValues.gender) ? rowValues.gender : "",
          dob: isNonEmptyValue(rowValues.dob) ? rowValues.dob : "",
          cgpa: isNonEmptyValue(rowValues.cgpa) ? rowValues.cgpa : "",
          collegeName: collegeName,
          location: collegeLocation,
          collegeAddress: collegeLocation,
          branch: branch,
          course: course,
          year: year,
          internshipDuration: duration,
          status: initialStatus,
          internshipType: isNonEmptyValue(rowValues.internshipType) && rowValues.internshipType.toLowerCase().includes("paid") ? "Paid" : "Unpaid",
          submittedAt: new Date().toISOString(),
          approvedDate: initialStatus === "Approved" ? new Date().toISOString().slice(0, 10) : null,
          trainingManagement: {
            studentName: studentName,
            courseName: course,
            courseYear: year,
            branch: branch,
            collegeName: collegeName,
            collegeLocation: collegeLocation,
            trainingDuration: duration,
            division: isNonEmptyValue(rowValues.division) ? rowValues.division : "",
            seatNumber: isNonEmptyValue(rowValues.seatNumber) ? rowValues.seatNumber : "",
            fromDate: isNonEmptyValue(rowValues.fromDate) ? rowValues.fromDate : "",
            toDate: isNonEmptyValue(rowValues.toDate) ? rowValues.toDate : "",
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

