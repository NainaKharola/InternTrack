const fs = require("fs/promises");
const path = require("path");

const templatePath = path.join(__dirname, "..", "templates", "gyapan.html");

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}

function formatDate(value) {
  const date = parseDate(value);
  return date
    ? date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";
}

function parseDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const date = new Date(Date.UTC(...match.slice(1).map(Number).map((part, index) => index === 1 ? part - 1 : part)));
  return date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
    ? date
    : null;
}

function studentToRow(student) {
  const training = student.trainingManagement || {};
  return {
    studentId: student._id,
    studentName: training.studentName || student.name || "",
    course: training.courseName || training.course || student.course || "",
    courseYear: training.courseYear || student.year || "",
    branch: training.branch || training.department || student.branch || student.department || "",
    division: training.division || "",
    collegeName: training.collegeName || student.collegeName || "",
    collegeLocation: training.collegeLocation || student.location || "",
    collegeAddress: training.collegeAddress || student.collegeAddress || "",
    trainingStartDate: training.fromDate || "",
    trainingEndDate: training.toDate || "",
  };
}

function buildStudentRows(rows) {
  return rows
    .map((row) => {
      return `
        <tr>
          <td>
            <div style="display:flex; gap:16px;">
              <strong>${escapeHtml(row.studentName)}</strong>
              <strong>${escapeHtml(row.courseYear)}</strong>
              <strong>${escapeHtml(row.course)}</strong>
            </div>
            <div style="margin-top:8px;">${escapeHtml(row.branch)}</div>
          </td>

          <td>
            <div>${escapeHtml(row.collegeName)}</div>
            <div style="margin-top:4px;">${escapeHtml(row.collegeLocation)}</div>
          </td>

          <td>
            ${escapeHtml(formatDate(row.trainingStartDate))} - ${escapeHtml(formatDate(row.trainingEndDate))}
          </td>
        </tr>
      `;
    })
    .join("");
}

async function generateGyapanHtml({ rows, letterNumber, issueDate, division }) {
  const template = await fs.readFile(templatePath, "utf8");
  const dateInIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const yyyy = dateInIST.getFullYear();
  const mm = String(dateInIST.getMonth() + 1).padStart(2, "0");
  const dd = String(dateInIST.getDate()).padStart(2, "0");
  const currentDateStr = `${yyyy}-${mm}-${dd}`;
  return template.replace(/{{(studentRows|letterNumber|issueDate|division)}}/g, (_, key) => {
    if (key === "studentRows") return buildStudentRows(rows);
    if (key === "division") return escapeHtml(division || "");
    return escapeHtml(key === "issueDate" ? formatDate(currentDateStr) : letterNumber);
  });
}

module.exports = { generateGyapanHtml, studentToRow };
