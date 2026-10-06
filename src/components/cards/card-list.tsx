"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import type { AccountWithCard } from "@/lib/data"

interface CardListProps {
  accounts: AccountWithCard[]
  activeAccountId: string
  onSelect: (accountId: string) => void
}

export function CardList({ accounts, activeAccountId, onSelect }: CardListProps) {
  const withCards = accounts.filter((a) => a.card)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {withCards.map((account) => {
        const card = account.card!
        const isActive = account.id === activeAccountId

        return (
          <button
            key={account.id}
            type="button"
            onClick={() => onSelect(account.id)}
            className={cn(
              "relative aspect-[1.586/1] w-full cursor-pointer overflow-hidden rounded-xl bg-primary p-3 text-left text-primary-foreground transition-all",
              isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              card.frozen && "opacity-50 grayscale"
            )}
          >
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium leading-tight">
                  {account.nickname}
                </span>
                <Image
                  src={card.network === "VISA" ? "/logos/visa-com.svg" : "/logos/mastercard-com.svg"}
                  alt={card.network}
                  width={32}
                  height={20}
                  className="h-5 w-auto object-contain"
                />
              </div>
              <div>
                <p className="font-mono text-[10px] tabular-nums opacity-80">**** {card.last4}</p>
                {card.frozen && (
                  <p className="mt-0.5 text-[10px] font-medium opacity-70">Frozen</p>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
