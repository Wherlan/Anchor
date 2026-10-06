// ---------------------------------------------------------------------------
// Seed data – realistic fintech dashboard mock data
// ---------------------------------------------------------------------------

// Avatar URLs (local)
const avatar = (id: number) => `/avatars/${id}.jpg`

// ── Contacts (Quick Transfer) ──────────────────────────────────────────────
export const contacts = [
  { id: "1", name: "Sarah Chen", avatar: avatar(1) },
  { id: "2", name: "Marcus Johnson", avatar: avatar(3) },
  { id: "3", name: "Elena Rodriguez", avatar: avatar(5) },
  { id: "4", name: "James Wilson", avatar: avatar(8) },
  { id: "5", name: "Aisha Patel", avatar: avatar(9) },
  { id: "6", name: "David Kim", avatar: avatar(11) },
  { id: "7", name: "Olivia Brown", avatar: avatar(16) },
  { id: "8", name: "Liam Murphy", avatar: avatar(12) },
]

// ── Logo helper ────────────────────────────────────────────────────────────
export const logo = (domain: string) =>
  `/logos/${domain.replace(/\./g, "-")}.png`

// ── Recent Transactions ────────────────────────────────────────────────────
export type Transaction = {
  id: string
  merchant: string
  transactionId: string
  amount: number
  date: string
  logo: string
  category: string
}

export const recentTransactions: Transaction[] = [
  {
    id: "1",
    merchant: "Spotify",
    transactionId: "INV_920076",
    amount: -9.99,
    date: "Apr 10, 2026",
    logo: logo("spotify.com"),
    category: "Entertainment",
  },
  {
    id: "2",
    merchant: "AWS Cloud Services",
    transactionId: "INV_918263",
    amount: -120.0,
    date: "Apr 09, 2026",
    logo: "/logos/aws-amazon-com.svg",
    category: "Technology",
  },
  {
    id: "3",
    merchant: "Stripe Payout",
    transactionId: "TXN_847291",
    amount: 4250.0,
    date: "Apr 08, 2026",
    logo: logo("stripe.com"),
    category: "Income",
  },
  {
    id: "4",
    merchant: "Figma Pro",
    transactionId: "INV_773920",
    amount: -15.0,
    date: "Apr 07, 2026",
    logo: logo("figma.com"),
    category: "Design",
  },
  {
    id: "5",
    merchant: "ChatGPT Plus",
    transactionId: "INV_920077",
    amount: -20.0,
    date: "Apr 06, 2026",
    logo: logo("openai.com"),
    category: "AI Tools",
  },
  {
    id: "6",
    merchant: "Google Workspace",
    transactionId: "INV_661204",
    amount: -12.0,
    date: "Apr 05, 2026",
    logo: logo("google.com"),
    category: "Productivity",
  },
  {
    id: "7",
    merchant: "Client Payment",
    transactionId: "TXN_559831",
    amount: 8500.0,
    date: "Apr 04, 2026",
    logo: logo("paypal.com"),
    category: "Income",
  },
]


// ══════════════════════════════════════════════════════════════════════════════
// WIDGET DATA: Financial Health Score
// ══════════════════════════════════════════════════════════════════════════════

export type HealthFactor = {
  id: string
  label: string
  score: number
  maxScore: number
  status: "excellent" | "good" | "fair" | "poor"
  description: string
}

