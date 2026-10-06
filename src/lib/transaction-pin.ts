import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, clearRateLimit, recordRateLimitFailure } from "@/lib/rate-limit"

const PIN_ATTEMPT_LIMIT = 5
const PIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000

type PinFailure = {
  ok: false
  status: number
  code: string
  error: string
}

export function isTransactionPin(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}$/.test(value)
}

export async function verifyTransactionPin(userId: string, pin: unknown): Promise<{ ok: true } | PinFailure> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { transactionPinHash: true },
  })

  if (!user) {
    return { ok: false, status: 404, code: "USER_NOT_FOUND", error: "User not found." }
  }
  if (!user.transactionPinHash) {
    return {
      ok: false,
      status: 428,
      code: "PIN_SETUP_REQUIRED",
      error: "Set a transaction PIN before making payments.",
    }
  }

  const rateLimitKey = `transaction-pin:${userId}`
  const rateLimit = checkRateLimit(rateLimitKey, PIN_ATTEMPT_LIMIT, PIN_ATTEMPT_WINDOW_MS)
  if (!rateLimit.allowed) {
    return {
      ok: false,
      status: 429,
      code: "PIN_RATE_LIMITED",
      error: "Too many incorrect PIN attempts. Please try again later.",
    }
  }

  if (!isTransactionPin(pin) || !(await bcrypt.compare(pin, user.transactionPinHash))) {
    recordRateLimitFailure(rateLimitKey, PIN_ATTEMPT_LIMIT, PIN_ATTEMPT_WINDOW_MS)
    return { ok: false, status: 403, code: "INVALID_PIN", error: "That transaction PIN is incorrect." }
  }

  clearRateLimit(rateLimitKey)
  return { ok: true }
}