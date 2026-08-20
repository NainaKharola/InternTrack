require("dotenv").config();

const requiredEnv = ["JWT_SECRET", "DB_PASSWORD", "MAIN_ADMIN_EMAIL"];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`❌ Startup Error: Missing required environment variables: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const adminRoutes = require("./routes/adminRoutes");
const offerLetterRoutes = require("./routes/offerLetterRoutes");
const studentRoutes = require("./routes/studentRoutes");
const collegeRoutes = require("./routes/collegeRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

const pool = require("./db");

pool.query("SELECT NOW()")
  .then(result => {
    console.log("PostgreSQL test successful:");
    console.log(result.rows[0]);
  })
  .catch(err => {
    console.error("PostgreSQL connection failed:", err.message);
  });
["photos", "resumes", "results", "permissionLetters", "aadhaarCards", "offerLetters", "gyapan", "completedDocuments"].forEach((folder) => {
  fs.mkdirSync(path.join(__dirname, "uploads", folder), { recursive: true });
});


// ========================
// Security Middleware & CORS
// ========================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many attempts. Please try again after 15 minutes." }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: "Too many requests. Please try again after 15 minutes." }
});

app.use("/api/", generalLimiter);
app.use("/api/admin/auth", authLimiter);

const allowedOrigins = process.env.NODE_ENV === "production"
  ? ["https://web-portal-hazel-six.vercel.app"]
  : [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
  ];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

// ========================
// Body Parser
// ========================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Admin responses can contain sensitive registration data. Prevent browsers
// and intermediary caches from restoring an authenticated view after logout.
app.use(["/api/admin", "/api/offer-letter"], (req, res, next) => {
  res.set("Cache-Control", "no-store, private, max-age=0");
  res.set("Pragma", "no-cache");
  next();
});

// ========================
// Static Upload Folder
// ========================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ========================
// Health Check
// ========================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Student Registration Backend is running",
  });
});

// ========================
// Routes
// ========================
app.use("/api/students", studentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/offer-letter", offerLetterRoutes);
app.use("/api/colleges", collegeRoutes);
// ========================
// 404 Handler
// ========================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ========================
// Global Error Handler
// ========================
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});


// ========================
// Start Server
// ========================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
