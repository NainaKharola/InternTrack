const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

async function protectAdmin(req, res, next) {
  try {
    let token = req.cookies?.token;
    if (!token) {
      const authHeader = req.headers.authorization || "";
      const [scheme, credentials] = authHeader.split(" ");
      if (scheme === "Bearer" && credentials) {
        token = credentials;
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required.",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "JWT_SECRET is not configured.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin session.",
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired admin token.",
    });
  }
}

async function requireMainAdmin(req, res, next) {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: "Admin authentication required.",
    });
  }

  const mainAdminEmail = process.env.MAIN_ADMIN_EMAIL || "vaibhav.drdo@gmail.com";
  const role = (req.admin.email === mainAdminEmail || req.admin.role === "MAIN_ADMIN") ? "MAIN_ADMIN" : "SUB_ADMIN";

  if (role !== "MAIN_ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Main Admin role required.",
    });
  }

  next();
}

module.exports = { protectAdmin, requireMainAdmin };
