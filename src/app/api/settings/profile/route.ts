import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { badJson, readJson } from "@/lib/http"
import { limitOrResponse } from "@/lib/rate-limit-response"

const profileSchema = z.object({
  name: z.string().trim().min(3).max(100),
  email: z.string().trim().toLowerCase().email(),
})

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const userId = session.user.id

  const limited = limitOrResponse(`profile:${userId}`, 10, 15 * 60 * 1000)
  if (limited) return limited

  const body = await readJson(req)
  if (body === undefined) return badJson()
  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid name and email address." }, { status: 400 })
  }

  const parts = parsed.data.name.split(/\s+/).filter(Boolean)
  if (parts.length < 2) {
    return NextResponse.json({ error: "Enter your first and last name." }, { status: 400 })
  }

  const firstName = parts[0]
  const lastName = parts.slice(1).join(" ")

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  if (!currentUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const emailChanged = parsed.data.email !== currentUser.email
  const existing = await prisma.user.findFirst({
    where: {
      email: parsed.data.email,
      NOT: { id: userId },
    },
    select: { id: true },
  })

  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 })
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      if (emailChanged) {
        await tx.verificationToken.deleteMany({
          where: { email: { in: [currentUser.email, parsed.data.email] }, type: "EMAIL_VERIFICATION" },
        })
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          email: parsed.data.email,
          ...(emailChanged ? { emailVerified: true, sessionVersion: { increment: 1 } } : {}),
        },
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      })

      return updated
    })

    return NextResponse.json({ success: true, user, emailVerificationRequired: false })
  } catch {
    return NextResponse.json({ error: "Couldn't update your profile." }, { status: 500 })
  }
}
