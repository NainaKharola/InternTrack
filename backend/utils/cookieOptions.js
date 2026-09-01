/**
 * Cookie options helper driven by DEPLOY_MODE environment variable.
 * 'tunnel' -> secure: true, sameSite: 'lax', httpOnly: true
 * 'local'  -> secure: false, sameSite: 'lax', httpOnly: true
 */
function getCookieOptions(overrides = {}) {
  const isTunnel = process.env.DEPLOY_MODE === "tunnel";
  return {
    httpOnly: true,
    secure: isTunnel,
    sameSite: "lax",
    ...overrides,
  };
}

module.exports = { getCookieOptions };
