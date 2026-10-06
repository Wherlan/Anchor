import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { badJson, readJson } from "@/lib/http"
import { limitOrResponse } from "@/lib/rate-limit-response"
import { generateAccountNumber, SANDBOX_ROUTING_NUMBER, generateCardLast4, defaultCardExpiry, DEFAULT_SPEND_LIMIT } from "@/lib/accounts"

const openAccountSchema = z.object({
  type: z.enum(["CHECKING", "SAVINGS"]),
  nickname: z.string().min(1).max(40),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const limited = limitOrResponse(`open-account:${session.user.id}`, 10, 60 * 60 * 1000)
  if (limited) return limited

  const body = await readJson(req)
  if (body === undefined) return badJson()
  const parsed = openAccountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const account = await prisma.account.create({
        data: {
          userId: session.user.id,
          type: parsed.data.type,
          nickname: parsed.data.nickname,
          accountNumber: generateAccountNumber(),
          routingNumber: SANDBOX_ROUTING_NUMBER,
          balance: 0,
          ...(parsed.data.type === "CHECKING"
            ? {
                card: {
                  create: {
                    last4: generateCardLast4(),
                    network: "VISA",
                    ...defaultCardExpiry(),
                    spendLimit: DEFAULT_SPEND_LIMIT,
                  },
                },
              }
            : {}),
        },
      })

      return NextResponse.json({ success: true, accountId: account.id })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002" || attempt === 4) {
        console.error("Account creation failed:", error)
        return NextResponse.json({ error: "Couldn't open the account. Please try again." }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ error: "Couldn't open the account. Please try again." }, { status: 500 })
}
