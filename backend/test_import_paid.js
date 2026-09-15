const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envPath = fs.existsSync(path.resolve(__dirname, ".env"))
  ? path.resolve(__dirname, ".env")
  : path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

const ExcelJS = require("exceljs");
const { importStudentsFromExcel } = fs.existsSync(path.resolve(__dirname, "services/studentImportService.js"))
  ? require("./services/studentImportService")
  : require("../services/studentImportService");

const Student = fs.existsSync(path.resolve(__dirname, "models/Student.js"))
  ? require("./models/Student")
  : require("../models/Student");

async function testImport() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Students");
  worksheet.columns = [
    { header: "S.no.", key: "sno" },
    { header: "Name", key: "name" },
    { header: "Reference ID", key: "referenceId" },
    { header: "Course", key: "course" },
    { header: "Branch", key: "branch" },
    { header: "Year", key: "year" },
    { header: "College name", key: "collegeName" },
    { header: "Email", key: "email" },
    { header: "Status", key: "status" },
  ];

  worksheet.addRow({
    sno: 1,
    name: "Rohan Verma",
    referenceId: "TESTPAID01",
    course: "B.Tech",
    branch: "Mechanical Engineering",
    year: "3rd Year",
    collegeName: "DTU Delhi",
    email: "rohan.test@dtu.ac.in",
    status: "Approved",
  });

  const buffer = await workbook.xlsx.writeBuffer();
  console.log("Testing import with Excel buffer lacking Internship Type column...");
  const result = await importStudentsFromExcel(buffer);
  console.log("Import Result:", JSON.stringify(result));

  const student = await Student.findOne({ referenceId: "TESTPAID01" });
  console.log("Created Student:", {
    name: student?.name,
    referenceId: student?.referenceId,
    branch: student?.branch,
    internshipType: student?.internshipType,
    status: student?.status,
  });

  if (student?.internshipType === "Paid") {
    console.log("✅ Verification SUCCESS: Student was correctly imported as Paid!");
  } else {
    console.error("❌ Verification FAILED: Student internshipType is", student?.internshipType);
  }

  // Clean up test student
  await Student.deleteOne({ referenceId: "TESTPAID01" });
  console.log("Cleaned up test record.");
  process.exit(0);
}

testImport().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
