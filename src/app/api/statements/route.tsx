import { NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { limitOrResponse } from "@/lib/rate-limit-response"

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 20, borderBottom: 2, borderBottomColor: "#0B1F3A", paddingBottom: 12 },
  brand: { fontSize: 16, fontWeight: 700, color: "#0B1F3A" },
  meta: { fontSize: 9, color: "#5B6478", marginTop: 4 },
  section: { marginBottom: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottom: 1, borderBottomColor: "#DCD4BF" },
  th: { fontSize: 8, color: "#5B6478", textTransform: "uppercase" },
  label: { flex: 3 },
  amount: { flex: 1, textAlign: "right" },
  date: { flex: 1, textAlign: "right" },
  summaryBox: { backgroundColor: "#F5F1E8", padding: 10, marginBottom: 16, flexDirection: "row", justifyContent: "space-between" },
})

function StatementDoc({
  accountLabel,
  accountNumber,
  holderName,
  periodLabel,
  openingBalance,
  closingBalance,
  transactions,
}: {
  accountLabel: string
  accountNumber: string
  holderName: string
  periodLabel: string
  openingBalance: number
  closingBalance: number
  transactions: { date: string; desc: string; amount: number; direction: "in" | "out" }[]
}) {
  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Anchor</Text>
          <Text style={styles.meta}>Account Statement — {periodLabel}</Text>
          <Text style={styles.meta}>{holderName} · {accountLabel} · ****{accountNumber.slice(-4)}</Text>
        </View>

        <View style={styles.summaryBox}>
          <Text>Opening Balance: {fmt(openingBalance)}</Text>
          <Text>Closing Balance: {fmt(closingBalance)}</Text>
        </View>

        <View style={styles.section}>
          <View style={[styles.row, { borderBottomWidth: 2, borderBottomColor: "#0B1F3A" }]}>
            <Text style={[styles.th, styles.label]}>Description</Text>
            <Text style={[styles.th, styles.amount]}>Amount</Text>
            <Text style={[styles.th, styles.date]}>Date</Text>
          </View>
          {transactions.map((t, i) => (
            <View style={styles.row} key={i}>
              <Text style={styles.label}>{t.desc}</Text>
              <Text style={styles.amount}>{t.direction === "in" ? "+" : "-"}{fmt(t.amount)}</Text>
              <Text style={styles.date}>{t.date}</Text>
            </View>
          ))}
          {transactions.length === 0 && <Text style={{ padding: 10, color: "#5B6478" }}>No transactions this period.</Text>}
        </View>
      </Page>
    </Document>
  )
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // PDF rendering is CPU-heavy: cap how often one user can trigger it.
  const limited = limitOrResponse(`statement:${session.user.id}`, 10, 60_000)
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get("accountId")
  const month = searchParams.get("month") // YYYY-MM
  if (!accountId || !month) {
    return NextResponse.json({ error: "accountId and month are required" }, { status: 400 })
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { user: { select: { firstName: true, lastName: true } } },
  })
  if (!account || account.userId !== session.user.id) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  const monthMatch = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month)
  if (!monthMatch) {
    return NextResponse.json({ error: "month must be in YYYY-MM format" }, { status: 400 })
  }
  const year = Number(monthMatch[1])
  const mo = Number(monthMatch[2])
  // UTC boundaries so the period doesn't shift with the server's timezone.
  const start = new Date(Date.UTC(year, mo - 1, 1))
  const end = new Date(Date.UTC(year, mo, 1))

  const periodTx = await prisma.transaction.findMany({
    where: {
      OR: [{ sourceAccountId: accountId }, { destinationAccountId: accountId }],
      createdAt: { gte: start, lt: end },
      status: "COMPLETED",
    },
    orderBy: { createdAt: "asc" },
  })

  // Opening balance = everything credited minus everything debited before the period.
  // Aggregated in the database rather than loading every prior transaction.
  const priorWhere = { createdAt: { lt: start }, status: "COMPLETED" as const }
  const [credited, debited] = await Promise.all([
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { ...priorWhere, destinationAccountId: accountId } }),
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { ...priorWhere, sourceAccountId: accountId } }),
  ])
  const openingBalance =
    Math.round((Number(credited._sum.amount ?? 0) - Number(debited._sum.amount ?? 0)) * 100) / 100

  let running = openingBalance
  const rows = periodTx.map((t) => {
    const isIn = t.destinationAccountId === accountId
    running += isIn ? Number(t.amount) : -Number(t.amount)
    return {
      date: t.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      desc: t.description ?? t.type,
      amount: Number(t.amount),
      direction: (isIn ? "in" : "out") as "in" | "out",
    }
  })

  const pdfBuffer = await renderToBuffer(
    <StatementDoc
      accountLabel={account.nickname ?? account.type}
      accountNumber={account.accountNumber}
      holderName={`${account.user.firstName} ${account.user.lastName}`}
      periodLabel={start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
      openingBalance={openingBalance}
      closingBalance={Math.round(running * 100) / 100}
      transactions={rows}
    />
  )

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="statement-${account.accountNumber.slice(-4)}-${month}.pdf"`,
    },
  })
}
