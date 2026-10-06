"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { InteractiveCard } from "@/components/cards/interactive-card"
import { CardControls } from "@/components/cards/card-controls"
import { CardList } from "@/components/cards/card-list"
import { EmptyState } from "@/components/empty-state"
import type { AccountWithCard } from "@/lib/data"

export function CardsPageClient({
  accounts,
  holderName,
}: {
  accounts: AccountWithCard[]
  holderName: string
}) {
  const router = useRouter()
  const withCards = accounts.filter((a) => a.card)
  const [activeAccountId, setActiveAccountId] = useState(withCards[0]?.id ?? "")

  const activeAccount = withCards.find((a) => a.id === activeAccountId) ?? withCards[0]

  const [freezeError, setFreezeError] = useState<string | null>(null)

  async function handleToggleFreeze() {
    if (!activeAccount?.card) return
    setFreezeError(null)
    try {
      const res = await fetch("/api/cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: activeAccount.card.id,
          frozen: !activeAccount.card.frozen,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFreezeError(data.error ?? "Couldn't update the card.")
        return
      }
      router.refresh()
    } catch {
      setFreezeError("Couldn't reach the server.")
    }
  }

  if (withCards.length === 0) {
    return (
      <EmptyState
        variant="cards"
        title="No cards yet"
        description="Cards are issued automatically when you open a checking account."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex items-start justify-center lg:col-span-7">
          {activeAccount?.card && (
            <InteractiveCard
              card={activeAccount.card}
              accountNickname={activeAccount.nickname ?? "Checking"}
              holderName={holderName}
              frozen={activeAccount.card.frozen}
            />
          )}
        </div>
        <div className="lg:col-span-5">
          {activeAccount?.card && (
            <CardControls
              cardId={activeAccount.card.id}
              card={activeAccount.card}
              frozen={activeAccount.card.frozen}
              onToggleFreeze={handleToggleFreeze}
            />
          )}
          {freezeError && <p className="mt-2 text-xs text-destructive">{freezeError}</p>}
        </div>
      </div>

      {withCards.length > 1 && (
        <CardList accounts={accounts} activeAccountId={activeAccountId} onSelect={setActiveAccountId} />
      )}
    </div>
  )
}
