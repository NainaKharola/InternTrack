const { createPostgresModel } = require("../services/postgresStore");

module.exports = createPostgresModel("gyapan.json", {
  generated: false,
  generatedBy: "",
  pdfUrl: "",
  gyapanUrl: "",
  publicId: "",
  uploadType: "Generated",
  letterNumber: "",
  studentRows: [],
  selectedStudents: [],
  html: "",
});
