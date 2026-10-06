"use client"

import { useState } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "motion/react"
import { SnowflakeIcon, WifiIcon } from "lucide-react"
import type { AccountWithCard } from "@/lib/data"

type CardInfo = NonNullable<AccountWithCard["card"]>

interface InteractiveCardProps {
  card: CardInfo
  accountNickname: string
  holderName: string
  frozen: boolean
}

export function InteractiveCard({ card, accountNickname, holderName, frozen }: InteractiveCardProps) {
  const [flipped, setFlipped] = useState(false)
  const expiry = `${String(card.expiryMonth).padStart(2, "0")}/${String(card.expiryYear).slice(-2)}`

  return (
    <div
      className="aspect-[1.586/1] w-full cursor-pointer sm:max-w-[400px]"
      style={{ perspective: "1000px" }}
      onClick={() => setFlipped((f) => !f)}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* ── Front Face ── */}
        <div
          className="absolute inset-0 flex flex-col justify-between rounded-2xl bg-primary p-5 text-primary-foreground"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex items-start justify-between">
            <span className="font-display text-sm font-medium">{accountNickname}</span>
            <Image
              src={card.network === "VISA" ? "/logos/visa-com.svg" : "/logos/mastercard-com.svg"}
              alt={card.network}
              width={48}
              height={32}
              className="h-8 w-auto object-contain"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="h-8 w-11 rounded-md bg-gradient-to-br from-[#D4B788] to-accent opacity-90" />
            <WifiIcon className="size-5 rotate-90 opacity-60" />
          </div>

          <p className="font-mono text-base tracking-widest tabular-nums">
            **** **** **** {card.last4}
          </p>

          <div className="flex items-end justify-between">
            <span className="text-xs font-medium uppercase tracking-wide">{holderName}</span>
            <span className="text-xs tabular-nums">{expiry}</span>
          </div>
        </div>

        {/* ── Back Face ── */}
        <div
          className="absolute inset-0 flex flex-col rounded-2xl bg-[#14284A] text-primary-foreground"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="mt-6 h-10 w-full bg-foreground/80" />
          <div className="flex flex-1 flex-col justify-between p-5 pt-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary-foreground/60">Network</p>
              <p className="text-sm font-medium">{card.network === "VISA" ? "Visa" : "Mastercard"} Debit</p>
            </div>
            <p className="text-xs text-primary-foreground/60">
              Lost or stolen? Freeze this card instantly from the controls panel.
            </p>
          </div>
        </div>

        {/* ── Freeze Overlay ── */}
        <AnimatePresence>
          {frozen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/70 backdrop-blur-sm"
            >
              <SnowflakeIcon className="size-8 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Card Frozen</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
