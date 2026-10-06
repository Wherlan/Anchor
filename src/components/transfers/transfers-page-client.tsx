"use client"

import { useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import { TransferStats } from "@/components/transfers/transfer-stats"
import { TransferList } from "@/components/transfers/transfer-list"
import { QuickSend } from "@/components/transfers/quick-send"
import type { AccountWithCard, TransferRow } from "@/lib/data"

type TabKey = "all" | "sent" | "received"

const tabs: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sent", label: "Sent" },
  { key: "received", label: "Received" },
]

export function TransfersPageClient({
  accounts,
  transfers,
}: {
  accounts: AccountWithCard[]
  transfers: TransferRow[]
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("all")

  const filtered = useMemo(() => {
    if (activeTab === "all") return transfers
    return transfers.filter((t) => t.direction === activeTab)
  }, [activeTab, transfers])

  return (
    <div className="flex flex-col gap-4">
      <TransferStats transfers={transfers} />

      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <TransferList transfers={filtered} />

      <QuickSend accounts={accounts} />
    </div>
  )
}
