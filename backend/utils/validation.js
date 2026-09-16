/**
 * Security and validation utilities for InternTrack
 * Provides ReDoS-safe, bounded validation functions for user inputs.
 */

/**
 * Validates email addresses using a ReDoS-safe, bounded, linear algorithm.
 * Follows RFC 5322 specifications with a maximum length of 254 characters.
 *
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;

  // Linear, non-backtracking regular expression with distinct non-overlapping character classes
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

/**
 * Validates Indian 10-digit phone numbers.
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== "string") return false;
  const trimmed = phone.trim();
  return /^\d{10}$/.test(trimmed);
}

/**
 * Validates 12-digit Indian Aadhaar numbers.
 * @param {string} aadhaar
 * @returns {boolean}
 */
function isValidAadhaar(aadhaar) {
  if (!aadhaar || typeof aadhaar !== "string") return false;
  const trimmed = aadhaar.trim();
  return /^\d{12}$/.test(trimmed);
}

/**
 * Safely parses a duration string (e.g. "6 Months", "4 Weeks") without catastrophic backtracking.
 *
 * @param {string} duration
 * @returns {{ unit: 'month' | 'week' | null, value: number }}
 */
function parseDurationSafe(duration) {
  if (!duration || typeof duration !== "string") return { unit: null, value: 0 };
  const str = duration.trim().slice(0, 50); // Bound length strictly to 50 characters

  const monthMatch = str.match(/^(\d{1,3})\s*months?$/i) || str.match(/\b(\d{1,3})\s*months?\b/i);
  if (monthMatch) {
    const val = Number(monthMatch[1]);
    if (Number.isSafeInteger(val) && val > 0 && val <= 120) {
      return { unit: "month", value: val };
    }
  }

  const weekMatch = str.match(/^(\d{1,3})\s*weeks?$/i) || str.match(/\b(\d{1,3})\s*weeks?\b/i);
  if (weekMatch) {
    const val = Number(weekMatch[1]);
    if (Number.isSafeInteger(val) && val > 0 && val <= 520) {
      return { unit: "week", value: val };
    }
  }

  return { unit: null, value: 0 };
}

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidAadhaar,
  parseDurationSafe,
};
