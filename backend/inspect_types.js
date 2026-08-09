const Student = require("./models/Student");
async function run() {
  const students = await Student.find({ status: "Approved" });
  for (const s of students) {
    console.log(`Student: ${s.name}, InternshipType: ${s.internshipType}`);
  }
  process.exit(0);
}
run();
