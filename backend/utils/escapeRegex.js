/**
 * Centralized regex escaping helper to prevent regex injection / ReDoS attacks.
 * @param {any} value
 * @returns {string}
 */
function escapeRegex(value) {
  return String(value || "")
    .slice(0, 200) // Bound input length to prevent excessive regex complexity
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { escapeRegex };
