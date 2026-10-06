import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashToken } from "@/lib/tokens"

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.redirect(`${origin}/sign-in?verify=missing-token`)
  }

  const tokenHash = hashToken(token)
  const record = await prisma.verificationToken.findUnique({ where: { token: tokenHash } })

  if (!record || record.type !== "EMAIL_VERIFICATION" || record.expires < new Date()) {
    return NextResponse.redirect(`${origin}/sign-in?verify=invalid-or-expired`)
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { email: record.email },
        data: { emailVerified: true },
      })
      await tx.verificationToken.delete({ where: { token: tokenHash } })
    })
  } catch {
    return NextResponse.redirect(`${origin}/sign-in?verify=invalid-or-expired`)
  }

  return NextResponse.redirect(`${origin}/sign-in?verify=success`)
}
