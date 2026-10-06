import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { badJson, readJson } from "@/lib/http"

const patchSchema = z.object({
  id: z.string().min(1).optional(),
  markAllRead: z.boolean().optional(),
})

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const userId = session.user.id

  const body = await readJson(req)
  if (body === undefined) return badJson()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  if (parsed.data.markAllRead) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })
    return NextResponse.json({ success: true })
  }

  if (parsed.data.id) {
    const notification = await prisma.notification.findUnique({ where: { id: parsed.data.id } })
    if (!notification || notification.userId !== userId) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }
    await prisma.notification.update({
      where: { id: parsed.data.id },
      data: { read: true },
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
}
