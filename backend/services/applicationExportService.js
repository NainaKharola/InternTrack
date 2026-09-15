const path = require("path");
const fs = require("fs");
const cron = require("node-cron");
const ExcelJS = require("exceljs");
const Student = require("../models/Student");
const ActivityLog = require("../models/ActivityLog");

function formatExportDate(value) {
  if (!value) return "-";
  const dt = new Date(value);
  if (isNaN(dt.getTime())) return "-";
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${day}-${month}-${year}`;
}

const { normalizeBranch } = require("./studentImportService");

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

function normalizeCourseName(courseStr) {
  if (!courseStr || typeof courseStr !== "string") return "";
  let clean = courseStr.replace(/\s*\([^)]*\)/g, "").trim();
  clean = clean.replace(/[-:]\s*[A-Za-z0-9\s&_]+$/, "").trim();
  return clean || courseStr;
}

/**
 * Builds and returns the standardized ExcelJS workbook for student applications.
 */
async function generateApplicationsWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DRDO Admin Portal";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Applications", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.columns = [
    { header: "S.no.", key: "sno", width: 10 },
    { header: "Name", key: "name", width: 26 },
    { header: "Reference ID", key: "referenceId", width: 22 },
    { header: "Course", key: "course", width: 20 },
    { header: "Branch", key: "branch", width: 26 },
    { header: "Year", key: "year", width: 14 },
    { header: "College name", key: "collegeName", width: 35 },
    { header: "College location", key: "collegeLocation", width: 30 },
    { header: "Email", key: "email", width: 30 },
    { header: "Phone", key: "phone", width: 18 },
    { header: "Gender", key: "gender", width: 14 },
    { header: "DOB", key: "dob", width: 16 },
    { header: "CGPA", key: "cgpa", width: 12 },
    { header: "Duration", key: "duration", width: 18 },
    { header: "Division Allotted", key: "division", width: 24 },
    { header: "Seat Number", key: "seatNumber", width: 16 },
    { header: "Internship Type", key: "internshipType", width: 18 },
    { header: "Status", key: "status", width: 15 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A8A" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 26;

  const students = await Student.find({}).sort({ submittedAt: -1, createdAt: -1 });

  let index = 1;
  for (const student of students) {
    const training = student.trainingManagement || {};
    
    // Resolve branch from trainingManagement or student record fields
    const rawBranch =
      training.branch ||
      student.branch ||
      student.discipline ||
      student.department ||
      student.specialization ||
      student.stream ||
      student.trade ||
      "";
    
    const rawCourse = training.courseName || student.course || "";

    let branch = normalizeBranch(rawBranch) || rawBranch;
    if (!branch && rawCourse) {
      branch = extractBranchFromCourse(rawCourse);
    }

    const course = normalizeCourseName(rawCourse) || rawCourse;
    const year = training.courseYear || student.courseYear || student.year || student.currentYear || "";
    const collegeName = training.collegeName || student.collegeName || student.institution || student.university || "";
    const collegeLocation = training.collegeLocation || student.collegeLocation || student.location || student.collegeAddress || student.currentAddress || "";
    const studentName = training.studentName || student.name || "";
    const duration = training.trainingDuration || student.internshipDuration || student.duration || "";
    const division =
      training.division ||
      student.division ||
      student.allottedDivision ||
      student.recommendedBy ||
      "";
    const seatNumber =
      student.serialNumber ||
      training.seatNumber ||
      student.seatNumber ||
      "";

    const row = worksheet.addRow({
      sno: index++,
      name: studentName,
      referenceId: student.referenceId || String(student._id || ""),
      course,
      branch,
      year,
      collegeName,
      collegeLocation,
      email: student.email || "",
      phone: student.phone || "",
      gender: student.gender || "",
      dob: student.dob ? formatExportDate(student.dob) : "",
      cgpa: student.cgpa || "",
      duration,
      division,
      seatNumber,
      internshipType: student.internshipType || "Paid",
      status: student.status || "Pending",
    });
    row.alignment = { vertical: "middle" };
  }

  return { workbook, count: students.length };
}

/**
 * Runs the export job to write the Excel file to the configured env path,
 * overwriting any existing file and recording the result to ActivityLog.
 */
async function runScheduledExport() {
  const exportPath = process.env.APPLICATIONS_EXPORT_PATH || process.env.EXCEL_EXPORT_PATH;
  if (!exportPath) {
    console.info("ℹ️ [CRON] Applications export path not configured (APPLICATIONS_EXPORT_PATH / EXCEL_EXPORT_PATH unset).");
    return;
  }

  const resolvedPath = path.isAbsolute(exportPath)
    ? exportPath
    : path.resolve(process.cwd(), exportPath);

  try {
    const targetDir = path.dirname(resolvedPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const { workbook, count } = await generateApplicationsWorkbook();
    await workbook.xlsx.writeFile(resolvedPath);

    console.log(`✅ [CRON] Hourly Excel export wrote ${count} application(s) to ${resolvedPath}`);

    try {
      await ActivityLog.create({
        userId: "system",
        userName: "System",
        role: "SYSTEM",
        module: "Student Module",
        action: "Hourly Excel Export",
        description: `Hourly Excel export successfully wrote ${count} student application(s) to ${resolvedPath}`,
        status: "Success",
        timestamp: new Date().toISOString(),
      });
    } catch (logErr) {
      console.error("Failed to write ActivityLog for scheduled export:", logErr.message);
    }
  } catch (error) {
    console.error("❌ [CRON] Hourly Excel export failed:", error.message);
    try {
      await ActivityLog.create({
        userId: "system",
        userName: "System",
        role: "SYSTEM",
        module: "Student Module",
        action: "Hourly Excel Export",
        description: `Hourly Excel export failed: ${error.message}`,
        status: "Failed",
        timestamp: new Date().toISOString(),
      });
    } catch (logErr) {
      console.error("Failed to log scheduled export failure to ActivityLog:", logErr.message);
    }
  }
}

/**
 * Starts the hourly node-cron job (runs at minute 0 of every hour).
 */
function initScheduledExport() {
  const exportPath = process.env.APPLICATIONS_EXPORT_PATH || process.env.EXCEL_EXPORT_PATH;
  const cronExpression = "0 * * * *"; // Hourly

  cron.schedule(cronExpression, async () => {
    console.log("⏰ [CRON] Triggering hourly applications Excel export...");
    await runScheduledExport();
  });

  console.log(`⏰ Scheduled hourly Excel export cron job ('${cronExpression}') configured. Target: ${exportPath || "None (APPLICATIONS_EXPORT_PATH unset)"}`);
}

module.exports = {
  generateApplicationsWorkbook,
  runScheduledExport,
  initScheduledExport,
};
