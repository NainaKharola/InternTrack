const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const templatePath = path.join(
  __dirname,
  "..",
  "templates",
  "drdo_offer_letter.html"
);

const logoPath = path.join(__dirname, "..", "templates", "drdo_logo.png");
const bannerPath = path.join(__dirname, "..", "templates", "ssa_banner.png");
const swachhPath = path.join(__dirname, "..", "templates", "swachh_logo.png");

// Convert images to Base64 so Puppeteer always renders them
const logoBase64 = fs.existsSync(logoPath)
  ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
  : "";

const bannerBase64 = fs.existsSync(bannerPath)
  ? `data:image/png;base64,${fs.readFileSync(bannerPath).toString("base64")}`
  : "";

const swachhBase64 = fs.existsSync(swachhPath)
  ? `data:image/png;base64,${fs.readFileSync(swachhPath).toString("base64")}`
  : "";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value) {
  if (!value) return new Date().toLocaleDateString("en-IN");
  return new Date(value).toLocaleDateString("en-IN");
}

function defaultLetterNumber(student) {
  const suffix = String(student._id || "")
    .slice(-6)
    .toUpperCase();

  const year = new Date().getFullYear();

  return `DRDO/INT/${year}/${suffix}`;
}

function buildTemplateData(student, overrides = {}) {
  const training = student.trainingManagement || {};
  const offer = student.offerLetter || {};

  const issueDate =
    overrides.issueDate ||
    offer.issueDate ||
    new Date();

  let duration =
    overrides.internshipDuration ||
    overrides.duration ||
    training.trainingDuration ||
    student.internshipDuration ||
    offer.internshipDuration ||
    "";
  if (!duration && (student.internshipType === "Paid" || offer.internshipType === "Paid")) {
    duration = "6 Months";
  }

  const studentName = overrides.studentName || training.studentName || student.name || offer.studentName || "";
  const course = overrides.course || training.courseName || student.course || offer.course || "";
  const year = overrides.year || training.courseYear || student.year || offer.year || "";
  const branch = overrides.branch || training.branch || student.branch || offer.branch || "";
  const collegeName = overrides.collegeName || training.collegeName || student.collegeName || offer.collegeName || "";
  const collegeLocation = overrides.collegeLocation || training.collegeLocation || student.location || student.collegeLocation || offer.collegeLocation || "";
  const collegeAddress = overrides.collegeAddress || training.collegeAddress || student.collegeAddress || student.location || offer.collegeAddress || collegeLocation || "";

  return {
    logoUrl: overrides.logoUrl || logoBase64,
    bannerUrl: bannerBase64,
    swachhUrl: overrides.swachhUrl || swachhBase64,

    studentName,
    course,
    year,
    branch,
    collegeName,
    collegeLocation,
    collegeAddress,

    internshipDuration: duration,
    duration,

    issueDate: formatDate(issueDate),

    letterNumber:
      overrides.letterNumber ||
      offer.letterNumber ||
      defaultLetterNumber(student),
  };
}

async function readOfferLetterTemplate() {
  return await fsp.readFile(templatePath, "utf8");
}

async function generateOfferLetterHtml(student, overrides = {}) {
  const template = await readOfferLetterTemplate();
  const data = buildTemplateData(student, overrides);

  return template.replace(/{{(\w+)}}/g, (match, key) => {
    // Don't escape Base64 image URLs
    if (key === "logoUrl" || key === "bannerUrl" || key === "swachhUrl") {
      return data[key];
    }

    return escapeHtml(data[key] ?? "");
  });
}

module.exports = {
  buildTemplateData,
  defaultLetterNumber,
  generateOfferLetterHtml,
};
