import type { Prisma } from "@prisma/client"

export const KYC_MAX_FILE_SIZE = 5 * 1024 * 1024
/** Multipart overhead allowed on top of the file itself when capping the request body. */
export const KYC_MAX_BODY_BYTES = KYC_MAX_FILE_SIZE + 64 * 1024
/** Submissions (of any outcome) one user may make in a rolling 24 hours. */
export const KYC_MAX_SUBMISSIONS_PER_DAY = 5

export const KYC_LEVELS = [1, 2, 3] as const

export function kycLevelLabel(level: number) {
  return `KYC ${Math.min(3, Math.max(1, level))}`
}

/** Max amount per outgoing transfer (to other people / banks) and bill payment, by KYC level. */
export const KYC_TRANSFER_LIMITS: Record<number, number> = {
  1: 1_000,
  2: 10_000,
  3: 1_000_000,
}

export function transferLimitFor(level: number) {
  return KYC_TRANSFER_LIMITS[level] ?? KYC_TRANSFER_LIMITS[1]
}

/** Checked inside the money-moving transaction so the level can't change between check and debit. */
export async function checkKycLimit(
  tx: Prisma.TransactionClient,
  userId: string,
  cents: number
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { kycLevel: true, role: true } })
  // Admins are exempt from KYC levels and limits.
  if (user?.role === "STAFF") return { ok: true }
  const level = user?.kycLevel ?? 1
  const limit = transferLimitFor(level)
  if (cents <= limit * 100) return { ok: true }
  return {
    ok: false,
    message: `Your verification level (KYC ${level}) allows up to $${limit.toLocaleString("en-US")} per transaction. Verify your identity in Settings to raise this limit.`,
  }
}

/** Identify a file by its magic bytes — the client-declared type and filename are never trusted. */
export function detectFileType(bytes: Uint8Array): "image/jpeg" | "application/pdf" | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"
  if (
    bytes.length > 5 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d // -
  ) {
    return "application/pdf"
  }
  return null
}

/** Returns the 9 SSN digits, or null when the format or the number range is invalid. */
export function normalizeSsn(value: string): string | null {
  const match = /^(\d{3})-?(\d{2})-?(\d{4})$/.exec(value.replace(/\s/g, ""))
  if (!match) return null
  const [, area, group, serial] = match
  if (area === "000" || area === "666" || area[0] === "9" || group === "00" || serial === "0000") return null
  return `${area}${group}${serial}`
}

/** Both storage formats ever used (digits only, and dashed) so duplicate checks match old rows too. */
export function ssnVariants(digits: string) {
  return [digits, `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`]
}

/** Keep filenames harmless for headers and logs. */
export function sanitizeFileName(name: string) {
  const cleaned = name.replace(/[^\w.\- ]/g, "_").trim().slice(0, 100)
  return cleaned || "document"
}

export function maskKycText(value: string) {
  const compact = value.replace(/\s/g, "")
  if (compact.length <= 4) return "••••"
  return `••••••${compact.slice(-4)}`
}
