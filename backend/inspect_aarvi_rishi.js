const Student = require("./models/Student");
async function run() {
  const students = await Student.find({ name: { $in: ["Aarvi", "Rishi"] } });
  for (const s of students) {
    console.log(`ID: ${s._id}, Name: ${s.name}, Status: ${s.status}, InternshipType: ${s.internshipType}`);
  }
  process.exit(0);
}
run();
