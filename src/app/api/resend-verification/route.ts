import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { generateVerificationToken, hashToken, VERIFICATION_TOKEN_TTL_MS } from "@/lib/tokens"
import { badJson, readJson } from "@/lib/http"
import { sendVerificationEmail } from "@/lib/email"
import { checkRateLimit, getClientIp, recordRateLimitFailure } from "@/lib/rate-limit"

const resendSchema = z.object({
  email: z.string().email(),
})

const RESEND_COOLDOWN_MS = 60 * 1000
const RESEND_WINDOW_MS = 15 * 60 * 1000
const RESEND_LIMIT = 5

export async function POST(req: Request) {
  const body = await readJson(req)
  if (body === undefined) return badJson()
  const parsed = resendSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
  }

  const email = parsed.data.email.trim().toLowerCase()
  const ip = getClientIp(req)
  const emailLimit = checkRateLimit(`verification-resend:email:${email}`, RESEND_LIMIT, RESEND_WINDOW_MS)
  const ipLimit = checkRateLimit(`verification-resend:ip:${ip}`, RESEND_LIMIT * 2, RESEND_WINDOW_MS)
  if (!emailLimit.allowed || !ipLimit.allowed) {
    const retryAfter = Math.max(emailLimit.retryAfterSeconds, ipLimit.retryAfterSeconds)
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    )
  }

  recordRateLimitFailure(`verification-resend:email:${email}`, RESEND_LIMIT, RESEND_WINDOW_MS)
  recordRateLimitFailure(`verification-resend:ip:${ip}`, (RESEND_LIMIT * 2), RESEND_WINDOW_MS)

  const user = await prisma.user.findUnique({ where: { email } })

  // Keep the response the same for unknown, verified, and unverified accounts
  // so this endpoint cannot be used to discover registered email addresses.
  if (!user || user.emailVerified) {
    return NextResponse.json({ success: true })
  }

  const latestToken = await prisma.verificationToken.findFirst({
    where: { email, type: "EMAIL_VERIFICATION" },
    orderBy: { createdAt: "desc" },
  })

  if (latestToken && Date.now() - latestToken.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return NextResponse.json({ success: true })
  }

  await prisma.verificationToken.deleteMany({ where: { email, type: "EMAIL_VERIFICATION" } })

  const token = generateVerificationToken()
  await prisma.verificationToken.create({
    data: {
      email,
      token: hashToken(token),
      type: "EMAIL_VERIFICATION",
      expires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
  })

  const verifyUrl = `${process.env.AUTH_URL || "http://localhost:3000"}/api/verify-email?token=${token}`
  try {
    await sendVerificationEmail(email, verifyUrl)
  } catch (error) {
    console.error("Verification email failed:", error)
  }

  return NextResponse.json({ success: true })
}
