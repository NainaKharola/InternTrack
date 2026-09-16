const express = require("express");
const {
  getAdminProfile,
  loginAdmin,
  logoutAdmin,
  registerAdmin,
  changeAdminPassword,
  setupRecoveryInfo,
  resetPasswordRecovery,
  createSubUser,
  listSubUsers,
  deleteSubUser,
  createSubUserPassword,
  getUserActivityLog,
  exportUserActivityLog,
  getSecurityQuestions,
  saveSecurityQuestion,
  deleteSecurityQuestion,
  getForgotPasswordQuestions,
  verifyRecoveryAnswer,
  resetPasswordWithToken,
  resetPasswordQuestions,
} = require("../controllers/adminAuthController");
const {
  deleteStudents,
  downloadCertificates,
  getCertificateStudents,
  removeCertificateBufferStudents,
  getStudentById,
  getStudents,
  recommendedByOptions,
  saveTrainingManagement,
  updateStudentReview,
  uploadOfferLetter,
  updateStudentDetails,
  generateReportPdf,
  exportApplications,
  importStudents,
} = require("../controllers/adminStudentController");
const { uploadStudentDocuments, excelUpload } = require("../middleware/uploadMiddleware");
const { protectAdmin, requireMainAdmin } = require("../middleware/adminAuth");
const { ensureApprovedStudent } = require("../middleware/ensureApprovedStudent");
const { uploadOfferLetter: uploadOfferLetterFile } = require("../middleware/offerLetterUpload");
const createGyapanRouter = require("./gyapanRoutes");
const { getConfiguration, addDivision, updateDivision, deleteDivision, updateSeats, getDivisionConfigurations, saveDivisionConfigurations, saveProformaConfig, updateCertificateNumber } = require("../controllers/administrationController");
const { listColleges, createCollege, editCollege, removeCollege } = require("../controllers/collegeController");
const managementController = require("../controllers/managementController");
const { authLimiter, recoveryLimiter, uploadLimiter, documentGenerationLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/auth/register", registerAdmin);
router.post("/auth/login", authLimiter, loginAdmin);
router.post("/auth/logout", logoutAdmin);
router.get("/auth/me", protectAdmin, getAdminProfile);
router.get("/profile", protectAdmin, requireMainAdmin, getAdminProfile);
router.put("/change-password", protectAdmin, requireMainAdmin, changeAdminPassword);
router.post("/auth/setup-recovery", protectAdmin, setupRecoveryInfo);
router.post("/auth/reset-password-recovery", resetPasswordRecovery);

// Secret Questions Management (Authenticated Admin)
router.get("/auth/security-questions", protectAdmin, getSecurityQuestions);
router.post("/auth/security-questions", protectAdmin, saveSecurityQuestion);
router.put("/auth/security-questions/:id", protectAdmin, (req, res) => {
  req.body.id = req.params.id;
  return saveSecurityQuestion(req, res);
});
router.delete("/auth/security-questions/:id", protectAdmin, deleteSecurityQuestion);

// Password Recovery Flow (Public, Rate-Limited)
router.get("/auth/forgot-password-questions", recoveryLimiter, getForgotPasswordQuestions);
router.post("/auth/recovery/verify", recoveryLimiter, verifyRecoveryAnswer);
router.post("/auth/recovery/reset-password", recoveryLimiter, resetPasswordWithToken);
router.post("/auth/reset-password-questions", recoveryLimiter, resetPasswordQuestions);
router.post("/users", protectAdmin, requireMainAdmin, createSubUser);
router.get("/users", protectAdmin, requireMainAdmin, listSubUsers);
router.delete("/users/:id", protectAdmin, requireMainAdmin, deleteSubUser);
router.put("/users/:id/password", protectAdmin, requireMainAdmin, createSubUserPassword);
router.get("/users/:id/activity", protectAdmin, requireMainAdmin, getUserActivityLog);
router.get("/users/:id/activity/export", protectAdmin, requireMainAdmin, exportUserActivityLog);
router.use("/gyapan", protectAdmin, createGyapanRouter());
router.use("/gyapan1", protectAdmin, createGyapanRouter(true));
router.get("/administration", protectAdmin, getConfiguration);
router.post("/administration/divisions", protectAdmin, addDivision);
router.patch("/administration/divisions/:name", protectAdmin, updateDivision);
router.delete("/administration/divisions/:name", protectAdmin, deleteDivision);
router.patch("/administration/seats", protectAdmin, updateSeats);
router.patch("/administration/certificate-number", protectAdmin, updateCertificateNumber);
router.get("/administration/division-configurations", protectAdmin, getDivisionConfigurations);
router.put("/administration/division-configurations", protectAdmin, saveDivisionConfigurations);
router.patch("/administration/proforma", protectAdmin, saveProformaConfig);
router.get("/colleges", protectAdmin, listColleges);
router.post("/colleges", protectAdmin, createCollege);
router.patch("/colleges/:id", protectAdmin, editCollege);
router.delete("/colleges/:id", protectAdmin, removeCollege);
router.get("/management/:type", protectAdmin, managementController.list);
router.post("/management/:type", protectAdmin, managementController.create);
router.patch("/management/:type/:id", protectAdmin, managementController.update);
router.delete("/management/:type/:id", protectAdmin, managementController.remove);

router.get("/recommended-by-options", protectAdmin, (req, res) => {
  res.status(200).json({
    success: true,
    options: recommendedByOptions,
  });
});

router.post("/students/import", protectAdmin, uploadLimiter, excelUpload.single("file"), importStudents);
router.get("/applications/export", protectAdmin, exportApplications);

router.get("/students", protectAdmin, getStudents);
router.get("/certificates/students", protectAdmin, getCertificateStudents);
router.post("/certificates/download", protectAdmin, documentGenerationLimiter, downloadCertificates);
router.get("/certificate1/students", protectAdmin, (req, res, next) => { req.bufferMode = true; next(); }, getCertificateStudents);
router.post("/certificate1/download", protectAdmin, documentGenerationLimiter, (req, res, next) => { req.bufferMode = true; next(); }, downloadCertificates);
router.delete("/certificate1/students", protectAdmin, removeCertificateBufferStudents);
router.delete("/students", protectAdmin, deleteStudents);
router.get("/students/:id", protectAdmin, getStudentById);
router.patch("/students/:id/review", protectAdmin, updateStudentReview);
router.patch("/students/:id", protectAdmin, uploadStudentDocuments, updateStudentDetails);
router.patch(
  "/students/:id/training-management",
  protectAdmin,
  saveTrainingManagement
);
router.post(
  "/students/:id/offer-letter",
  protectAdmin,
  ensureApprovedStudent,
  uploadOfferLetterFile,
  uploadOfferLetter
);

router.post("/attendance-report/pdf", protectAdmin, documentGenerationLimiter, generateReportPdf);

module.exports = router;
