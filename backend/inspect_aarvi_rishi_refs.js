const Student = require("./models/Student");
async function run() {
  const students = await Student.find({ name: { $in: ["Aarvi", "Rishi"] } });
  for (const s of students) {
    console.log(`ID: ${s._id}, Name: ${s.name}, Ref: ${s.referenceId}, Status: ${s.status}, Type: ${s.internshipType}`);
  }
  process.exit(0);
}
run();
