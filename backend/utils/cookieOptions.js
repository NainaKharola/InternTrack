/**
 * Secure cookie options helper.
 * Enforces secure: true in production, tunnel, or when served over HTTPS.
 * Enforces httpOnly: true, sameSite: 'lax', path: '/'
 * @param {object} overrides
 * @param {object|null} req Optional Express request object to detect HTTPS
 */
function getCookieOptions(overrides = {}, req = null) {
  const isProduction = process.env.NODE_ENV === "production";
  const isTunnel = process.env.DEPLOY_MODE === "tunnel";
  const isHttps = req
    ? req.secure || req.headers?.["x-forwarded-proto"] === "https"
    : false;
  const isSecure = isProduction || isTunnel || isHttps;

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    ...overrides,
  };
}

module.exports = { getCookieOptions };
