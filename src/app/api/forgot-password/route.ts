import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { generateVerificationToken, hashToken, PASSWORD_RESET_TOKEN_TTL_MS } from "@/lib/tokens"
import { badJson, readJson } from "@/lib/http"
import { sendPasswordResetEmail } from "@/lib/email"
import { checkRateLimit, getClientIp, recordRateLimitFailure } from "@/lib/rate-limit"

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

const RESET_REQUEST_WINDOW_MS = 15 * 60 * 1000
const RESET_REQUEST_LIMIT = 5

export async function POST(req: Request) {
  const body = await readJson(req)
  if (body === undefined) return badJson()
  const parsed = forgotPasswordSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 })
  }

  const email = parsed.data.email.trim().toLowerCase()
  const ip = getClientIp(req)
  const emailLimit = checkRateLimit(`reset-request:email:${email}`, RESET_REQUEST_LIMIT, RESET_REQUEST_WINDOW_MS)
  const ipLimit = checkRateLimit(`reset-request:ip:${ip}`, RESET_REQUEST_LIMIT * 2, RESET_REQUEST_WINDOW_MS)
  if (!emailLimit.allowed || !ipLimit.allowed) {
    const retryAfter = Math.max(emailLimit.retryAfterSeconds, ipLimit.retryAfterSeconds)
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    )
  }

  recordRateLimitFailure(`reset-request:email:${email}`, RESET_REQUEST_LIMIT, RESET_REQUEST_WINDOW_MS)
  recordRateLimitFailure(`reset-request:ip:${ip}`, (RESET_REQUEST_LIMIT * 2), RESET_REQUEST_WINDOW_MS)

  const user = await prisma.user.findUnique({ where: { email }, select: { email: true } })

  // Always return the same response so the endpoint does not reveal whether
  // an email address belongs to an Anchor account.
  if (!user) {
    return NextResponse.json({ success: true })
  }

  await prisma.verificationToken.deleteMany({ where: { email: user.email, type: "PASSWORD_RESET" } })

  const token = generateVerificationToken()
  await prisma.verificationToken.create({
    data: {
      email: user.email,
      token: hashToken(token),
      type: "PASSWORD_RESET",
      expires: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    },
  })

  const origin = new URL(req.url).origin
  const resetUrl = `${process.env.AUTH_URL || origin}/reset-password?token=${token}`
  try {
    await sendPasswordResetEmail(user.email, resetUrl)
  } catch (error) {
    // Never reveal (via a 500) that this address has an account.
    console.error("Password reset email failed:", error)
  }

  return NextResponse.json({ success: true })
}
