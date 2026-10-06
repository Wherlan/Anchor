import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { limitOrResponse } from "@/lib/rate-limit-response"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Name lookups are the enumeration surface: keep them slow enough to make harvesting impractical.
  const limited = limitOrResponse(`lookup:${session.user.id}`, 15, 10 * 60 * 1000)
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const accountNumber = searchParams.get("accountNumber")?.trim()
  if (!accountNumber) {
    return NextResponse.json({ error: "accountNumber is required" }, { status: 400 })
  }
  if (!/^\d{10}$/.test(accountNumber)) {
    return NextResponse.json({ error: "Account number must be 10 digits" }, { status: 400 })
  }

  const account = await prisma.account.findUnique({
    where: { accountNumber },
    select: { isActive: true, userId: true, user: { select: { firstName: true, lastName: true } } },
  })

  if (!account || !account.isActive) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  if (account.userId === session.user.id) {
    return NextResponse.json({ error: "This is your own Anchor account" }, { status: 400 })
  }

  // Only the name and bank are ever returned here — never balance, email, or
  // anything else. This mirrors how real bank apps do "name enquiry": enough
  // to confirm you're sending to the right person, nothing more.
  return NextResponse.json({
    name: `${account.user.firstName} ${account.user.lastName}`,
    bankName: "Anchor",
  })
}
