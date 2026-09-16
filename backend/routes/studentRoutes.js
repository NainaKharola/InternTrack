const express = require("express");
const {
  createStudent,
  deleteStudent,
  downloadStudentDocument,
  getStudentDashboard,
  loginStudent,
  logoutStudent,
  savePaidInternshipProjectDetails,
  uploadCompletedStudentDocuments,
} = require("../controllers/studentController");
const {
  uploadCompletedDocuments,
  uploadStudentDocuments,
} = require("../middleware/uploadMiddleware");
const { protectAdmin } = require("../middleware/adminAuth");
const { protectStudent } = require("../middleware/studentAuth");
const {
  authLimiter,
  registrationLimiter,
  uploadLimiter,
  fileDownloadLimiter,
} = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/", registrationLimiter, uploadStudentDocuments, createStudent);
router.post("/login", authLimiter, loginStudent);
router.post("/logout", logoutStudent);
router.get("/dashboard", protectStudent, getStudentDashboard);
router.patch("/paid-project-details", protectStudent, savePaidInternshipProjectDetails);
router.get("/documents/:type", protectStudent, fileDownloadLimiter, downloadStudentDocument);
router.post(
  "/completed-documents",
  protectStudent,
  uploadLimiter,
  uploadCompletedDocuments,
  uploadCompletedStudentDocuments
);
router.delete("/:id", protectAdmin, deleteStudent);

module.exports = router;
