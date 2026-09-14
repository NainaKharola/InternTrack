const crypto = require("crypto");
const ExcelJS = require("exceljs");
const pool = require("../db");
const { logActivity } = require("../utils/activityLogger");

const approvedColumns = {
  referenceId: ["referenceid", "applicationid", "reference_id", "application_id", "refid"],
  name: ["name", "studentname", "student_name"],
  course: ["course", "degree", "program"],
  year: ["courseyear", "course_year", "year", "currentyear"],
  branch: ["branch", "department", "stream"],
  collegeName: ["collegename", "college_name", "college", "institute", "university"],
  location: ["collegelocation", "college_location", "location", "city"],
  cgpa: ["cgpa", "gpa"],
};
const approvedRequiredFields = ["name", "course", "year", "branch", "collegeName", "location", "cgpa"];
const studentColumns = {
  serialNumber: ["sno", "s_no", "serialnumber", "serial_no", "slno", "sl_no"],
  name: ["name", "studentname", "student_name", "candidate_name"],
  referenceId: ["referenceid", "reference_id", "applicationid", "application_id", "refid", "ref_id"],
  course: ["course", "degree", "program"],
  branch: ["branch", "department", "stream", "discipline"],
  year: ["year", "courseyear", "course_year", "currentyear", "current_year"],
  collegeName: ["collegename", "college_name", "college", "institute", "institutename", "university"],
  location: ["collegelocation", "college_location", "location", "city", "collegecity"],
  email: ["email", "emailaddress", "email_address", "emailid", "email_id"],
  phone: ["phone", "phonenumber", "phone_number", "mobilenumber", "mobile_number", "mobile", "contact"],
  gender: ["gender", "sex"],
  dob: ["dob", "dateofbirth", "date_of_birth", "birthdate"],
  cgpa: ["cgpa", "gpa"],
  duration: ["duration", "internshipduration", "internship_duration", "trainingduration", "training_duration"],
};
const studentRequiredColumns = ["serialNumber", "name", "referenceId", "course", "branch", "year", "collegeName", "location", "email", "phone", "gender", "dob", "cgpa", "duration"];

const normalizeHeader = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const text = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && value.text !== undefined) return String(value.text).trim();
  if (typeof value === "object" && value.result !== undefined) return String(value.result).trim();
  return String(value).trim();
};
const compare = (value) => text(value).replace(/\s+/g, " ").toLocaleLowerCase("en-US");
const identityKey = (student) => [student.name, student.course, student.year, student.branch, student.collegeName].map(compare).join("|");

function isWorkbook(buffer) {
  return (
    buffer.length >= 8 &&
    ((buffer[0] === 0x50 && buffer[1] === 0x4b) ||
      (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0 && buffer[4] === 0xa1 && buffer[5] === 0xb1 && buffer[6] === 0x1a && buffer[7] === 0xe1))
  );
}

async function readWorkbookRows(file) {
  if (!file) return { error: "Select an Excel file to import." };
  if (!isWorkbook(file.buffer)) return { error: "The uploaded file is not a valid Excel workbook." };
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    if (!workbook.worksheets || workbook.worksheets.length === 0) {
      return { error: "The Excel workbook has no sheets." };
    }
    const worksheet = workbook.worksheets[0];
    const rows = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const values = [];
      const colCount = Math.max(worksheet.columnCount || 0, row.cellCount || 0);
      for (let col = 1; col <= colCount; col++) {
        let cellVal = row.getCell(col).value;
        if (cellVal && typeof cellVal === "object" && !(cellVal instanceof Date)) {
          if (cellVal.text !== undefined) cellVal = cellVal.text;
          else if (cellVal.result !== undefined) cellVal = cellVal.result;
        }
        values.push(cellVal ?? "");
      }
      rows.push(values);
    });
    return rows.length < 2 ? { error: "The Excel file must include a header row and at least one data row." } : { rows };
  } catch {
    return { error: "The Excel file is malformed or cannot be read." };
  }
}

function columnIndexes(headers, definition) {
  const indexesByHeader = new Map(headers.map((value, index) => [normalizeHeader(value), index]));
  const indexes = {};
  Object.entries(definition).forEach(([field, aliases]) => {
    const alias = aliases.find((item) => indexesByHeader.has(normalizeHeader(item)));
    if (alias !== undefined) indexes[field] = indexesByHeader.get(normalizeHeader(alias));
  });
  return indexes;
}

function parseDob(value) {
  if (value === "" || value === null || value === undefined) return { value: "" };
  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number") {
    // Excel date serial number
    date = new Date(Math.round((value - 25569) * 86400 * 1000));
  } else {
    const raw = text(value);
    const indian = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (indian) {
      date = new Date(Date.UTC(Number(indian[3]), Number(indian[2]) - 1, Number(indian[1])));
    } else {
      date = new Date(raw);
    }
  }
  if (!date || Number.isNaN(date.getTime())) return { error: "Invalid DOB format" };
  if (date > new Date() || date.getUTCFullYear() < 1900) return { error: "DOB must be a valid past date" };
  return { value: date.toISOString().slice(0, 10) };
}

function setIfPresent(target, key, value) {
  if (value !== "" && value !== undefined && value !== null) target[key] = value;
}

async function importApprovedStudentsExcel(req, res) {
  const parsed = await readWorkbookRows(req.file);
  if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
  const sheetRows = parsed.rows;
  const indexes = columnIndexes(sheetRows[0], approvedColumns);
  const missing = approvedRequiredFields.filter((field) => indexes[field] === undefined);
  if (missing.length)
    return res.status(400).json({
      success: false,
      message: `Missing required columns: ${missing.join(", ")}.`,
      requiredColumns: ["Name", "Course", "Course Year", "Branch", "College Name", "College Location", "CGPA"],
    });
  const entries = [];
  const invalidRows = [];
  const duplicateKeys = new Set();
  const seenKeys = new Set();
  sheetRows.slice(1).forEach((row, offset) => {
    if (row.every((value) => !text(value))) return;
    const get = (field) => (indexes[field] === undefined ? "" : row[indexes[field]]);
    const entry = {
      row: offset + 2,
      referenceId: text(get("referenceId")),
      name: text(get("name")),
      course: text(get("course")),
      year: text(get("year")),
      branch: text(get("branch")),
      collegeName: text(get("collegeName")),
      location: text(get("location")),
      cgpa: Number(get("cgpa")),
    };
    const issues = [];
    if ([entry.name, entry.course, entry.year, entry.branch, entry.collegeName, entry.location].some((value) => !value || value.length > 255))
      issues.push("missing or invalid basic student information");
    if (!Number.isFinite(entry.cgpa) || entry.cgpa < 0 || entry.cgpa > 10) issues.push("CGPA must be between 0 and 10");
    const key = entry.referenceId ? `ref:${compare(entry.referenceId)}` : identityKey(entry);
    if (seenKeys.has(key)) duplicateKeys.add(key);
    seenKeys.add(key);
    if (issues.length) invalidRows.push({ row: entry.row, referenceId: entry.referenceId, reason: issues.join("; ") });
    else entries.push({ ...entry, key });
  });
  if (duplicateKeys.size)
    entries.filter((entry) => duplicateKeys.has(entry.key)).forEach((entry) => invalidRows.push({ row: entry.row, referenceId: entry.referenceId, reason: "duplicate student row in workbook" }));
  const validEntries = entries.filter((entry) => !duplicateKeys.has(entry.key));
  if (!validEntries.length || invalidRows.length)
    return res.status(400).json({ success: false, message: "Fix invalid or duplicate rows and import again. No students were updated.", totalRows: entries.length + invalidRows.length, invalidRows });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("SELECT id, student_data FROM students WHERE student_data->>'status' = 'Approved' FOR UPDATE");
    const byReference = new Map();
    const byIdentity = new Map();
    result.rows.forEach((item) => {
      const ref = compare(item.student_data.referenceId);
      if (ref) byReference.set(ref, [...(byReference.get(ref) || []), item]);
      const key = identityKey(item.student_data);
      byIdentity.set(key, [...(byIdentity.get(key) || []), item]);
    });
    const notFound = [];
    const ambiguous = [];
    const matches = [];
    validEntries.forEach((entry) => {
      const candidates = entry.referenceId ? byReference.get(compare(entry.referenceId)) || [] : byIdentity.get(identityKey(entry)) || [];
      if (!candidates.length) notFound.push({ row: entry.row, referenceId: entry.referenceId, reason: "no approved student matched" });
      else if (candidates.length !== 1) ambiguous.push({ row: entry.row, referenceId: entry.referenceId, reason: "multiple approved students matched" });
      else matches.push({ entry, databaseRow: candidates[0] });
    });
    if (notFound.length || ambiguous.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Fix unmatched or ambiguous rows and import again. No students were updated.", totalRows: validEntries.length, updated: 0, notFound, invalidRows: ambiguous });
    }
    for (const { entry, databaseRow } of matches) {
      const student = databaseRow.student_data;
      Object.assign(student, { name: entry.name, course: entry.course, year: entry.year, branch: entry.branch, collegeName: entry.collegeName, location: entry.location, cgpa: entry.cgpa });
      await client.query("UPDATE students SET student_data = $1::jsonb, updated_at = NOW() WHERE id = $2", [JSON.stringify(student), databaseRow.id]);
    }
    await client.query("COMMIT");
    await logActivity({ req, module: "Student Module", action: "Imported Student Excel", description: `Imported basic information and CGPA for ${matches.length} approved student(s).`, status: "Success" });
    return res.json({ success: true, message: `Imported ${matches.length} approved student record(s).`, totalRows: matches.length, updated: matches.length, notFound: [], invalidRows: [] });
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return res.status(500).json({ success: false, message: "Excel import failed. No student records were changed." });
  } finally {
    client.release();
  }
}

function makeImportedStudent(entry) {
  const now = new Date().toISOString();
  const trainingManagement = {};
  setIfPresent(trainingManagement, "studentName", entry.name);
  setIfPresent(trainingManagement, "courseName", entry.course);
  setIfPresent(trainingManagement, "courseYear", entry.year);
  setIfPresent(trainingManagement, "branch", entry.branch);
  setIfPresent(trainingManagement, "collegeName", entry.collegeName);
  setIfPresent(trainingManagement, "collegeLocation", entry.location);
  setIfPresent(trainingManagement, "trainingDuration", entry.duration);
  const student = {
    _id: crypto.randomBytes(12).toString("hex"),
    status: "Pending",
    internshipType: "Unpaid",
    offerLetterStatus: "",
    certificateGenerated: false,
    certificateBufferRemoved: false,
    gyapanGenerated: false,
    gyapanBufferRemoved: false,
    aadhaarCard: null,
    collegeAddress: "",
    gender: "",
    bankDetails: { bankName: "", savingAccountNumber: "", ifsc: "" },
    firstQuarterReport: { fromDate: "", toDate: "", daysPresent: "" },
    secondQuarterReport: { fromDate: "", toDate: "", daysPresent: "" },
    resignationStatus: "No",
    resignationDate: null,
    certificateNumber: null,
    submittedAt: now,
    trainingManagement,
  };
  ["serialNumber", "name", "referenceId", "course", "branch", "year", "collegeName", "location", "email", "phone", "gender", "dob", "cgpa"].forEach((key) => setIfPresent(student, key, entry[key]));
  setIfPresent(student, "internshipDuration", entry.duration);
  return student;
}

function applyImportedValues(student, entry) {
  ["serialNumber", "name", "referenceId", "course", "branch", "year", "collegeName", "location", "email", "phone", "gender", "dob", "cgpa"].forEach((key) => setIfPresent(student, key, entry[key]));
  setIfPresent(student, "internshipDuration", entry.duration);
  const training = student.trainingManagement && typeof student.trainingManagement === "object" ? student.trainingManagement : {};
  setIfPresent(training, "studentName", entry.name);
  setIfPresent(training, "courseName", entry.course);
  setIfPresent(training, "courseYear", entry.year);
  setIfPresent(training, "branch", entry.branch);
  setIfPresent(training, "collegeName", entry.collegeName);
  setIfPresent(training, "collegeLocation", entry.location);
  setIfPresent(training, "trainingDuration", entry.duration);
  student.trainingManagement = training;
  return student;
}

async function importStudentsExcel(req, res) {
  const parsed = await readWorkbookRows(req.file);
  if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
  const sheetRows = parsed.rows;
  const indexes = columnIndexes(sheetRows[0], studentColumns);
  const labels = { serialNumber: "S.no.", referenceId: "Reference ID", collegeName: "College name", location: "College location", dob: "DOB", cgpa: "CGPA", duration: "Duration" };
  const missing = studentRequiredColumns.filter((field) => indexes[field] === undefined);
  if (missing.length)
    return res.status(400).json({ success: false, message: `Missing required columns: ${missing.map((field) => labels[field] || field[0].toUpperCase() + field.slice(1)).join(", ")}.` });
  const entries = [];
  const errors = [];
  const seenReferences = new Set();
  let total = 0;
  sheetRows.slice(1).forEach((row, offset) => {
    if (row.every((value) => !text(value))) return;
    total += 1;
    const get = (field) => row[indexes[field]];
    const dob = parseDob(get("dob"));
    const entry = {
      row: offset + 2,
      serialNumber: text(get("serialNumber")),
      name: text(get("name")),
      referenceId: text(get("referenceId")),
      course: text(get("course")),
      branch: text(get("branch")),
      year: text(get("year")),
      collegeName: text(get("collegeName")),
      location: text(get("location")),
      email: text(get("email")).toLowerCase(),
      phone: text(get("phone")).replace(/[\s()-]/g, ""),
      gender: text(get("gender")),
      dob: dob.value || "",
      cgpa: text(get("cgpa")),
      duration: text(get("duration")),
    };
    const rowErrors = [];
    if (!entry.referenceId) rowErrors.push("Reference ID is missing");
    else if (entry.referenceId.length > 100) rowErrors.push("Reference ID is too long");
    if (!entry.name || entry.name.length > 255) rowErrors.push("Name is missing or invalid");
    if (entry.serialNumber && !/^\d+$/.test(entry.serialNumber)) rowErrors.push("S.no. must be a whole number");
    else if (entry.serialNumber) entry.serialNumber = Number(entry.serialNumber);
    if (entry.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email)) rowErrors.push("Invalid email address");
    if (entry.phone && !/^\d{10}$/.test(entry.phone)) rowErrors.push("Phone must contain 10 digits");
    if (entry.cgpa) {
      const cgpa = Number(entry.cgpa);
      if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) rowErrors.push("Invalid CGPA");
      else entry.cgpa = cgpa;
    }
    if (dob.error) rowErrors.push(dob.error);
    if (entry.referenceId && seenReferences.has(compare(entry.referenceId))) rowErrors.push("Duplicate Reference ID in workbook");
    if (entry.referenceId) seenReferences.add(compare(entry.referenceId));
    if (rowErrors.length) errors.push({ row: entry.row, referenceId: entry.referenceId, reason: rowErrors.join("; ") });
    else entries.push(entry);
  });
  if (!total) return res.status(400).json({ success: false, message: "The Excel file contains no student rows." });
  const client = await pool.connect();
  let created = 0;
  let updated = 0;
  try {
    await client.query("BEGIN");
    const result = await client.query("SELECT id, student_data FROM students FOR UPDATE");
    const byReference = new Map();
    result.rows.forEach((databaseRow) => {
      const key = compare(databaseRow.student_data.referenceId);
      if (key) byReference.set(key, [...(byReference.get(key) || []), databaseRow]);
    });
    for (const entry of entries) {
      const matches = byReference.get(compare(entry.referenceId)) || [];
      if (matches.length > 1) {
        errors.push({ row: entry.row, referenceId: entry.referenceId, reason: "Multiple existing students have this Reference ID" });
        continue;
      }
      if (matches.length === 1) {
        const student = applyImportedValues(matches[0].student_data, entry);
        await client.query("UPDATE students SET student_data = $1::jsonb, updated_at = NOW() WHERE id = $2", [JSON.stringify(student), matches[0].id]);
        updated += 1;
        continue;
      }
      const student = makeImportedStudent(entry);
      await client.query("INSERT INTO students (student_data) VALUES ($1::jsonb)", [JSON.stringify(student)]);
      byReference.set(compare(entry.referenceId), [{ student_data: student }]);
      created += 1;
    }
    await client.query("COMMIT");
    const summary = { total, created, updated, skipped: 0, failed: errors.length };
    await logActivity({
      req,
      module: "Student Module",
      action: "Bulk imported students",
      description: `Excel import created ${created} and updated ${updated} student(s); ${errors.length} row(s) failed validation.`,
      status: errors.length ? "Partial Success" : "Success",
    });
    return res.json({ success: true, message: errors.length ? `Import completed with ${errors.length} error(s).` : "Student import completed successfully.", summary, errors });
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return res.status(500).json({ success: false, message: "Excel import failed. No student records were changed." });
  } finally {
    client.release();
  }
}

module.exports = { importApprovedStudentsExcel, importStudentsExcel };
