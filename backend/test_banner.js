const Student = require("./models/Student");
const { generateCertificateHtml } = require("./services/certificateService");
async function run() {
  const aarvi = await Student.findOne({ name: "Aarvi", internshipType: "Unpaid" });
  const rishi = await Student.findOne({ name: "Rishi", internshipType: "Paid" });
  if (aarvi) {
    const html = generateCertificateHtml(aarvi);
    console.log(`Aarvi (Unpaid) has subtitle? ${html.includes("(Under Paid Internship Program)")}`);
  }
  if (rishi) {
    const html = generateCertificateHtml(rishi);
    console.log(`Rishi (Paid) has subtitle? ${html.includes("(Under Paid Internship Program)")}`);
  }
  process.exit(0);
}
run();
