import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notify } from "@/lib/notify"
import { badJson, readJson } from "@/lib/http"
import { toCents } from "@/lib/money"
import { limitOrResponse } from "@/lib/rate-limit-response"

// Hard cap per adjustment; larger corrections should go through a separate, approved process.
const MAX_ADJUSTMENT = 100_000

const adjustSchema = z.object({
  accountId: z.string().min(1),
  amount: z
    .number()
    .finite()
    .refine((n) => n !== 0, "Amount cannot be zero")
    .refine((n) => Math.abs(n) <= MAX_ADJUSTMENT, `Adjustments are limited to $${MAX_ADJUSTMENT.toLocaleString("en-US")}`),
  reason: z.string().min(5).max(200),
})

export async function POST(req: Request) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user?.id || role !== "STAFF") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  }

  const limited = limitOrResponse(`staff-adjust:${session.user.id}`, 30, 60_000)
  if (limited) return limited

  const body = await readJson(req)
  if (body === undefined) return badJson()
  const parsed = adjustSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    )
  }

  const { accountId, amount, reason } = parsed.data
  const isCredit = amount > 0
  const cents = toCents(Math.abs(amount))
  if (cents === null) {
    return NextResponse.json({ error: "Amount must be at least $0.01" }, { status: 400 })
  }
  const absAmount = cents / 100
  const staffId = session.user.id

  try {
    await prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id: accountId } })
      if (!account) throw new Error("Account not found")

      if (isCredit) {
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: absAmount } },
        })
      } else {
        const debit = await tx.account.updateMany({
          where: { id: accountId, balance: { gte: absAmount } },
          data: { balance: { decrement: absAmount } },
        })
        if (debit.count === 0) throw new Error("Insufficient balance for this adjustment")
      }

      // Record the adjustment on the customer's statement.
      const transaction = await tx.transaction.create({
        data: {
          type: isCredit ? "DEPOSIT" : "WITHDRAWAL",
          status: "COMPLETED",
          amount: absAmount,
          category: "Staff Adjustment",
          description: `Staff adjustment: ${reason}`,
          destinationAccountId: isCredit ? accountId : undefined,
          sourceAccountId: isCredit ? undefined : accountId,
          completedAt: new Date(),
        },
      })

      // Who did what, to which account, and why — separate from the customer-visible record.
      await tx.auditLog.create({
        data: {
          actorId: staffId,
          action: isCredit ? "STAFF_CREDIT" : "STAFF_DEBIT",
          targetAccountId: accountId,
          transactionId: transaction.id,
          amount: absAmount,
          reason,
        },
      })

      await notify(tx, {
        userId: account.userId,
        title: "Account adjustment",
        body: `${isCredit ? "+" : "-"}$${absAmount.toFixed(2)} — ${reason}`,
        type: "TRANSACTION",
      })
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Adjustment failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
