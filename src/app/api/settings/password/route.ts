import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { badJson, readJson } from "@/lib/http"
import { limitOrResponse } from "@/lib/rate-limit-response"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Throttle guesses at the current password.
  const limited = limitOrResponse(`change-password:${session.user.id}`, 5, 15 * 60 * 1000)
  if (limited) return limited

  const body = await readJson(req)
  if (body === undefined) return badJson()
  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const validCurrent = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
  if (!validCurrent) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, sessionVersion: { increment: 1 } },
  })

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "SECURITY",
      title: "Password changed",
      body: "Your password was successfully updated.",
    },
  })

  // sessionVersion changed, so this session is now invalid too: the client signs out.
  return NextResponse.json({ success: true, signOutRequired: true })
}
