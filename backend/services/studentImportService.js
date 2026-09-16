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
  const raw = branch.trim().slice(0, 200);
  if (!raw || raw === "-" || raw.toLowerCase() === "null" || raw.toLowerCase() === "undefined") return "";

  // 1. Direct exact match
  const exact = standardBranches.find(b => b.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;

  // Check if string contains branch in parentheses, e.g. "B.Tech (CSE)" or "B.E (ECE)"
  const openParen = raw.indexOf("(");
  const closeParen = raw.indexOf(")", openParen + 1);
  if (openParen !== -1 && closeParen !== -1 && closeParen > openParen + 1) {
    const inside = raw.slice(openParen + 1, closeParen).trim();
    const normalizedInside = normalizeBranch(inside);
    if (normalizedInside && normalizedInside !== inside) return normalizedInside;
  }

  // 2. Clean extraneous branch codes or numbers in parentheses / brackets like (01), [CSE]
  // Using linear non-overlapping string replacements to eliminate ReDoS risk
  let clean = raw
    .replace(/\([a-zA-Z0-9_\s-]+\)/g, " ")
    .replace(/\[[a-zA-Z0-9_\s-]+\]/g, " ")
    .replace(/^\d+[-_.:]\s*/, "")
    .replace(/\s*[-_.:]\d+$/, "")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();

  const lower = (clean || raw).toLowerCase();

  // 3. Exact word-boundary match for standard branches
  if (/\b(cse|comp(uter)?\s*sci(ence)?(\s*and\s*eng(ineering)?)?|software(\s*eng(ineering)?)?)\b/i.test(lower)) {
    return "Computer Science and Engineering";
  }

  if (/\b(it|info(rmation)?\s*tech(nology)?)\b/i.test(lower)) {
    return "Information Technology";
  }

  if (/\b(ece|telecom(munication)?|electronics(\s*and\s*comm(unication)?)?)\b/i.test(lower)) {
    return "Electronics and Communication";
  }

  if (/\b(eee?|electrical(\s*engineering)?)\b/i.test(lower)) {
    return "Electrical Engineering";
  }

  if (/\b(me|mech(anical)?(\s*engineering)?)\b/i.test(lower)) {
    return "Mechanical Engineering";
  }

  if (/\b(ce|civil(\s*engineering)?)\b/i.test(lower)) {
    return "Civil Engineering";
  }

  if (/\b(ae|aero(space)?(\s*engineering)?)\b/i.test(lower)) {
    return "Aerospace Engineering";
  }

  if (/\b(ai|ds|aids|ai&ds|data\s*science|artificial\s*intelligence)\b/i.test(lower)) {
    return "Artificial Intelligence and Data Science";
  }

  // 4. Case-insensitive standard branch match
  for (const std of standardBranches) {
    if (std.toLowerCase() === lower) {
      return std;
    }
  }

  // 5. Fallback: preserve original string cleanly
  return clean || raw;
}

function extractBranchFromCourse(courseStr) {
  if (!courseStr || typeof courseStr !== "string") return "";
  const matchParen = courseStr.match(/\(([^)]+)\)/);
  if (matchParen && matchParen[1]) {
    const extracted = normalizeBranch(matchParen[1]);
    if (extracted) return extracted;
  }
  const matchDash = courseStr.match(/[-:]\s*([A-Za-z0-9\s&_]+)$/);
  if (matchDash && matchDash[1]) {
    const extracted = normalizeBranch(matchDash[1]);
    if (extracted) return extracted;
  }
  return "";
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

  // Dynamically locate the header row in rows 1..5
  let headerRowNumber = 1;
  let columnMap = {};
  let maxMatchedColumns = 0;

  for (let r = 1; r <= Math.min(5, worksheet.rowCount); r++) {
    const row = worksheet.getRow(r);
    const candidateMap = {};

    row.eachCell((cell, colNumber) => {
      const val = normalizeHeader(cell.value);
      if (!val) return;

      if (
        val.includes("referenceid") ||
        val.includes("applicationid") ||
        val.includes("application_id") ||
        val.includes("reference_id") ||
        val.includes("appid") ||
        val === "refid" ||
        val === "id" ||
        val === "application" ||
        (val.includes("id") && !val.includes("email") && !val.includes("guide") && !val.includes("college") && !val.includes("branch") && !val.includes("paid"))
      ) {
        candidateMap.referenceId = colNumber;
      } else if (val.includes("collegelocation") || val.includes("collegeaddress") || (val.includes("location") && !val.includes("name")) || val === "address" || val.includes("city")) {
        candidateMap.collegeLocation = colNumber;
      } else if (val.includes("collegename") || val.includes("college") || val.includes("institution") || val.includes("university")) {
        candidateMap.collegeName = colNumber;
      } else if (
        (val.includes("branch") || val.includes("department") || val.includes("dept") || val.includes("discipline") || val.includes("stream") || val.includes("trade") || val.includes("specialization") || val.includes("major") || val.includes("field")) &&
        !val.includes("code") && !val.includes("id")
      ) {
        candidateMap.branch = colNumber;
      } else if (val.includes("branchcode") || val.includes("branchid") || (val.includes("code") && val.includes("branch"))) {
        candidateMap.branchCode = colNumber;
      } else if (val.includes("coursename") || val === "course" || val.includes("degree") || val.includes("program") || val.includes("programme")) {
        candidateMap.course = colNumber;
      } else if (val.includes("courseyear") || val.includes("year") || val.includes("semester") || val.includes("sem")) {
        candidateMap.year = colNumber;
      } else if (val.includes("studentname") || val.includes("fullname") || (val.includes("name") && !val.includes("college") && !val.includes("course") && !val.includes("guide") && !val.includes("branch") && !val.includes("bank") && !val.includes("father"))) {
        candidateMap.name = colNumber;
      } else if (val.includes("email") || val.includes("mail")) {
        candidateMap.email = colNumber;
      } else if (val.includes("phone") || val.includes("mobile") || val.includes("contact")) {
        candidateMap.phone = colNumber;
      } else if (val === "gender" || val === "sex") {
        candidateMap.gender = colNumber;
      } else if (val === "dob" || val.includes("dateofbirth") || val.includes("birthdate") || val.includes("birth")) {
        candidateMap.dob = colNumber;
      } else if (val === "cgpa" || val === "gpa" || val.includes("percentage") || val.includes("marks") || val.includes("percent")) {
        candidateMap.cgpa = colNumber;
      } else if (val.includes("duration") || val.includes("period")) {
        candidateMap.duration = colNumber;
      } else if (val.includes("division") || val.includes("lab") || val.includes("allotteddivision")) {
        candidateMap.division = colNumber;
      } else if (val.includes("seatnumber") || val.includes("seatno") || val.includes("seat")) {
        candidateMap.seatNumber = colNumber;
      } else if (val === "sno" || val === "slno" || val === "serialnumber" || val === "srno") {
        candidateMap.serialNumber = colNumber;
      } else if (val === "status" || (val.includes("status") && !val.includes("resignation") && !val.includes("joined") && !val.includes("completed") && !val.includes("offer"))) {
        candidateMap.status = colNumber;
      } else if (val.includes("internshiptype") || val.includes("interntype") || val === "type" || val.includes("category") || val.includes("paidstatus") || val.includes("payment")) {
        candidateMap.internshipType = colNumber;
      } else if (val.includes("fromdate") || val.includes("joiningdate") || val.includes("startdate")) {
        candidateMap.fromDate = colNumber;
      } else if (val.includes("todate") || val.includes("completiondate") || val.includes("enddate")) {
        candidateMap.toDate = colNumber;
      } else if (val.includes("resignationdate") || val.includes("resigndate") || (val.includes("resignation") && val.includes("date"))) {
        candidateMap.resignationDate = colNumber;
      } else if (val.includes("resignation") || val.includes("resigned")) {
        candidateMap.resignationStatus = colNumber;
      }
    });

    const matchCount = Object.keys(candidateMap).length;
    if (matchCount > maxMatchedColumns) {
      maxMatchedColumns = matchCount;
      columnMap = candidateMap;
      headerRowNumber = r;
    }
  }

  const summary = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };
  const errors = [];

  const rowCount = worksheet.rowCount;
  for (let rowNumber = headerRowNumber + 1; rowNumber <= rowCount; rowNumber++) {
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

      // Search for existing student STRICTLY by referenceId (Application ID) in the Students table.
      // An existing Application or matching email must NEVER cause the student to be classified as existing.
      let existingStudent = null;
      if (referenceId) {
        existingStudent = await Student.findOne({
          $or: [
            { referenceId: referenceId },
            { referenceId: referenceId.toLowerCase() },
            { referenceId: referenceId.toUpperCase() }
          ]
        });
      }

      // Resolve branch: check branch cell first, then course extraction, then branchCode
      let resolvedBranch = "";
      if (isNonEmptyValue(rowValues.branch)) {
        resolvedBranch = normalizeBranch(rowValues.branch) || rowValues.branch;
      } else if (isNonEmptyValue(rowValues.course)) {
        resolvedBranch = extractBranchFromCourse(rowValues.course);
      } else if (isNonEmptyValue(rowValues.branchCode)) {
        const fromCode = normalizeBranch(rowValues.branchCode);
        if (fromCode && fromCode !== rowValues.branchCode) {
          resolvedBranch = fromCode;
        }
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
          updates.collegeLocation = rowValues.collegeLocation;
          updates.collegeAddress = rowValues.collegeLocation;
          newTraining.collegeLocation = rowValues.collegeLocation;
          trainingUpdated = true;
        }
        if (resolvedBranch) {
          updates.branch = resolvedBranch;
          newTraining.branch = resolvedBranch;
          trainingUpdated = true;
        } else if (!existingStudent.branch && existingTraining.branch) {
          updates.branch = existingTraining.branch;
        } else if (existingStudent.branch && !existingTraining.branch) {
          newTraining.branch = existingStudent.branch;
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
          const typeLower = rowValues.internshipType.toLowerCase();
          const formattedType = typeLower.includes("unpaid") ? "Unpaid" : (typeLower.includes("paid") ? "Paid" : "Paid");
          updates.internshipType = formattedType;
        } else if (options.defaultInternshipType || options.internshipType) {
          updates.internshipType = options.defaultInternshipType || options.internshipType;
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

        if (isNonEmptyValue(rowValues.resignationDate)) {
          updates.resignationDate = new Date(rowValues.resignationDate);
          updates.resignationStatus = "Yes";
          newTraining.resignationDate = updates.resignationDate;
          newTraining.resignationStatus = "Yes";
          trainingUpdated = true;
        } else if (isNonEmptyValue(rowValues.resignationStatus)) {
          const isRes = String(rowValues.resignationStatus).toLowerCase().includes("y");
          updates.resignationStatus = isRes ? "Yes" : "No";
          newTraining.resignationStatus = updates.resignationStatus;
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

        const fallbackInternshipType = options.defaultInternshipType || options.internshipType || "Paid";
        let resolvedInternshipType = fallbackInternshipType;
        if (isNonEmptyValue(rowValues.internshipType)) {
          const typeLower = rowValues.internshipType.toLowerCase();
          if (typeLower.includes("unpaid")) {
            resolvedInternshipType = "Unpaid";
          } else if (typeLower.includes("paid")) {
            resolvedInternshipType = "Paid";
          }
        }

        const studentName = isNonEmptyValue(rowValues.name) ? rowValues.name : "Student";
        const course = isNonEmptyValue(rowValues.course) ? rowValues.course : "B.Tech";
        const branch = resolvedBranch || "Computer Science and Engineering";
        const year = isNonEmptyValue(rowValues.year) ? rowValues.year : "3rd Year";
        const collegeName = isNonEmptyValue(rowValues.collegeName) ? rowValues.collegeName : "";
        const collegeLocation = isNonEmptyValue(rowValues.collegeLocation) ? rowValues.collegeLocation : "";
        const duration = isNonEmptyValue(rowValues.duration) ? rowValues.duration : "4 Weeks";

        let newResignationStatus = "No";
        let newResignationDate = null;
        if (isNonEmptyValue(rowValues.resignationDate)) {
          newResignationStatus = "Yes";
          newResignationDate = new Date(rowValues.resignationDate);
        } else if (isNonEmptyValue(rowValues.resignationStatus)) {
          newResignationStatus = String(rowValues.resignationStatus).toLowerCase().includes("y") ? "Yes" : "No";
        }

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
          collegeLocation: collegeLocation,
          collegeAddress: collegeLocation,
          branch: branch,
          course: course,
          year: year,
          internshipDuration: duration,
          status: initialStatus,
          internshipType: resolvedInternshipType,
          resignationStatus: newResignationStatus,
          resignationDate: newResignationDate,
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
            resignationStatus: newResignationStatus,
            resignationDate: newResignationDate,
          }
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
  normalizeBranch,
};
