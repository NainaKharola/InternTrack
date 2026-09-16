const rateLimit = require("express-rate-limit");

const isDev = process.env.NODE_ENV !== "production";

// Brute-force protection specifically for sensitive credential-checking login routes
const authLimiter = rateLimit({
  windowMs: isDev ? 1 * 60 * 1000 : 15 * 60 * 1000,
  max: isDev ? 50 : 15,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const retrySecs = Math.ceil(options.windowMs / 1000);
    const retryMins = Math.ceil(retrySecs / 60);
    res.setHeader("Retry-After", String(retrySecs));
    if (isDev) {
      console.warn(`[authLimiter] 429 BLOCKED: ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
    }
    return res.status(429).json({
      success: false,
      message: isDev
        ? `Too many login attempts. Please wait ${retrySecs} seconds before trying again.`
        : `Too many login attempts. Please try again after ${retryMins} minutes.`
    });
  }
});

// Brute-force protection for password recovery requests and secret answer verification
const recoveryLimiter = rateLimit({
  windowMs: isDev ? 1 * 60 * 1000 : 15 * 60 * 1000,
  max: isDev ? 30 : 10,
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const retrySecs = Math.ceil(options.windowMs / 1000);
    const retryMins = Math.ceil(retrySecs / 60);
    res.setHeader("Retry-After", String(retrySecs));
    if (isDev) {
      console.warn(`[recoveryLimiter] 429 BLOCKED: ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
    }
    return res.status(429).json({
      success: false,
      message: isDev
        ? `Too many recovery attempts. Please wait ${retrySecs} seconds before trying again.`
        : `Too many recovery attempts. Please try again after ${retryMins} minutes.`
    });
  }
});

// Protection for student public registration endpoint
const registrationLimiter = rateLimit({
  windowMs: isDev ? 1 * 60 * 1000 : 15 * 60 * 1000,
  max: isDev ? 100 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const retrySecs = Math.ceil(options.windowMs / 1000);
    res.setHeader("Retry-After", String(retrySecs));
    return res.status(429).json({
      success: false,
      message: "Too many registration attempts from this IP. Please try again later."
    });
  }
});

// Protection for expensive file uploads and bulk imports
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const retrySecs = Math.ceil(options.windowMs / 1000);
    res.setHeader("Retry-After", String(retrySecs));
    return res.status(429).json({
      success: false,
      message: "Upload rate limit reached. Please wait before uploading more files."
    });
  }
});

// Protection for file download and proxy streaming endpoints
const fileDownloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const retrySecs = Math.ceil(options.windowMs / 1000);
    res.setHeader("Retry-After", String(retrySecs));
    return res.status(429).json({
      success: false,
      message: "File download rate limit exceeded. Please try again later."
    });
  }
});

// Protection for computationally intensive document generation (PDF/Puppeteer)
const documentGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 300 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const retrySecs = Math.ceil(options.windowMs / 1000);
    res.setHeader("Retry-After", String(retrySecs));
    return res.status(429).json({
      success: false,
      message: "Document generation limit reached. Please wait a few moments before generating more documents."
    });
  }
});

// General portal-wide API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 5000 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const retrySecs = Math.ceil(options.windowMs / 1000);
    res.setHeader("Retry-After", String(retrySecs));
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later."
    });
  }
});

module.exports = {
  authLimiter,
  recoveryLimiter,
  registrationLimiter,
  uploadLimiter,
  fileDownloadLimiter,
  documentGenerationLimiter,
  generalLimiter,
};
