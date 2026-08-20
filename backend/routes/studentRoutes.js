const express = require("express");
const {
  createStudent,
  deleteStudent,
  downloadStudentDocument,
  getStudentDashboard,
  loginStudent,
  savePaidInternshipProjectDetails,
  uploadCompletedStudentDocuments,
} = require("../controllers/studentController");
const {
  uploadCompletedDocuments,
  uploadStudentDocuments,
} = require("../middleware/uploadMiddleware");
const { protectAdmin } = require("../middleware/adminAuth");
const { protectStudent } = require("../middleware/studentAuth");

const router = express.Router();

router.post("/", uploadStudentDocuments, createStudent);
router.post("/login", loginStudent);
router.get("/dashboard", protectStudent, getStudentDashboard);
router.patch("/paid-project-details", protectStudent, savePaidInternshipProjectDetails);
router.get("/documents/:type", protectStudent, downloadStudentDocument);
router.post(
  "/completed-documents",
  protectStudent,
  uploadCompletedDocuments,
  uploadCompletedStudentDocuments
);
router.delete("/:id", protectAdmin, deleteStudent);

module.exports = router;
