const { createLocalModel } = require("../services/localStorageService");

module.exports = createLocalModel("students.json", {
  status: "Pending",
  offerLetterStatus: "",
  certificateGenerated: false,
  certificateBufferRemoved: false,
  gyapanGenerated: false,
  gyapanBufferRemoved: false,
  aadhaarCard: null,
  collegeAddress: "",
  internshipType: "Unpaid",
  gender: "",
  // These fields are deliberately separate from training management so only
  // the approved paid-internship student can maintain their project details.
  paidInternshipProjectDetails: {
    projectName: "",
    designationTitle: "",
    supervisorName: "",
    projectNameAndPdc: "",
    achievements: "",
  },
  resignationStatus: "No",
  resignationDate: null,
});
