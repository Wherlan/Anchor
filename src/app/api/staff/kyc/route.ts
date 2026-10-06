import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user?.id || role !== "STAFF") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  }

  const documents = await prisma.kycDocument.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      level: true,
      type: true,
      status: true,
      fileName: true,
      mimeType: true,
      textValue: true,
      createdAt: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true, kycLevel: true } },
    },
  })

  return NextResponse.json({
    documents: documents.map((d) => ({
      ...d,
      textValue: d.textValue ? `••••••${d.textValue.replace(/\s/g, "").slice(-4)}` : null,
      createdAt: d.createdAt.toISOString(),
    })),
  })
}
