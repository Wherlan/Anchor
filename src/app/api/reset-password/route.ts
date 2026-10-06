import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { hashToken } from "@/lib/tokens"
import { badJson, readJson } from "@/lib/http"
import { limitOrResponse } from "@/lib/rate-limit-response"
import { getClientIp } from "@/lib/rate-limit"

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export async function POST(req: Request) {
  const limited = limitOrResponse(`reset:${getClientIp(req)}`, 10, 15 * 60 * 1000)
  if (limited) return limited

  const body = await readJson(req)
  if (body === undefined) return badJson()
  const parsed = resetPasswordSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reset request" }, { status: 400 })
  }

  const tokenHash = hashToken(parsed.data.token)
  const record = await prisma.verificationToken.findUnique({ where: { token: tokenHash } })
  if (!record || record.type !== "PASSWORD_RESET" || record.expires < new Date()) {
    if (record?.type === "PASSWORD_RESET") {
      await prisma.verificationToken.delete({ where: { token: tokenHash } }).catch(() => undefined)
    }
    return NextResponse.json({ error: "That password reset link is invalid or has expired" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email: record.email } })
  if (!user) {
    await prisma.verificationToken.delete({ where: { token: tokenHash } })
    return NextResponse.json({ error: "That password reset link is invalid or has expired" }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        // Bumping sessionVersion ends every existing session.
        data: { passwordHash, sessionVersion: { increment: 1 } },
      }),
      prisma.verificationToken.delete({ where: { token: tokenHash } }),
      prisma.notification.create({
        data: {
          userId: user.id,
          type: "SECURITY",
          title: "Password reset",
          body: "Your password was successfully reset.",
        },
      }),
    ])
  } catch {
    // The token was consumed by a concurrent request.
    return NextResponse.json({ error: "That password reset link is invalid or has expired" }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
