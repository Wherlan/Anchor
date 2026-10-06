import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { badJson, readJson } from "@/lib/http"
import { limitOrResponse } from "@/lib/rate-limit-response"

const adminSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(12, "Password must be at least 12 characters").max(128),
})

// Staff-only: registers a new admin who can sign in at /staff-login straight away.
export async function POST(req: Request) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user?.id || role !== "STAFF") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  }
  const staffId = session.user.id

  const limited = limitOrResponse(`staff-create-admin:${staffId}`, 10, 60 * 60 * 1000)
  if (limited) return limited

  const body = await readJson(req)
  if (body === undefined) return badJson()
  const parsed = adminSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input"
    return NextResponse.json({ error: message }, { status: 400 })
  }
  const { firstName, lastName, email, password } = parsed.data

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const admin = await prisma.$transaction(async (tx) => {
      // Existing customers are never promoted: they hold accounts and money.
      const existing = await tx.user.findUnique({ where: { email }, select: { id: true } })
      if (existing) return null

      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          // Same internal placeholders the seeded admin uses; admins have no customer profile.
          dateOfBirth: new Date("1990-01-01"),
          address: "Internal",
          role: "STAFF",
          kycStatus: "VERIFIED",
          kycLevel: 3,
          emailVerified: true,
        },
        select: { id: true, email: true, firstName: true, lastName: true },
      })

      await tx.auditLog.create({
        data: { actorId: staffId, action: "STAFF_CREATE_ADMIN", reason: `Registered admin ${created.email}` },
      })
      return created
    })

    if (!admin) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }
    return NextResponse.json({ success: true, admin })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }
    console.error("Admin registration failed:", error)
    return NextResponse.json({ error: "Couldn't register the admin. Please try again." }, { status: 500 })
  }
}
