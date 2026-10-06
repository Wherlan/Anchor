import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { notify } from "@/lib/notify"
import { badJson, readJson } from "@/lib/http"
import { limitOrResponse } from "@/lib/rate-limit-response"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user?.id || role !== "STAFF") return NextResponse.json({ error: "Not authorized" }, { status: 403 })

  const { id } = await params
  const document = await prisma.kycDocument.findUnique({
    where: { id },
    select: { id: true, level: true, type: true, status: true, fileName: true, mimeType: true, textValue: true, rejectionReason: true, reviewedAt: true, reviewedById: true, createdAt: true, user: { select: { firstName: true, lastName: true, email: true, kycLevel: true } } },
  })
  if (!document) return NextResponse.json({ error: "KYC document not found" }, { status: 404 })
  return NextResponse.json({ ...document, createdAt: document.createdAt.toISOString(), reviewedAt: document.reviewedAt?.toISOString() ?? null })
}

class ReviewError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(300).optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user?.id || role !== "STAFF") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  }
  const staffId = session.user.id

  const limited = limitOrResponse(`kyc-review:${staffId}`, 60, 60_000)
  if (limited) return limited

  const { id } = await params
  const rawBody = await readJson(req)
  if (rawBody === undefined) return badJson()
  const parsed = reviewSchema.safeParse(rawBody)
  if (!parsed.success) return NextResponse.json({ error: "Invalid review action" }, { status: 400 })
  const { action } = parsed.data
  const reason = parsed.data.reason ?? ""
  if (action === "reject" && (reason.length < 5 || reason.length > 300)) {
    return NextResponse.json({ error: "A rejection reason of 5–300 characters is required." }, { status: 400 })
  }

  try {
    await prisma.$transaction(async (tx) => {
      const document = await tx.kycDocument.findUnique({ where: { id } })
      if (!document) throw new ReviewError("KYC document not found", 404)
      if (document.status !== "PENDING") throw new ReviewError("This KYC document has already been reviewed", 409)

      const user = await tx.user.findUnique({ where: { id: document.userId }, select: { kycLevel: true } })
      if (!user) throw new ReviewError("User not found", 404)

      if (action === "approve") {
        if (document.level !== user.kycLevel + 1) {
          throw new ReviewError("This KYC level is no longer eligible for approval", 409)
        }
        if (document.level === 3) {
          const level2 = await tx.kycDocument.findFirst({
            where: { userId: document.userId, level: 2, status: "APPROVED" },
            select: { type: true },
          })
          if (!level2 || level2.type === document.type) {
            throw new ReviewError("KYC 2 must be approved with a different ID type first", 409)
          }
        }

        // Conditional update: only one reviewer can settle a PENDING document, even if two
        // reviews race (the loser sees count 0 and the whole transaction rolls back).
        const settled = await tx.kycDocument.updateMany({
          where: { id, status: "PENDING" },
          data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: staffId, rejectionReason: null },
        })
        if (settled.count === 0) throw new ReviewError("This KYC document has already been reviewed", 409)

        const raised = await tx.user.updateMany({
          where: { id: document.userId, kycLevel: document.level - 1 },
          data: { kycLevel: document.level, kycStatus: document.level === 3 ? "VERIFIED" : "PENDING" },
        })
        if (raised.count === 0) throw new ReviewError("This KYC level is no longer eligible for approval", 409)

        await notify(tx, {
          userId: document.userId,
          title: `KYC ${document.level} verified`,
          body:
            document.level === 3
              ? "Your identity verification is complete."
              : `Your KYC ${document.level} document was approved. You can now submit KYC ${document.level + 1}.`,
          type: "SECURITY",
        })
      } else {
        // Rejected submissions have no further use, so the stored ID data is erased with the
        // decision (data minimisation). The user's level and status are left untouched.
        const settled = await tx.kycDocument.updateMany({
          where: { id, status: "PENDING" },
          data: {
            status: "REJECTED",
            reviewedAt: new Date(),
            reviewedById: staffId,
            rejectionReason: reason,
            fileData: null,
            fileName: null,
            mimeType: null,
            textValue: null,
          },
        })
        if (settled.count === 0) throw new ReviewError("This KYC document has already been reviewed", 409)

        await notify(tx, {
          userId: document.userId,
          title: `KYC ${document.level} needs attention`,
          body: `Your KYC ${document.level} document was rejected. ${reason} You can submit another.`,
          type: "SECURITY",
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ReviewError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("KYC review failed:", error)
    return NextResponse.json({ error: "KYC review failed. Please try again." }, { status: 500 })
  }
}
