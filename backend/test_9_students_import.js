const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const ExcelJS = require("exceljs");

const envPath = fs.existsSync(path.resolve(__dirname, ".env"))
  ? path.resolve(__dirname, ".env")
  : path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

const { importStudentsFromExcel } = fs.existsSync(path.resolve(__dirname, "services/studentImportService.js"))
  ? require("./services/studentImportService")
  : require("../services/studentImportService");

const Student = fs.existsSync(path.resolve(__dirname, "models/Student.js"))
  ? require("./models/Student")
  : require("../models/Student");

const test9Rows = [
  { sno: 1, name: "Student 1", id: "IYIJXEY", course: "B.Tech", branch: "Computer Science and Engineering", year: "3rd Year", college: "IIT Delhi", loc: "Delhi", email: "common@test.com", phone: "9876543210", gender: "Male", dob: "2003-01-01", cgpa: "8.5", duration: "6 Months" },
  { sno: 2, name: "Student 2", id: "8DL8L6L", course: "B.Tech", branch: "Information Technology", year: "3rd Year", college: "NIT Trichy", loc: "Trichy", email: "common@test.com", phone: "9876543211", gender: "Female", dob: "2003-02-02", cgpa: "8.6", duration: "6 Months" },
  { sno: 3, name: "Student 3", id: "E9SZUGS", course: "B.Tech", branch: "Electronics and Communication", year: "4th Year", college: "BITS Pilani", loc: "Pilani", email: "common@test.com", phone: "9876543212", gender: "Male", dob: "2002-03-03", cgpa: "8.7", duration: "6 Months" },
  { sno: 4, name: "Student 4", id: "3RDLE0W", course: "B.Tech", branch: "Mechanical Engineering", year: "3rd Year", college: "DTU", loc: "Delhi", email: "student4@test.com", phone: "9876543213", gender: "Female", dob: "2003-04-04", cgpa: "8.8", duration: "6 Months" },
  { sno: 5, name: "Student 5", id: "8LCMYQR", course: "B.Tech", branch: "Civil Engineering", year: "3rd Year", college: "NSUT", loc: "Delhi", email: "student5@test.com", phone: "9876543214", gender: "Male", dob: "2003-05-05", cgpa: "8.9", duration: "6 Months" },
  { sno: 6, name: "Student 6", id: "YZAPH6M", course: "B.Tech", branch: "Aerospace Engineering", year: "4th Year", college: "IIEST", loc: "Shibpur", email: "student6@test.com", phone: "9876543215", gender: "Female", dob: "2002-06-06", cgpa: "9.0", duration: "6 Months" },
  { sno: 7, name: "Student 7", id: "BST1PNS", course: "B.Tech", branch: "Electrical Engineering", year: "3rd Year", college: "IIT Roorkee", loc: "Roorkee", email: "student7@test.com", phone: "9876543216", gender: "Male", dob: "2003-07-07", cgpa: "9.1", duration: "6 Months" },
  { sno: 8, name: "Student 8", id: "YV56435", course: "B.Tech", branch: "Artificial Intelligence and Data Science", year: "3rd Year", college: "IIT Bombay", loc: "Mumbai", email: "student8@test.com", phone: "9876543217", gender: "Female", dob: "2003-08-08", cgpa: "9.2", duration: "6 Months" },
  { sno: 9, name: "Student 9", id: "7DF17IT", course: "B.Tech", branch: "Computer Science and Engineering", year: "4th Year", college: "IIT Madras", loc: "Chennai", email: "student9@test.com", phone: "9876543218", gender: "Male", dob: "2002-09-09", cgpa: "9.3", duration: "6 Months" },
];

async function runTest() {
  console.log("=== STEP 1: VERIFYING PRE-IMPORT STATE FOR 9 IDS ===");
  const targetIds = test9Rows.map(r => r.id);
  for (const id of targetIds) {
    const exists = await Student.findOne({ referenceId: id });
    console.log(`Pre-check: [${id}] exists in Students table? ${exists ? 'YES' : 'NO'}`);
  }

  console.log("\n=== STEP 2: CREATING EXCEL BUFFER WITH 'Application ID' HEADER AND DUPLICATE EMAILS ===");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Applications");
  worksheet.columns = [
    { header: "S.no.", key: "sno" },
    { header: "Name", key: "name" },
    { header: "Application ID", key: "applicationId" },
    { header: "Course", key: "course" },
    { header: "Branch", key: "branch" },
    { header: "Year", key: "year" },
    { header: "College name", key: "collegeName" },
    { header: "College location", key: "collegeLocation" },
    { header: "Email", key: "email" },
    { header: "Phone", key: "phone" },
    { header: "Gender", key: "gender" },
    { header: "DOB", key: "dob" },
    { header: "CGPA", key: "cgpa" },
    { header: "Duration", key: "duration" },
  ];

  test9Rows.forEach(r => {
    worksheet.addRow({
      sno: r.sno,
      name: r.name,
      applicationId: r.id,
      course: r.course,
      branch: r.branch,
      year: r.year,
      collegeName: r.college,
      collegeLocation: r.loc,
      email: r.email,
      phone: r.phone,
      gender: r.gender,
      dob: r.dob,
      cgpa: r.cgpa,
      duration: r.duration,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();

  console.log("\n=== STEP 3: PERFORMING EXCEL IMPORT ===");
  const importRes = await importStudentsFromExcel(buffer);
  console.log("Import Summary:", JSON.stringify(importRes.summary, null, 2));
  console.log("Import Errors:", importRes.errors);

  console.log("\n=== STEP 4: VERIFYING POST-IMPORT STATE IN STUDENTS TABLE ===");
  let allFound = true;
  for (const r of test9Rows) {
    const s = await Student.findOne({ referenceId: r.id });
    if (s) {
      console.log(`✅ Student [${s.referenceId}] -> Name: ${s.name}, Branch: ${s.branch}, College: ${s.collegeName}, Loc: ${s.collegeLocation || s.location}, Type: ${s.internshipType}, Status: ${s.status}`);
    } else {
      console.error(`❌ Student [${r.id}] NOT FOUND in Students table!`);
      allFound = false;
    }
  }

  if (importRes.summary.created === 9 && importRes.summary.updated === 0 && importRes.summary.failed === 0 && allFound) {
    console.log("\n🎉 TEST 1 PASSED: All 9 rows created as new Paid students with Reference IDs!");
  } else {
    console.error("\n❌ TEST 1 FAILED!");
  }

  console.log("\n=== STEP 5: RE-IMPORTING SAME EXCEL (SHOULD UPDATE 9, CREATE 0) ===");
  const reimportRes = await importStudentsFromExcel(buffer);
  console.log("Re-import Summary:", JSON.stringify(reimportRes.summary, null, 2));
  if (reimportRes.summary.created === 0 && reimportRes.summary.updated === 9 && reimportRes.summary.failed === 0) {
    console.log("\n🎉 TEST 2 PASSED: Re-import correctly updated all 9 existing students!");
  } else {
    console.error("\n❌ TEST 2 FAILED!");
  }

  process.exit(0);
}

runTest().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
