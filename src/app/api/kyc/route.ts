import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { limitOrResponse } from "@/lib/rate-limit-response"
import { readLimitedFormData } from "@/lib/kyc-upload"
import {
  KYC_MAX_BODY_BYTES,
  KYC_MAX_FILE_SIZE,
  KYC_MAX_SUBMISSIONS_PER_DAY,
  detectFileType,
  maskKycText,
  normalizeSsn,
  sanitizeFileName,
  ssnVariants,
} from "@/lib/kyc"

const DOCUMENT_TYPES = ["DRIVERS_LICENSE", "SSN", "TAX_ID"] as const
type DocumentType = (typeof DOCUMENT_TYPES)[number]

class KycError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return jsonError("Not authenticated", 401)

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { kycLevel: true, kycStatus: true, role: true },
  })
  if (!user) return jsonError("User not found", 404)

  const documents = await prisma.kycDocument.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      level: true,
      type: true,
      status: true,
      fileName: true,
      mimeType: true,
      textValue: true,
      rejectionReason: true,
      reviewedAt: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    kycLevel: user.kycLevel,
    kycStatus: user.kycStatus,
    exempt: user.role === "STAFF",
    documents: documents.map((document) => ({
      ...document,
      textValue: document.textValue ? maskKycText(document.textValue) : null,
      reviewedAt: document.reviewedAt?.toISOString() ?? null,
      createdAt: document.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return jsonError("Not authenticated", 401)
  const userId = session.user.id

  const limited = limitOrResponse(`kyc-submit:${userId}`, 10, 60 * 60 * 1000)
  if (limited) return limited

  const form = await readLimitedFormData(req, KYC_MAX_BODY_BYTES)
  if (form === "too_large") return jsonError("The ID file must be 5 MB or smaller.", 413)
  if (!form) return jsonError("Invalid form data.")

  const typeValue = String(form.get("type") ?? "")
  if (!(DOCUMENT_TYPES as readonly string[]).includes(typeValue)) return jsonError("Choose a valid ID type.")
  const type = typeValue as DocumentType

  // Validate and prepare the payload before touching the database.
  let ssnDigits: string | null = null
  let fileData: Uint8Array<ArrayBuffer> | null = null
  let fileName: string | null = null
  let mimeType: string | null = null

  if (type === "SSN") {
    const textValue = form.get("textValue")
    ssnDigits = typeof textValue === "string" ? normalizeSsn(textValue) : null
    if (!ssnDigits) return jsonError("Enter a valid 9-digit SSN in the format 123-45-6789.")
  } else {
    const file = form.get("file")
    if (!(file instanceof File)) return jsonError("Upload a JPG or PDF of the selected ID.")
    if (file.size <= 0 || file.size > KYC_MAX_FILE_SIZE) {
      return jsonError("The ID file must be between 1 byte and 5 MB.")
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const detected = detectFileType(bytes)
    if (!detected) return jsonError("Only JPG and PDF files are accepted.")
    fileData = bytes
    fileName = sanitizeFileName(file.name)
    mimeType = detected
  }

  try {
    const document = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { kycLevel: true, role: true } })
      if (!user) throw new KycError("User not found", 404)
      if (user.role === "STAFF") throw new KycError("Admin accounts don't require identity verification.", 400)

      const requestedLevel = user.kycLevel === 1 ? 2 : user.kycLevel === 2 ? 3 : 0
      if (!requestedLevel) throw new KycError("Your KYC is already at level 3.", 409)

      const pending = await tx.kycDocument.findFirst({
        where: { userId, status: "PENDING" },
        select: { level: true },
      })
      if (pending) throw new KycError(`Your KYC ${pending.level} document is already under review.`, 409)

      // Caps how many 5 MB blobs one account can push through, whatever the outcome.
      const recent = await tx.kycDocument.count({
        where: { userId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      })
      if (recent >= KYC_MAX_SUBMISSIONS_PER_DAY) {
        throw new KycError("You've reached today's submission limit. Please try again tomorrow.", 429)
      }

      if (requestedLevel === 3) {
        const approved = await tx.kycDocument.findFirst({
          where: { userId, level: 2, status: "APPROVED" },
          select: { type: true },
        })
        if (!approved) throw new KycError("KYC 2 must be approved before you can submit KYC 3.", 409)
        if (approved.type === type) {
          throw new KycError("KYC 3 must use a different ID type from your KYC 2 document.", 400)
        }
      }

      if (ssnDigits) {
        // One SSN can verify one account. Deliberately vague so it can't be used to probe for accounts.
        const duplicate = await tx.kycDocument.findFirst({
          where: {
            type: "SSN",
            userId: { not: userId },
            status: { in: ["PENDING", "APPROVED"] },
            textValue: { in: ssnVariants(ssnDigits) },
          },
          select: { id: true },
        })
        if (duplicate) {
          throw new KycError("This SSN can't be used for verification. Please contact support.", 409)
        }
      }

      return tx.kycDocument.create({
        data: {
          userId,
          level: requestedLevel,
          type,
          status: "PENDING",
          fileName,
          mimeType,
          fileData,
          textValue: ssnDigits,
        },
        select: { id: true, level: true, type: true, status: true },
      })
    })

    return NextResponse.json({ success: true, document })
  } catch (error) {
    if (error instanceof KycError) return jsonError(error.message, error.status)
    console.error("KYC submission failed:", error)
    return jsonError("Couldn't submit your ID. Please try again.", 500)
  }
}
