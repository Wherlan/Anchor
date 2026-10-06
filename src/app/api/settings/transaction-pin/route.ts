import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { readJson, badJson } from "@/lib/http"
import { limitOrResponse } from "@/lib/rate-limit-response"
import { isTransactionPin } from "@/lib/transaction-pin"

const setPinSchema = z.object({ pin: z.string().regex(/^\d{4}$/) })

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { transactionPinHash: true },
  })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  return NextResponse.json({ hasPin: Boolean(user.transactionPinHash) })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const limited = limitOrResponse(`transaction-pin-setup:${session.user.id}`, 5, 60 * 60 * 1000)
  if (limited) return limited

  const body = await readJson(req)
  if (body === undefined) return badJson()
  const parsed = setPinSchema.safeParse(body)
  if (!parsed.success || !isTransactionPin(parsed.data?.pin)) {
    return NextResponse.json({ error: "PIN must be exactly four digits." }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(parsed.data.pin, 10)
  const updated = await prisma.user.updateMany({
    where: { id: session.user.id, transactionPinHash: null },
    data: { transactionPinHash: passwordHash },
  })

  if (updated.count === 0) {
    return NextResponse.json(
      { error: "A transaction PIN is already set. Contact support to reset it.", code: "PIN_ALREADY_SET" },
      { status: 409 },
    )
  }

  return NextResponse.json({ success: true })
}