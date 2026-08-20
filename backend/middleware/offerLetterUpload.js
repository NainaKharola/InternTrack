const multer = require("multer");
const path = require("path");
const { saveLocalFile } = require("../services/localStorageService");

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter(req, file, cb) {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Offer Letter must be a PDF file."));
    }
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (ext !== ".pdf") {
      return cb(new Error("Offer Letter must have a .pdf extension."));
    }
    cb(null, true);
  },
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
}).single("offerLetter");

function validatePdfSignature(buffer) {
  if (!buffer || buffer.length < 4) return false;
  const hex = buffer.slice(0, 4).toString("hex").toUpperCase();
  return hex === "25504446"; // %PDF
}

function uploadOfferLetter(req, res, next) {
  upload(req, res, async (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Offer Letter PDF is required.",
      });
    }

    // Verify PDF Magic Bytes
    if (!validatePdfSignature(req.file.buffer)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file contents. Must be a valid PDF document.",
      });
    }

    try {
      const cleanName = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9.-]/g, "_");
      const result = await saveLocalFile(req.file.buffer, "offerLetters", cleanName);

      req.uploadedOfferLetter = {
        url: result.url,
        publicId: result.filename,
      };

      next();
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Offer Letter upload failed.",
        error: err.message,
      });
    }
  });
}

module.exports = { uploadOfferLetter };
