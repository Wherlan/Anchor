import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notify } from "@/lib/notify"
import { badJson, readJson } from "@/lib/http"
import { toCents, centsToDollars } from "@/lib/money"
import { limitOrResponse } from "@/lib/rate-limit-response"
import { checkKycLimit } from "@/lib/kyc"
import { verifyTransactionPin } from "@/lib/transaction-pin"

const paySchema = z.object({
  payeeId: z.string().min(1),
  amount: z.number().positive().finite().max(1_000_000).optional(),
  // Makes retries / double-submits safe: the same key never moves money twice.
  idempotencyKey: z.string().min(8).max(100).optional(),
  transactionPin: z.string().optional(),
})

class PayError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function findExisting(key: string, userId: string) {
  const existing = await prisma.transaction.findUnique({
    where: { idempotencyKey: key },
    include: { sourceAccount: { select: { userId: true } } },
  })
  if (!existing) return null
  if (existing.sourceAccount?.userId !== userId) {
    throw new PayError("This request key was already used", 409)
  }
  return { transactionId: existing.id }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const userId = session.user.id

  const limited = limitOrResponse(`pay:${userId}`, 20, 60_000)
  if (limited) return limited

  const body = await readJson(req)
  if (body === undefined) return badJson()
  const parsed = paySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const pinCheck = await verifyTransactionPin(userId, parsed.data.transactionPin)
  if (!pinCheck.ok) {
    return NextResponse.json(
      { error: pinCheck.error, code: pinCheck.code },
      { status: pinCheck.status },
    )
  }
  const { idempotencyKey } = parsed.data

  try {
    if (idempotencyKey) {
      const existing = await findExisting(idempotencyKey, userId)
      if (existing) return NextResponse.json({ success: true, duplicate: true, ...existing })
    }

    const result = await prisma.$transaction(async (tx) => {
      const payee = await tx.payee.findUnique({ where: { id: parsed.data.payeeId } })
      if (!payee || payee.userId !== userId) {
        throw new PayError("Payee not found", 404)
      }

      const account = await tx.account.findUnique({ where: { id: payee.sourceAccountId } })
      if (!account || account.userId !== userId) {
        throw new PayError("Source account not found", 404)
      }
      if (!account.isActive) {
        throw new PayError("Source account is inactive", 400)
      }

      const amount = parsed.data.amount ?? Number(payee.amount)
      const cents = toCents(amount)
      if (cents === null) {
        throw new PayError("Amount must be at least $0.01", 400)
      }
      const safeAmount = centsToDollars(cents)

      const kyc = await checkKycLimit(tx, userId, cents)
      if (!kyc.ok) throw new PayError(kyc.message, 403)

      const debit = await tx.account.updateMany({
        where: { id: account.id, balance: { gte: safeAmount } },
        data: { balance: { decrement: safeAmount } },
      })
      if (debit.count === 0) {
        throw new PayError("Insufficient funds", 400)
      }

      const transaction = await tx.transaction.create({
        data: {
          type: "BILL_PAYMENT",
          status: "COMPLETED",
          amount: safeAmount,
          category: "Bill Payment",
          description: `Payment to ${payee.name}`,
          counterpartyName: payee.name,
          sourceAccountId: account.id,
          completedAt: new Date(),
          idempotencyKey,
        },
      })

      await notify(tx, {
        userId,
        title: "Bill paid",
        body: `$${safeAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} sent to ${payee.name}.`,
        type: "TRANSACTION",
      })

      return { transactionId: transaction.id }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    if (err instanceof PayError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    if (
      idempotencyKey &&
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      try {
        const existing = await findExisting(idempotencyKey, userId)
        if (existing) return NextResponse.json({ success: true, duplicate: true, ...existing })
      } catch (lookupErr) {
        if (lookupErr instanceof PayError) {
          return NextResponse.json({ error: lookupErr.message }, { status: lookupErr.status })
        }
      }
    }
    console.error("Bill payment failed:", err)
    return NextResponse.json({ error: "Payment failed. Please try again." }, { status: 500 })
  }
}
