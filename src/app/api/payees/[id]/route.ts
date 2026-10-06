import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params
  const payee = await prisma.payee.findUnique({ where: { id } })
  if (!payee || payee.userId !== session.user.id) {
    return NextResponse.json({ error: "Payee not found" }, { status: 404 })
  }

  await prisma.payee.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
