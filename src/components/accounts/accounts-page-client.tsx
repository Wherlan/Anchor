"use client"

import { useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import type { AccountWithCard } from "@/lib/data"
import { AccountSummary } from "@/components/accounts/account-summary"
import { AccountCard } from "@/components/accounts/account-grid"
import { AddAccount } from "@/components/accounts/add-account"
import { EmptyState } from "@/components/empty-state"

const filterTabs = [
  { value: "all", label: "All" },
  { value: "CHECKING", label: "Checking" },
  { value: "SAVINGS", label: "Savings" },
] as const

type FilterValue = (typeof filterTabs)[number]["value"]

export function AccountsPageClient({ initialAccounts }: { initialAccounts: AccountWithCard[] }) {
  const [selectedType, setSelectedType] = useState<FilterValue>("all")

  const filtered = useMemo(
    () =>
      selectedType === "all"
        ? initialAccounts
        : initialAccounts.filter((a) => a.type === selectedType),
    [initialAccounts, selectedType]
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Summary row */}
      <AccountSummary accounts={initialAccounts} />

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSelectedType(tab.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              selectedType === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Account grid + add card */}
      {filtered.length === 0 ? (
        <EmptyState
          variant="filter"
          title="No accounts in this category"
          description="You don't have any accounts of this type yet. Try a different filter or open a new account."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((account, i) => (
            <AccountCard key={account.id} account={account} index={i} />
          ))}
          <AddAccount />
        </div>
      )}
    </div>
  )
}
