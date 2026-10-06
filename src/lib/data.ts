import { prisma } from "@/lib/prisma"

export type UserProfile = {
  firstName: string
  lastName: string
  email: string
}

export async function getUserProfileForUser(userId: string): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true },
  })

  return user
}

export type AccountWithCard = {
  id: string
  type: "CHECKING" | "SAVINGS"
  nickname: string | null
  accountNumber: string
  routingNumber: string
  balance: number
  isActive: boolean
  createdAt: string
  card: {
    id: string
    last4: string
    network: "VISA" | "MASTERCARD"
    frozen: boolean
    spendLimit: number
    expiryMonth: number
    expiryYear: number
  } | null
}

export async function getAccountsForUser(userId: string): Promise<AccountWithCard[]> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    include: { card: true },
    orderBy: { createdAt: "asc" },
  })

  // Prisma's Decimal type isn't plain-serializable across the Server ->
  // Client Component boundary, so convert to plain numbers/strings here.
  return accounts.map((a) => ({
    id: a.id,
    type: a.type,
    nickname: a.nickname,
    accountNumber: a.accountNumber,
    routingNumber: a.routingNumber,
    balance: Number(a.balance),
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
    card: a.card
      ? {
          id: a.card.id,
          last4: a.card.last4,
          network: a.card.network,
          frozen: a.card.frozen,
          spendLimit: Number(a.card.spendLimit),
          expiryMonth: a.card.expiryMonth,
          expiryYear: a.card.expiryYear,
        }
      : null,
  }))
}

export type TransactionRow = {
  id: string
  type: string
  status: string
  amount: number
  category: string | null
  description: string | null
  direction: "in" | "out"
  accountNickname: string | null
  createdAt: string
}

export async function getRecentTransactionsForUser(
  userId: string,
  limit = 10
): Promise<TransactionRow[]> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true, nickname: true, type: true },
  })
  const accountIds = accounts.map((a) => a.id)
  const nicknameById = new Map(
    accounts.map((a) => [a.id, a.nickname || (a.type === "CHECKING" ? "Checking" : "Savings")])
  )

  if (accountIds.length === 0) return []

  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { sourceAccountId: { in: accountIds } },
        { destinationAccountId: { in: accountIds } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return transactions.map((t) => {
    // A transfer between two of the user's own accounts still counts as
    // "out" from the source side for display purposes.
    const destinationIsMine = t.destinationAccountId ? accountIds.includes(t.destinationAccountId) : false
    const sourceIsMine = t.sourceAccountId ? accountIds.includes(t.sourceAccountId) : false
    const isIncoming = destinationIsMine && !sourceIsMine
    const relevantAccountId = isIncoming ? t.destinationAccountId : t.sourceAccountId

    return {
      id: t.id,
      type: t.type,
      status: t.status,
      amount: Number(t.amount),
      category: t.category,
      description: t.description,
      direction: isIncoming ? "in" : "out",
      accountNickname: relevantAccountId ? nicknameById.get(relevantAccountId) ?? null : null,
      createdAt: t.createdAt.toISOString(),
    }
  })
}

export type BalancePoint = { date: string; balance: number }

export async function getBalanceHistoryForUser(userId: string): Promise<BalancePoint[]> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true },
  })
  const accountIds = accounts.map((a) => a.id)
  if (accountIds.length === 0) return []

  const transactions = await prisma.transaction.findMany({
    where: {
      status: "COMPLETED",
      OR: [
        { sourceAccountId: { in: accountIds } },
        { destinationAccountId: { in: accountIds } },
      ],
    },
    orderBy: { createdAt: "asc" },
  })

  // Reconstruct the running total balance across all of the user's accounts,
  // purely from real transaction history — no fabricated data. A transfer
  // between two of the user's own accounts nets to zero, as it should.
  let running = 0
  return transactions.map((t) => {
    const amount = Number(t.amount)
    const destinationIsMine = t.destinationAccountId ? accountIds.includes(t.destinationAccountId) : false
    const sourceIsMine = t.sourceAccountId ? accountIds.includes(t.sourceAccountId) : false
    const isIncoming = destinationIsMine && !sourceIsMine
    const isOutgoing = t.sourceAccountId ? accountIds.includes(t.sourceAccountId) : false
    if (isIncoming) running += amount
    if (isOutgoing) running -= amount
    return { date: t.completedAt?.toISOString() ?? t.createdAt.toISOString(), balance: running }
  })
}


export type SpendingLimitData = {
  budget: number
  spent: number
  remaining: number
  currency: string
  periodStart: string
  periodEnd: string
}

export async function getSpendingLimitForUser(userId: string): Promise<SpendingLimitData> {
  const account = await prisma.account.findFirst({
    where: { userId, isActive: true, card: { isNot: null } },
    include: { card: true },
    orderBy: { createdAt: "asc" },
  })

  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  periodEnd.setHours(23, 59, 59, 999)

  if (!account?.card) {
    return {
      budget: 0,
      spent: 0,
      remaining: 0,
      currency: "USD",
      periodStart: periodStart.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
      periodEnd: periodEnd.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
    }
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      sourceAccountId: account.id,
      status: "COMPLETED",
      type: { not: "TRANSFER_INTERNAL" },
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    select: { amount: true },
  })

  const budget = Number(account.card.spendLimit)
  const spent = transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0)

  return {
    budget,
    spent,
    remaining: Math.max(0, budget - spent),
    currency: "USD",
    periodStart: periodStart.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
    periodEnd: periodEnd.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
  }
}

export type MoneyMovementPoint = {
  label: string
  moneyIn: number
  moneyOut: number
}

export type MoneyMovementData = {
  "7d": MoneyMovementPoint[]
  "30d": MoneyMovementPoint[]
  "90d": MoneyMovementPoint[]
}

export async function getMoneyMovementForUser(userId: string): Promise<MoneyMovementData> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true },
  })
  const accountIds = accounts.map((a) => a.id)

  if (accountIds.length === 0) {
    return { "7d": [], "30d": [], "90d": [] }
  }

  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - 89)

  const transactions = await prisma.transaction.findMany({
    where: {
      status: "COMPLETED",
      createdAt: { gte: start },
      OR: [
        { sourceAccountId: { in: accountIds } },
        { destinationAccountId: { in: accountIds } },
      ],
    },
    select: {
      amount: true,
      sourceAccountId: true,
      destinationAccountId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  })

  const accountIdSet = new Set(accountIds)
  const movement = transactions.map((transaction) => {
    const incoming = transaction.destinationAccountId
      ? accountIdSet.has(transaction.destinationAccountId)
      : false
    const outgoing = transaction.sourceAccountId
      ? accountIdSet.has(transaction.sourceAccountId)
      : false

    return {
      date: transaction.createdAt,
      moneyIn: incoming && !outgoing ? Number(transaction.amount) : 0,
      moneyOut: outgoing && !incoming ? Number(transaction.amount) : 0,
    }
  })

  const sevenDays: MoneyMovementPoint[] = []
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now)
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - i)
    const next = new Date(date)
    next.setDate(next.getDate() + 1)
    const totals = movement.reduce(
      (result, item) => {
        if (item.date >= date && item.date < next) {
          result.moneyIn += item.moneyIn
          result.moneyOut += item.moneyOut
        }
        return result
      },
      { moneyIn: 0, moneyOut: 0 }
    )
    sevenDays.push({
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      moneyIn: totals.moneyIn,
      moneyOut: totals.moneyOut,
    })
  }

  const thirtyDays: MoneyMovementPoint[] = []
  for (let i = 3; i >= 0; i -= 1) {
    const end = new Date(now)
    end.setHours(0, 0, 0, 0)
    end.setDate(end.getDate() - i * 7)
    const begin = new Date(end)
    begin.setDate(begin.getDate() - 7)
    const totals = movement.reduce(
      (result, item) => {
        if (item.date >= begin && item.date < end) {
          result.moneyIn += item.moneyIn
          result.moneyOut += item.moneyOut
        }
        return result
      },
      { moneyIn: 0, moneyOut: 0 }
    )
    thirtyDays.push({
      label: `Week ${4 - i}`,
      moneyIn: totals.moneyIn,
      moneyOut: totals.moneyOut,
    })
  }

  const ninetyDays: MoneyMovementPoint[] = []
  for (let i = 2; i >= 0; i -= 1) {
    const end = new Date(now)
    end.setHours(0, 0, 0, 0)
    end.setDate(1)
    end.setMonth(end.getMonth() - i + 1)
    const begin = new Date(end)
    begin.setMonth(begin.getMonth() - 1)
    const totals = movement.reduce(
      (result, item) => {
        if (item.date >= begin && item.date < end) {
          result.moneyIn += item.moneyIn
          result.moneyOut += item.moneyOut
        }
        return result
      },
      { moneyIn: 0, moneyOut: 0 }
    )
    ninetyDays.push({
      label: begin.toLocaleDateString("en-US", { month: "short" }),
      moneyIn: totals.moneyIn,
      moneyOut: totals.moneyOut,
    })
  }

  return { "7d": sevenDays, "30d": thirtyDays, "90d": ninetyDays }
}


export type HealthFactor = {
  id: string
  label: string
  score: number
  maxScore: number
  status: "excellent" | "good" | "fair" | "poor"
  description: string
}

export type FinancialHealthData = {
  overall: number
  trend: "up" | "down"
  trendDelta: number
  factors: HealthFactor[]
}

function getHealthStatus(score: number): HealthFactor["status"] {
  if (score >= 80) return "excellent"
  if (score >= 60) return "good"
  if (score >= 40) return "fair"
  return "poor"
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export async function getFinancialHealthForUser(userId: string): Promise<FinancialHealthData> {
  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true },
    select: { id: true, type: true, balance: true, card: { select: { spendLimit: true } } },
  })
  const accountIds = accounts.map((account) => account.id)

  if (accountIds.length === 0) {
    const emptyFactors = [
      { id: "hf1", label: "Savings Rate", score: 0, maxScore: 100, status: "poor" as const, description: "No active account data is available yet." },
      { id: "hf2", label: "Spending Habits", score: 0, maxScore: 100, status: "poor" as const, description: "No spending data is available yet." },
      { id: "hf3", label: "Cash Reserve", score: 0, maxScore: 100, status: "poor" as const, description: "No active account balance is available yet." },
      { id: "hf4", label: "Cash Flow", score: 0, maxScore: 100, status: "poor" as const, description: "No cash-flow history is available yet." },
      { id: "hf5", label: "Account Stability", score: 0, maxScore: 100, status: "poor" as const, description: "No transaction history is available yet." },
      { id: "hf6", label: "Bill Payments", score: 0, maxScore: 100, status: "poor" as const, description: "No bill-payment history is available yet." },
    ]
    return { overall: 0, trend: "down", trendDelta: 0, factors: emptyFactors }
  }

  const now = new Date()
  const currentStart = new Date(now)
  currentStart.setHours(0, 0, 0, 0)
  currentStart.setDate(currentStart.getDate() - 89)
  const previousStart = new Date(currentStart)
  previousStart.setDate(previousStart.getDate() - 90)

  const transactions = await prisma.transaction.findMany({
    where: {
      status: { in: ["COMPLETED", "FAILED", "REVERSED"] },
      OR: [
        { sourceAccountId: { in: accountIds } },
        { destinationAccountId: { in: accountIds } },
      ],
      createdAt: { gte: previousStart },
    },
    select: {
      type: true,
      status: true,
      amount: true,
      sourceAccountId: true,
      destinationAccountId: true,
      createdAt: true,
    },
  })

  const accountIdSet = new Set(accountIds)
  const completed = transactions.filter((transaction) => transaction.status === "COMPLETED")
  const movement = completed.map((transaction) => {
    const incoming = transaction.destinationAccountId ? accountIdSet.has(transaction.destinationAccountId) : false
    const outgoing = transaction.sourceAccountId ? accountIdSet.has(transaction.sourceAccountId) : false
    return {
      ...transaction,
      amount: Number(transaction.amount),
      incoming: incoming && !outgoing,
      outgoing: outgoing && !incoming,
    }
  })

  const currentTransactions = movement.filter((transaction) => transaction.createdAt >= currentStart)
  const previousTransactions = movement.filter((transaction) => transaction.createdAt >= previousStart && transaction.createdAt < currentStart)

  const sum = (items: typeof movement, key: "incoming" | "outgoing") =>
    items.reduce((total, item) => total + (item[key] ? item.amount : 0), 0)

  const currentIn = sum(currentTransactions, "incoming")
  const currentOut = sum(currentTransactions, "outgoing")
  const previousIn = sum(previousTransactions, "incoming")
  const previousOut = sum(previousTransactions, "outgoing")

  const savingsRate = currentIn > 0 ? clampScore(((currentIn - currentOut) / currentIn) * 100) : 0
  const spendingRatio = currentIn > 0 ? currentOut / currentIn : 1
  const spendingScore = clampScore((1 - Math.min(spendingRatio, 1.25) / 1.25) * 100)

  const monthlyOutflow = currentOut / 3
  const savingsBalance = accounts
    .filter((account) => account.type === "SAVINGS")
    .reduce((total, account) => total + Number(account.balance), 0)
  const reserveMonths = monthlyOutflow > 0 ? savingsBalance / monthlyOutflow : savingsBalance > 0 ? 6 : 0
  const reserveScore = clampScore((Math.min(reserveMonths, 6) / 6) * 100)

  const currentNet = currentIn - currentOut
  const cashFlowScore = clampScore(currentNet > 0 ? 70 + Math.min((currentNet / Math.max(currentIn, 1)) * 30, 30) : 35)

  const attempted = transactions.filter((transaction) => transaction.status !== "COMPLETED").length + completed.length
  const successful = completed.length
  const stabilityScore = attempted > 0 ? clampScore((successful / attempted) * 100) : 50

  const billPayments = completed.filter((transaction) => transaction.type === "BILL_PAYMENT").length
  const failedBillPayments = transactions.filter(
    (transaction) => transaction.type === "BILL_PAYMENT" && transaction.status !== "COMPLETED"
  ).length
  const billScore = billPayments + failedBillPayments > 0
    ? clampScore((billPayments / (billPayments + failedBillPayments)) * 100)
    : 50

  const factors: HealthFactor[] = [
    {
      id: "hf1",
      label: "Savings Rate",
      score: savingsRate,
      maxScore: 100,
      status: getHealthStatus(savingsRate),
      description: currentIn > 0
        ? `You kept ${savingsRate}% of money received after recorded outgoing transactions over the last 90 days.`
        : "There is not enough incoming transaction data to calculate a savings rate yet.",
    },
    {
      id: "hf2",
      label: "Spending Habits",
      score: spendingScore,
      maxScore: 100,
      status: getHealthStatus(spendingScore),
      description: currentIn > 0
        ? `Recorded outgoing transactions used ${Math.round(spendingRatio * 100)}% of money received over the last 90 days.`
        : "There is not enough incoming transaction data to assess spending habits yet.",
    },
    {
      id: "hf3",
      label: "Cash Reserve",
      score: reserveScore,
      maxScore: 100,
      status: getHealthStatus(reserveScore),
      description: monthlyOutflow > 0
        ? `Your savings balance currently covers about ${reserveMonths.toFixed(1)} months of your recent average recorded outflow.`
        : "Recent recorded outflow is too low to estimate reserve coverage.",
    },
    {
      id: "hf4",
      label: "Cash Flow",
      score: cashFlowScore,
      maxScore: 100,
      status: getHealthStatus(cashFlowScore),
      description: currentNet >= 0
        ? `Recorded money in exceeded money out by ${currentNet.toFixed(2)} over the last 90 days.`
        : `Recorded money out exceeded money in by ${Math.abs(currentNet).toFixed(2)} over the last 90 days.`,
    },
    {
      id: "hf5",
      label: "Account Stability",
      score: stabilityScore,
      maxScore: 100,
      status: getHealthStatus(stabilityScore),
      description: attempted > 0
        ? `${successful} of ${attempted} recorded transactions completed successfully.`
        : "There is no transaction history to assess yet.",
    },
    {
      id: "hf6",
      label: "Bill Payments",
      score: billScore,
      maxScore: 100,
      status: getHealthStatus(billScore),
      description: billPayments + failedBillPayments > 0
        ? `${billPayments} of ${billPayments + failedBillPayments} recorded bill-payment attempts completed successfully.`
        : "There is no bill-payment history to assess yet.",
    },
  ]

  const overall = Math.round(factors.reduce((total, factor) => total + factor.score, 0) / factors.length)
  const previousSavingsRate = previousIn > 0 ? clampScore(((previousIn - previousOut) / previousIn) * 100) : savingsRate
  const previousSpendingScore = previousIn > 0
    ? clampScore((1 - Math.min(previousOut / previousIn, 1.25) / 1.25) * 100)
    : spendingScore
  const previousScore = Math.round((previousSavingsRate + previousSpendingScore) / 2)
  const trendDelta = Math.abs(overall - previousScore)

  return {
    overall,
    trend: overall >= previousScore ? "up" : "down",
    trendDelta,
    factors,
  }
}

export type TransferRow = {
  id: string
  direction: "sent" | "received"
  amount: number
  status: string
  counterpartyLabel: string
  note: string | null
  createdAt: string
}

export async function getTransfersForUser(userId: string, limit = 50): Promise<TransferRow[]> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true, nickname: true, type: true },
  })
  const accountIds = accounts.map((a) => a.id)
  const nicknameById = new Map(
    accounts.map((a) => [a.id, a.nickname || (a.type === "CHECKING" ? "Checking" : "Savings")])
  )
  if (accountIds.length === 0) return []

  const transfers = await prisma.transaction.findMany({
    where: {
      type: { in: ["TRANSFER_INTERNAL", "TRANSFER_P2P", "TRANSFER_EXTERNAL"] },
      OR: [
        { sourceAccountId: { in: accountIds } },
        { destinationAccountId: { in: accountIds } },
      ],
    },
    include: {
      sourceAccount: { select: { id: true, nickname: true, type: true, user: { select: { firstName: true, lastName: true } } } },
      destinationAccount: { select: { id: true, nickname: true, type: true, user: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return transfers.map((t) => {
    const sentByMe = t.sourceAccountId ? accountIds.includes(t.sourceAccountId) : false
    const direction: "sent" | "received" = sentByMe ? "sent" : "received"

    const otherAccount = sentByMe ? t.destinationAccount : t.sourceAccount
    const isOwnAccount = otherAccount?.id ? accountIds.includes(otherAccount.id) : false

    let counterpartyLabel = t.counterpartyName ?? "External bank"
    if (otherAccount) {
      counterpartyLabel = isOwnAccount
        ? nicknameById.get(otherAccount.id) ?? "Your account"
        : `${otherAccount.user.firstName} ${otherAccount.user.lastName}`
    }

    return {
      id: t.id,
      direction,
      amount: Number(t.amount),
      status: t.status,
      counterpartyLabel,
      note: t.description,
      createdAt: t.createdAt.toISOString(),
    }
  })
}

export async function getAllTransactionsForUser(userId: string): Promise<TransactionRow[]> {
  return getRecentTransactionsForUser(userId, 500)
}

export type PayeeRow = {
  id: string
  name: string
  accountRef: string
  amount: number
  frequency: string
  isActive: boolean
  sourceAccountId: string
  sourceAccountNickname: string
}

export async function getPayeesForUser(userId: string): Promise<PayeeRow[]> {
  const payees = await prisma.payee.findMany({
    where: { userId },
    include: { sourceAccount: { select: { nickname: true, type: true } } },
    orderBy: { createdAt: "desc" },
  })

  return payees.map((p) => ({
    id: p.id,
    name: p.name,
    accountRef: p.accountRef,
    amount: Number(p.amount),
    frequency: p.frequency,
    isActive: p.isActive,
    sourceAccountId: p.sourceAccountId,
    sourceAccountNickname: p.sourceAccount.nickname || (p.sourceAccount.type === "CHECKING" ? "Checking" : "Savings"),
  }))
}

export type NotificationRow = {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

export async function getNotificationsForUser(userId: string): Promise<NotificationRow[]> {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }))
}

export type LoginActivityRow = {
  id: string
  device: string
  ipAddress: string | null
  success: boolean
  createdAt: string
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return "Unknown device"
  const isMobile = /Mobile|Android|iPhone/i.test(ua)
  let browser = "Browser"
  if (ua.includes("Edg/")) browser = "Edge"
  else if (ua.includes("Chrome/")) browser = "Chrome"
  else if (ua.includes("Firefox/")) browser = "Firefox"
  else if (ua.includes("Safari/")) browser = "Safari"
  const os = ua.includes("Windows")
    ? "Windows"
    : ua.includes("Mac OS")
      ? "macOS"
      : ua.includes("Android")
        ? "Android"
        : ua.includes("iPhone") || ua.includes("iPad")
          ? "iOS"
          : ua.includes("Linux")
            ? "Linux"
            : ""
  return `${browser}${os ? ` on ${os}` : ""}${isMobile ? " (mobile)" : ""}`
}

export async function getLoginActivityForUser(userId: string, limit = 10): Promise<LoginActivityRow[]> {
  const activity = await prisma.loginActivity.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return activity.map((a) => ({
    id: a.id,
    device: parseUserAgent(a.userAgent),
    ipAddress: a.ipAddress,
    success: a.success,
    createdAt: a.createdAt.toISOString(),
  }))
}

export type StaffUserRow = {
  id: string
  name: string
  email: string
  role: string
  kycStatus: string
  kycLevel: number
  createdAt: string
  accounts: { id: string; label: string; accountNumber: string; balance: number; isActive: boolean }[]
}

export async function getUsersForStaff(): Promise<StaffUserRow[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { accounts: { select: { id: true, nickname: true, type: true, accountNumber: true, balance: true, isActive: true } } },
  })

  return users.map((u) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    role: u.role,
    kycStatus: u.kycStatus,
    kycLevel: u.kycLevel,
    createdAt: u.createdAt.toISOString(),
    accounts: u.accounts.map((a) => ({
      id: a.id,
      label: a.nickname || (a.type === "CHECKING" ? "Checking" : "Savings"),
      accountNumber: a.accountNumber,
      balance: Number(a.balance),
      isActive: a.isActive,
    })),
  }))
}

export type StaffTransactionRow = {
  id: string
  type: string
  status: string
  amount: number
  description: string | null
  fromLabel: string
  toLabel: string
  createdAt: string
}

export async function getRecentTransactionsForStaff(limit = 50): Promise<StaffTransactionRow[]> {
  const transactions = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sourceAccount: { select: { nickname: true, type: true, user: { select: { firstName: true, lastName: true } } } },
      destinationAccount: { select: { nickname: true, type: true, user: { select: { firstName: true, lastName: true } } } },
    },
  })

  const label = (acc: (typeof transactions)[number]["sourceAccount"]) =>
    acc ? `${acc.user.firstName} ${acc.user.lastName} (${acc.nickname || acc.type})` : "External"

  return transactions.map((t) => ({
    id: t.id,
    type: t.type,
    status: t.status,
    amount: Number(t.amount),
    description: t.description,
    fromLabel: t.sourceAccount ? label(t.sourceAccount) : "—",
    toLabel: t.destinationAccount ? label(t.destinationAccount) : (t.counterpartyName ?? "—"),
    createdAt: t.createdAt.toISOString(),
  }))
}

export type DashboardSummary = {
  totalBalance: number
  checkingBalance: number
  savingsBalance: number
  accountCount: number
}

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { type: true, balance: true },
  })

  const checkingBalance = accounts
    .filter((a) => a.type === "CHECKING")
    .reduce((sum, a) => sum + Number(a.balance), 0)
  const savingsBalance = accounts
    .filter((a) => a.type === "SAVINGS")
    .reduce((sum, a) => sum + Number(a.balance), 0)

  return {
    totalBalance: checkingBalance + savingsBalance,
    checkingBalance,
    savingsBalance,
    accountCount: accounts.length,
  }
}

export type BudgetTransaction = {
  amount: number
  category: string | null
  sourceAccountId: string | null
  destinationAccountId: string | null
  createdAt: string
}

export async function getBudgetTransactionsForUser(userId: string): Promise<BudgetTransaction[]> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true },
  })
  const accountIds = accounts.map((account) => account.id)
  if (accountIds.length === 0) return []

  const transactions = await prisma.transaction.findMany({
    where: {
      status: "COMPLETED",
      type: { not: "TRANSFER_INTERNAL" },
      sourceAccountId: { in: accountIds },
      createdAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
      },
    },
    select: {
      amount: true,
      category: true,
      sourceAccountId: true,
      destinationAccountId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  })

  return transactions.map((transaction) => ({
    amount: Number(transaction.amount),
    category: transaction.category,
    sourceAccountId: transaction.sourceAccountId,
    destinationAccountId: transaction.destinationAccountId,
    createdAt: transaction.createdAt.toISOString(),
  }))
}


export type AnalyticsCategory = {
  category: string
  amount: number
  color: string
  subcategories: { name: string; amount: number }[]
}

export type AnalyticsMonthComparison = {
  category: string
  thisMonth: number
  lastMonth: number
}

export type AnalyticsHeatmapDay = { date: string; amount: number }

export type AnalyticsRecurringCharge = {
  id: string
  merchant: string
  amount: number
  frequency: "monthly" | "yearly"
  nextDate: string
  category: string
}

const ANALYTICS_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

function getDateRangeStart(months: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setMonth(date.getMonth() - months)
  return date
}

export async function getAnalyticsDataForUser(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true },
  })
  const accountIds = accounts.map((account) => account.id)

  if (accountIds.length === 0) {
    return {
      categories: [] as AnalyticsCategory[],
      monthComparison: [] as AnalyticsMonthComparison[],
      heatmap: [] as AnalyticsHeatmapDay[],
      recurring: [] as AnalyticsRecurringCharge[],
    }
  }

  const now = new Date()
  const start = getDateRangeStart(12)
  const transactions = await prisma.transaction.findMany({
    where: {
      status: "COMPLETED",
      createdAt: { gte: start },
      sourceAccountId: { in: accountIds },
    },
    select: {
      id: true,
      amount: true,
      category: true,
      description: true,
      counterpartyName: true,
      createdAt: true,
      type: true,
    },
    orderBy: { createdAt: "asc" },
  })

  const spending = transactions.filter((transaction) => transaction.type !== "TRANSFER_INTERNAL")
  const categoryTotals = new Map<string, number>()
  const subcategoryTotals = new Map<string, Map<string, number>>()

  for (const transaction of spending) {
    const category = transaction.category?.trim() || "Other"
    const amount = Number(transaction.amount)
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + amount)

    const subcategory = transaction.counterpartyName?.trim() || transaction.description?.trim() || "Other"
    const subcategories = subcategoryTotals.get(category) ?? new Map<string, number>()
    subcategories.set(subcategory, (subcategories.get(subcategory) ?? 0) + amount)
    subcategoryTotals.set(category, subcategories)
  }

  const categories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount], index) => ({
      category,
      amount,
      color: ANALYTICS_COLORS[index % ANALYTICS_COLORS.length],
      subcategories: Array.from(subcategoryTotals.get(category)?.entries() ?? [])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, subAmount]) => ({ name, amount: subAmount })),
    }))

  const monthStarts: Date[] = []
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  monthStarts.push(currentMonthStart)
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const currentMonth = spending.filter((transaction) => transaction.createdAt >= currentMonthStart)
  const previousMonth = spending.filter(
    (transaction) => transaction.createdAt >= previousMonthStart && transaction.createdAt < currentMonthStart
  )

  const monthCategories = new Set<string>()
  currentMonth.forEach((transaction) => monthCategories.add(transaction.category?.trim() || "Other"))
  previousMonth.forEach((transaction) => monthCategories.add(transaction.category?.trim() || "Other"))

  const monthComparison = Array.from(monthCategories)
    .map((category) => ({
      category,
      thisMonth: currentMonth
        .filter((transaction) => (transaction.category?.trim() || "Other") === category)
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
      lastMonth: previousMonth
        .filter((transaction) => (transaction.category?.trim() || "Other") === category)
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
    }))
    .filter((row) => row.thisMonth > 0 || row.lastMonth > 0)
    .sort((a, b) => Math.max(b.thisMonth, b.lastMonth) - Math.max(a.thisMonth, a.lastMonth))

  const heatmapStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const dailyTotals = new Map<string, number>()
  for (const transaction of spending) {
    if (transaction.createdAt < heatmapStart) continue
    const key = transaction.createdAt.toISOString().slice(0, 10)
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + Number(transaction.amount))
  }

  const heatmap: AnalyticsHeatmapDay[] = []
  for (const cursor = new Date(heatmapStart); cursor <= now; cursor.setDate(cursor.getDate() + 1)) {
    const key = cursor.toISOString().slice(0, 10)
    heatmap.push({ date: key, amount: dailyTotals.get(key) ?? 0 })
  }

  const grouped = new Map<string, {
    merchant: string
    amounts: number[]
    dates: Date[]
    category: string
  }>()

  for (const transaction of spending) {
    const merchant = transaction.counterpartyName?.trim() || transaction.description?.trim()
    if (!merchant) continue
    const key = merchant.toLowerCase()
    const existing = grouped.get(key) ?? { merchant, amounts: [], dates: [], category: transaction.category?.trim() || "Other" }
    existing.amounts.push(Number(transaction.amount))
    existing.dates.push(transaction.createdAt)
    grouped.set(key, existing)
  }

  const recurring = Array.from(grouped.values())
    .filter((entry) => entry.dates.length >= 2)
    .map((entry, index) => {
      const sortedDates = [...entry.dates].sort((a, b) => a.getTime() - b.getTime())
      const intervals = sortedDates.slice(1).map((date, i) => date.getTime() - sortedDates[i].getTime())
      const averageInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length
      const monthly = averageInterval >= 24 * 24 * 60 * 60 * 1000 && averageInterval <= 45 * 24 * 60 * 60 * 1000
      const yearly = averageInterval >= 300 * 24 * 60 * 60 * 1000 && averageInterval <= 430 * 24 * 60 * 60 * 1000
      if (!monthly && !yearly) return null

      const nextDate = new Date(sortedDates[sortedDates.length - 1])
      nextDate.setDate(nextDate.getDate() + Math.round(averageInterval / (24 * 60 * 60 * 1000)))
      const averageAmount = entry.amounts.reduce((sum, amount) => sum + amount, 0) / entry.amounts.length

      return {
        id: `${entry.merchant}-${index}`,
        merchant: entry.merchant,
        amount: averageAmount,
        frequency: monthly ? "monthly" as const : "yearly" as const,
        nextDate: nextDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        category: entry.category,
      }
    })
    .filter((entry): entry is AnalyticsRecurringCharge => entry !== null)
    .sort((a, b) => b.amount - a.amount)

  return { categories, monthComparison, heatmap, recurring }
}
