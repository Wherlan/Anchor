import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  generateAccountNumber,
  SANDBOX_ROUTING_NUMBER,
  STARTING_CHECKING_BALANCE,
  STARTING_SAVINGS_BALANCE,
  generateCardLast4,
  defaultCardExpiry,
  DEFAULT_SPEND_LIMIT,
} from "@/lib/accounts"
import { badJson, clientIp, readJson } from "@/lib/http"
import { limitOrResponse } from "@/lib/rate-limit-response"

const signupSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  dateOfBirth: z.string(),
  address: z.string().trim().min(1),
})

export async function POST(req: Request) {
  const limited = limitOrResponse(`signup:${clientIp(req)}`, 10, 60 * 60 * 1000)
  if (limited) return limited

  const body = await readJson(req)
  if (body === undefined) return badJson()
  const parsed = signupSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { firstName, lastName, password, dateOfBirth, address } = parsed.data
  const email = parsed.data.email.trim().toLowerCase()
  const dob = new Date(dateOfBirth)

  if (Number.isNaN(dob.getTime())) {
    return NextResponse.json({ error: "Enter a valid date of birth" }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  let user: { id: string; email: string; accounts: { id: string; type: "CHECKING" | "SAVINGS" }[] } | null = null

  for (let attempt = 0; attempt < 3 && !user; attempt += 1) {
    try {
      user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            firstName,
            lastName,
            email,
            emailVerified: true,
            passwordHash,
            dateOfBirth: dob,
            address,
            accounts: {
              create: [
                {
                  type: "CHECKING",
                  nickname: "Everyday Checking",
                  accountNumber: generateAccountNumber(),
                  routingNumber: SANDBOX_ROUTING_NUMBER,
                  balance: STARTING_CHECKING_BALANCE,
                  card: {
                    create: {
                      last4: generateCardLast4(),
                      network: "VISA",
                      ...defaultCardExpiry(),
                      spendLimit: DEFAULT_SPEND_LIMIT,
                    },
                  },
                },
                {
                  type: "SAVINGS",
                  nickname: "Savings",
                  accountNumber: generateAccountNumber(),
                  routingNumber: SANDBOX_ROUTING_NUMBER,
                  balance: STARTING_SAVINGS_BALANCE,
                },
              ],
            },
          },
          select: {
            id: true,
            email: true,
            accounts: { select: { id: true, type: true } },
          },
        })

        const openingDeposits = created.accounts
          .map((account) => ({
            type: "DEPOSIT" as const,
            status: "COMPLETED" as const,
            amount: account.type === "CHECKING" ? STARTING_CHECKING_BALANCE : STARTING_SAVINGS_BALANCE,
            category: "Welcome Deposit",
            description: "Anchor opening deposit",
            destinationAccountId: account.id,
            completedAt: new Date(),
          }))
          .filter((transaction) => transaction.amount > 0)

        if (openingDeposits.length > 0) {
          await tx.transaction.createMany({ data: openingDeposits })
        }

        await tx.notification.create({
          data: {
            userId: created.id,
            type: "SYSTEM",
            title: "Welcome to Anchor",
            body: "Your checking and savings accounts are ready to go.",
          },
        })

        return created
      })
      break
    } catch (error) {
      // Lost a race on the unique email (two signups at once): report it as a duplicate.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const nowExists = await prisma.user.findUnique({ where: { email }, select: { id: true } })
        if (nowExists) {
          return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
        }
      }
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002" || attempt === 2) {
        console.error("Signup failed:", error)
        return NextResponse.json({ error: "Couldn't create your Anchor account. Please try again." }, { status: 500 })
      }
    }
  }

  if (!user) {
    return NextResponse.json({ error: "Couldn't create your Anchor account. Please try again." }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: user.id })
}
