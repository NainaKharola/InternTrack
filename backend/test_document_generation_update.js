const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envPath = fs.existsSync(path.resolve(__dirname, ".env"))
  ? path.resolve(__dirname, ".env")
  : path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

const Student = fs.existsSync(path.resolve(__dirname, "models/Student.js"))
  ? require("./models/Student")
  : require("../models/Student");

const { generateOfferLetterHtml } = fs.existsSync(path.resolve(__dirname, "services/templateService.js"))
  ? require("./services/templateService")
  : require("../services/templateService");

const { generateCertificateHtml } = fs.existsSync(path.resolve(__dirname, "services/certificateService.js"))
  ? require("./services/certificateService")
  : require("../services/certificateService");

async function runDocTest() {
  console.log("=== STEP 1: CREATING INITIAL STUDENT ===");
  const testStudent = await Student.create({
    referenceId: "DOCTEST01",
    name: "OLD STUDENT NAME",
    email: "doc.test@example.com",
    course: "B.Tech",
    branch: "Mechanical Engineering",
    year: "3rd Year",
    collegeName: "Old College Name",
    location: "Old Location",
    collegeLocation: "Old Location",
    collegeAddress: "Old Location",
    status: "Approved",
    internshipType: "Paid",
    trainingManagement: {
      studentName: "OLD STUDENT NAME",
      courseName: "B.Tech",
      courseYear: "3rd Year",
      branch: "Mechanical Engineering",
      collegeName: "Old College Name",
      collegeLocation: "Old Location",
      trainingDuration: "6 Months",
      fromDate: "2026-06-01",
      toDate: "2026-12-01",
      division: "OD",
      joined: "Yes",
      completed: "Yes",
      leaveAvailed: "Outstanding",
      projectTitle: "Old Optical System",
    }
  });

  console.log("Created student with ID:", testStudent._id);

  // Initial Document Generation
  const initialOfferHtml = await generateOfferLetterHtml(testStudent);
  const initialCertHtml = generateCertificateHtml(testStudent);

  console.log("Initial Offer Letter has 'OLD STUDENT NAME'?", initialOfferHtml.includes("OLD STUDENT NAME"));
  console.log("Initial Certificate has 'OLD STUDENT NAME'?", initialCertHtml.includes("OLD STUDENT NAME"));

  console.log("\n=== STEP 2: SIMULATING ADMIN UPDATE VIA DATABASE / TRAINING MANAGEMENT ===");
  // Simulate admin editing Student Details on the page
  const updatedStudent = await Student.findById(testStudent._id);
  const newTraining = {
    ...updatedStudent.trainingManagement,
    studentName: "NEW STUDENT NAME TEST",
    branch: "Computer Science and Engineering",
    collegeName: "New Updated College",
    collegeLocation: "New Updated Location",
    projectTitle: "New AI Navigation System",
  };

  updatedStudent.name = newTraining.studentName;
  updatedStudent.branch = newTraining.branch;
  updatedStudent.collegeName = newTraining.collegeName;
  updatedStudent.location = newTraining.collegeLocation;
  updatedStudent.collegeLocation = newTraining.collegeLocation;
  updatedStudent.collegeAddress = newTraining.collegeLocation;
  updatedStudent.trainingManagement = newTraining;

  if (updatedStudent.offerLetter) {
    updatedStudent.offerLetter.studentName = newTraining.studentName;
    updatedStudent.offerLetter.branch = newTraining.branch;
    updatedStudent.offerLetter.collegeName = newTraining.collegeName;
    updatedStudent.offerLetter.collegeLocation = newTraining.collegeLocation;
    delete updatedStudent.offerLetter.html;
  }

  await updatedStudent.save();
  console.log("Saved updated student details to database.");

  console.log("\n=== STEP 3: FETCHING FRESH STUDENT FROM DATABASE AND RE-GENERATING DOCUMENTS ===");
  const freshStudent = await Student.findById(testStudent._id);

  const updatedOfferHtml = await generateOfferLetterHtml(freshStudent);
  const updatedCertHtml = generateCertificateHtml(freshStudent);

  console.log("Updated Offer Letter has 'NEW STUDENT NAME TEST'?", updatedOfferHtml.includes("NEW STUDENT NAME TEST"));
  console.log("Updated Offer Letter has 'OLD STUDENT NAME'?", updatedOfferHtml.includes("OLD STUDENT NAME"));
  console.log("Updated Offer Letter has 'Computer Science and Engineering'?", updatedOfferHtml.includes("Computer Science and Engineering"));
  console.log("Updated Offer Letter has 'New Updated College'?", updatedOfferHtml.includes("New Updated College"));
  console.log("Updated Offer Letter has 'New Updated Location'?", updatedOfferHtml.includes("New Updated Location"));

  console.log("\nUpdated Certificate has 'NEW STUDENT NAME TEST'?", updatedCertHtml.includes("NEW STUDENT NAME TEST"));
  console.log("Updated Certificate has 'OLD STUDENT NAME'?", updatedCertHtml.includes("OLD STUDENT NAME"));
  console.log("Updated Certificate has 'COMPUTER SCIENCE AND ENGINEERING'?", updatedCertHtml.includes("COMPUTER SCIENCE AND ENGINEERING"));
  console.log("Updated Certificate has 'NEW UPDATED COLLEGE'?", updatedCertHtml.includes("NEW UPDATED COLLEGE"));
  console.log("Updated Certificate has 'NEW UPDATED LOCATION'?", updatedCertHtml.includes("NEW UPDATED LOCATION"));

  const passed =
    updatedOfferHtml.includes("NEW STUDENT NAME TEST") &&
    !updatedOfferHtml.includes("OLD STUDENT NAME") &&
    updatedOfferHtml.includes("Computer Science and Engineering") &&
    updatedCertHtml.includes("NEW STUDENT NAME TEST") &&
    !updatedCertHtml.includes("OLD STUDENT NAME") &&
    updatedCertHtml.includes("COMPUTER SCIENCE AND ENGINEERING");

  // Clean up
  await Student.deleteMany({ referenceId: "DOCTEST01" });
  console.log("\nCleaned up test record.");

  if (passed) {
    console.log("🎉 VERIFICATION SUCCESSFUL: Generated documents immediately and accurately reflect all updated database values!");
    process.exit(0);
  } else {
    console.error("❌ VERIFICATION FAILED!");
    process.exit(1);
  }
}

runDocTest().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
