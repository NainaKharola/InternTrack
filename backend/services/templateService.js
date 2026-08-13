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
  const issueDate =
    overrides.issueDate ||
    student.offerLetter?.issueDate ||
    new Date();

  let duration =
    overrides.internshipDuration ||
    overrides.duration ||
    student.trainingManagement?.trainingDuration ||
    student.offerLetter?.internshipDuration ||
    student.internshipDuration ||
    "";
  if (!duration && student.internshipType === "Paid") {
    duration = "6 Months";
  }

  return {
    logoUrl: overrides.logoUrl || logoBase64,
    bannerUrl: bannerBase64,
    swachhUrl: overrides.swachhUrl || swachhBase64,

    studentName: overrides.studentName || student.name || "",

    course:
      overrides.course ||
      student.course ||
      "",

    year:
      overrides.year ||
      student.year ||
      "",

    branch:
      overrides.branch ||
      student.branch ||
      "",

    collegeName:
      overrides.collegeName ||
      student.collegeName ||
      "",

    collegeLocation:
      overrides.collegeLocation ||
      student.location ||
      "",

    collegeAddress:
      overrides.collegeAddress ||
      student.offerLetter?.collegeAddress ||
      student.collegeAddress ||
      "",

    internshipDuration: duration,
    duration: duration,

    issueDate: formatDate(issueDate),

    letterNumber:
      overrides.letterNumber ||
      student.offerLetter?.letterNumber ||
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
