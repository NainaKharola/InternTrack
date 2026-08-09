const Student = require("./models/Student");
const { generateCertificateHtml } = require("./services/certificateService");
const fs = require("fs");

async function run() {
  const aarviUnpaid = await Student.findById("baff2fa78ae3c066e139c23a");
  const rishiPaid = await Student.findById("431a197d61e210742ab7af8d");
  
  if (aarviUnpaid) {
    const html = generateCertificateHtml(aarviUnpaid);
    fs.writeFileSync("test_aarvi_unpaid.html", html);
    console.log("Wrote test_aarvi_unpaid.html");
  }
  if (rishiPaid) {
    const html = generateCertificateHtml(rishiPaid);
    fs.writeFileSync("test_rishi_paid.html", html);
    console.log("Wrote test_rishi_paid.html");
  }
  process.exit(0);
}
run();
