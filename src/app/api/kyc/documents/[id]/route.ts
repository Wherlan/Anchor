import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sanitizeFileName } from "@/lib/kyc"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { id } = await params
  const document = await prisma.kycDocument.findUnique({
    where: { id },
    select: { userId: true, fileData: true, fileName: true, mimeType: true, type: true, textValue: true },
  })
  const role = (session.user as { role?: string }).role
  if (!document || (document.userId !== session.user.id && role !== "STAFF")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (!document.fileData || !document.mimeType) {
    return NextResponse.json({ error: "This verification uses text data." }, { status: 404 })
  }

  // JPEGs render inline under a locked-down CSP; PDFs download rather than render, since
  // a PDF viewer on our origin is a larger attack surface than a static image.
  const isPdf = document.mimeType === "application/pdf"
  const safeName = sanitizeFileName(document.fileName || `${document.type}-document`)

  return new NextResponse(document.fileData, {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `${isPdf ? "attachment" : "inline"}; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  })
}
