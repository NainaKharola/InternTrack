const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
if (!process.env.ENCRYPTION_KEY) {
  throw new Error("CRITICAL SECURITY ERROR: ENCRYPTION_KEY is required in the environment.");
}
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex");

function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decrypt(cipherText) {
  if (!cipherText) return cipherText;
  const parts = String(cipherText).split(":");
  if (parts.length !== 3) {
    // Fallback to plain text if not in encrypted format (legacy compatibility)
    return cipherText;
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    // Keep raw value if decryption fails (e.g. key mismatches during transition)
    return cipherText;
  }
}

module.exports = { encrypt, decrypt };
