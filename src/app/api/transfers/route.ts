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

const transferSchema = z.object({
  fromAccountId: z.string().min(1),
  transferType: z.enum(["anchor", "external"]).default("anchor"),
  // Either an internal destination account id (own account) or an external
  // account number (P2P, another Anchor user) — never both.
  toAccountId: z.string().min(1).optional(),
  toAccountNumber: z.string().regex(/^\d{10}$/, "Account number must be 10 digits").optional(),
  bankName: z.string().min(2).max(100).optional(),
  recipientName: z.string().min(2).max(120).optional(),
  amount: z.number().positive().finite().max(1_000_000),
  description: z.string().max(140).optional(),
  // Makes retries / double-submits safe: the same key never moves money twice.
  idempotencyKey: z.string().min(8).max(100).optional(),
  transactionPin: z.string().optional(),
})

class TransferError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

type TransferResult = { transactionId: string; recipientName: string }

const usd = (amount: number) => `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`

function isUniqueViolation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
}

/** Look up a previously completed transfer for this idempotency key (scoped to the caller). */
async function findExisting(key: string, userId: string): Promise<TransferResult | null> {
  const existing = await prisma.transaction.findUnique({
    where: { idempotencyKey: key },
    include: {
      sourceAccount: { select: { userId: true } },
      destinationAccount: { select: { user: { select: { firstName: true, lastName: true } } } },
    },
  })
  if (!existing) return null
  if (existing.sourceAccount?.userId !== userId) {
    throw new TransferError("This request key was already used", 409)
  }
  const destUser = existing.destinationAccount?.user
  return {
    transactionId: existing.id,
    recipientName:
      existing.counterpartyName ?? (destUser ? `${destUser.firstName} ${destUser.lastName}`.trim() : ""),
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const userId = session.user.id

  const limited = limitOrResponse(`transfer:${userId}`, 20, 60_000)
  if (limited) return limited

  const body = await readJson(req)
  if (body === undefined) return badJson()
  const parsed = transferSchema.safeParse(body)
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

  const {
    fromAccountId,
    transferType,
    toAccountId,
    toAccountNumber,
    bankName,
    recipientName: externalRecipientName,
    amount,
    description,
    idempotencyKey,
  } = parsed.data

  if (transferType === "external") {
    if (!toAccountNumber || !bankName || !externalRecipientName) {
      return NextResponse.json({ error: "Bank, account number, and recipient name are required" }, { status: 400 })
    }
    if (toAccountId) {
      return NextResponse.json({ error: "Provide only one destination" }, { status: 400 })
    }
  }

  if (transferType === "anchor" && !toAccountId && !toAccountNumber) {
    return NextResponse.json({ error: "A destination account is required" }, { status: 400 })
  }
  if (transferType === "anchor" && toAccountId && toAccountNumber) {
    return NextResponse.json({ error: "Provide only one destination" }, { status: 400 })
  }

  // Round to whole cents before it ever touches the DB, and reject amounts that
  // round to nothing (e.g. 0.001) so we never record a $0.00 "completed" transfer.
  const cents = toCents(amount)
  if (cents === null) {
    return NextResponse.json({ error: "Amount must be at least $0.01" }, { status: 400 })
  }
  const safeAmount = centsToDollars(cents)

  try {
    if (idempotencyKey) {
      const existing = await findExisting(idempotencyKey, userId)
      if (existing) return NextResponse.json({ success: true, duplicate: true, ...existing })
    }

    const result: TransferResult = await prisma.$transaction(async (tx) => {
      // The source account must belong to the logged-in user.
      const fromAccount = await tx.account.findUnique({ where: { id: fromAccountId } })
      if (!fromAccount || fromAccount.userId !== userId) {
        throw new TransferError("Source account not found", 404)
      }
      if (!fromAccount.isActive) {
        throw new TransferError("Source account is inactive", 400)
      }

      // Moves to other people/banks are capped by KYC level; moves between your own accounts are not.
      if (transferType === "external" || toAccountNumber) {
        const kyc = await checkKycLimit(tx, userId, cents)
        if (!kyc.ok) throw new TransferError(kyc.message, 403)
      }

      if (transferType === "external") {
        const debit = await tx.account.updateMany({
          where: { id: fromAccount.id, balance: { gte: safeAmount } },
          data: { balance: { decrement: safeAmount } },
        })
        if (debit.count === 0) {
          throw new TransferError("Insufficient funds", 400)
        }

        const transaction = await tx.transaction.create({
          data: {
            type: "TRANSFER_EXTERNAL",
            status: "COMPLETED",
            amount: safeAmount,
            category: "Transfer",
            description: description || `Transfer to ${externalRecipientName} · ${bankName}`,
            counterpartyName: externalRecipientName,
            sourceAccountId: fromAccount.id,
            completedAt: new Date(),
            idempotencyKey,
          },
        })

        await notify(tx, {
          userId,
          title: "External transfer completed",
          body: `${usd(safeAmount)} sent to ${externalRecipientName} at ${bankName}.`,
          type: "TRANSACTION",
        })

        return { transactionId: transaction.id, recipientName: externalRecipientName! }
      }

      // Resolve the destination account.
      const toAccount = toAccountId
        ? await tx.account.findUnique({
            where: { id: toAccountId },
            include: { user: { select: { firstName: true, lastName: true } } },
          })
        : await tx.account.findUnique({
            where: { accountNumber: toAccountNumber! },
            include: { user: { select: { firstName: true, lastName: true } } },
          })

      if (!toAccount) {
        throw new TransferError("Destination account not found", 404)
      }
      if (!toAccount.isActive) {
        throw new TransferError("Destination account is inactive", 400)
      }
      if (toAccount.id === fromAccount.id) {
        throw new TransferError("Cannot transfer to the same account", 400)
      }

      const isInternal = toAccount.userId === fromAccount.userId
      if (toAccountNumber && isInternal) {
        throw new TransferError("Use Quick Transfer to move money between your own accounts", 400)
      }
      if (toAccountId && !isInternal) {
        throw new TransferError("That account does not belong to you", 403)
      }

      // Debit only when the balance is still sufficient.
      const debit = await tx.account.updateMany({
        where: { id: fromAccount.id, balance: { gte: safeAmount } },
        data: { balance: { decrement: safeAmount } },
      })
      if (debit.count === 0) {
        throw new TransferError("Insufficient funds", 400)
      }

      await tx.account.update({
        where: { id: toAccount.id },
        data: { balance: { increment: safeAmount } },
      })

      const destinationName = `${toAccount.user.firstName} ${toAccount.user.lastName}`.trim()

      const transaction = await tx.transaction.create({
        data: {
          type: isInternal ? "TRANSFER_INTERNAL" : "TRANSFER_P2P",
          status: "COMPLETED",
          amount: safeAmount,
          category: "Transfer",
          description: description || (isInternal ? "Transfer between accounts" : "Transfer to another user"),
          counterpartyName: isInternal ? null : destinationName,
          sourceAccountId: fromAccount.id,
          destinationAccountId: toAccount.id,
          completedAt: new Date(),
          idempotencyKey,
        },
      })

      await notify(tx, {
        userId,
        title: isInternal ? "Transfer completed" : "Money sent",
        body: `${usd(safeAmount)} moved from ${fromAccount.nickname ?? "your account"}.`,
        type: "TRANSACTION",
      })
      if (!isInternal) {
        await notify(tx, {
          userId: toAccount.userId,
          title: "Money received",
          body: `${usd(safeAmount)} was deposited into ${toAccount.nickname ?? "your account"}.`,
          type: "TRANSACTION",
        })
      }

      return { transactionId: transaction.id, recipientName: destinationName }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    if (err instanceof TransferError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    // A concurrent request with the same key won the race: the whole transaction
    // (including the debit) rolled back, so return the winner's result instead.
    if (idempotencyKey && isUniqueViolation(err)) {
      try {
        const existing = await findExisting(idempotencyKey, userId)
        if (existing) return NextResponse.json({ success: true, duplicate: true, ...existing })
      } catch (lookupErr) {
        if (lookupErr instanceof TransferError) {
          return NextResponse.json({ error: lookupErr.message }, { status: lookupErr.status })
        }
      }
    }
    console.error("Transfer failed:", err)
    return NextResponse.json({ error: "Transfer failed. Please try again." }, { status: 500 })
  }
}
