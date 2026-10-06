import crypto from "crypto"

export function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Tokens are emailed in raw form but only their SHA-256 hash is stored, so a
 * database leak does not expose live verification / reset links.
 */
export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000
