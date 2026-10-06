import { WalletIcon, LandmarkIcon, PiggyBankIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { AccountWithCard } from "@/lib/data"

interface AccountSummaryProps {
  accounts: AccountWithCard[]
}

const fmt = (n: number) =>
  `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)}`

export function AccountSummary({ accounts }: AccountSummaryProps) {
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)
  const checkingBalance = accounts
    .filter((a) => a.type === "CHECKING")
    .reduce((sum, a) => sum + a.balance, 0)
  const savingsBalance = accounts
    .filter((a) => a.type === "SAVINGS")
    .reduce((sum, a) => sum + a.balance, 0)

  const cards = [
    {
      label: "Total Balance",
      value: fmt(totalBalance),
      icon: WalletIcon,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Checking",
      value: fmt(checkingBalance),
      icon: LandmarkIcon,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Savings",
      value: fmt(savingsBalance),
      icon: PiggyBankIcon,
      color: "text-[#3F6B4E]",
      bg: "bg-[#3F6B4E]/10",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10"
        >
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full",
              card.bg
            )}
          >
            <card.icon className={cn("size-4", card.color)} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="tabular-nums text-base font-semibold font-display tracking-tight">
              {card.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
