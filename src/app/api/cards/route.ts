import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { badJson, readJson } from "@/lib/http"
import { limitOrResponse } from "@/lib/rate-limit-response"
import { notify } from "@/lib/notify"

const updateCardSchema = z.object({
  cardId: z.string().min(1),
  frozen: z.boolean().optional(),
  // 0 is allowed: the UI slider starts at $0.
  spendLimit: z.number().min(0).max(1_000_000).optional(),
})

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const limited = limitOrResponse(`cards:${session.user.id}`, 30, 60_000)
  if (limited) return limited

  const body = await readJson(req)
  if (body === undefined) return badJson()
  const parsed = updateCardSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { cardId, frozen, spendLimit } = parsed.data
  if (frozen === undefined && spendLimit === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  // Ownership check: the card's account must belong to the logged-in user.
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { account: { select: { userId: true } } },
  })
  if (!card || card.account.userId !== session.user.id) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 })
  }

  await prisma.card.update({
    where: { id: cardId },
    data: {
      ...(frozen !== undefined ? { frozen } : {}),
      ...(spendLimit !== undefined ? { spendLimit } : {}),
    },
  })

  if (frozen !== undefined && frozen !== card.frozen) {
    await notify(prisma, {
      userId: session.user.id,
      title: frozen ? "Card frozen" : "Card unfrozen",
      body: frozen
        ? `Your card ending in ${card.last4} has been frozen.`
        : `Your card ending in ${card.last4} is active again.`,
      type: "SECURITY",
    })
  }

  return NextResponse.json({ success: true })
}
