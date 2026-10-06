"use client"

import { AnimatePresence, motion } from "motion/react"
import { ArrowUpRightIcon, ArrowDownLeftIcon } from "lucide-react"
import { EmptyState } from "@/components/empty-state"

import { cn } from "@/lib/utils"
import type { TransferRow } from "@/lib/data"
import { Badge } from "@/components/ui/badge"

interface TransferListProps {
  transfers: TransferRow[]
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

function statusBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return <Badge variant="default">Completed</Badge>
    case "PENDING":
      return (
        <Badge variant="outline" className="text-amber-500 dark:text-amber-400">
          Pending
        </Badge>
      )
    case "FAILED":
      return <Badge variant="outline" className="text-destructive">Failed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function TransferList({ transfers }: TransferListProps) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="divide-y">
        <AnimatePresence mode="popLayout" initial={false}>
          {transfers.length === 0 && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState
                variant="transfers"
                title="No transfers yet"
                description="Send money between your accounts or to another Anchor user to see it here."
                className="py-10"
              />
            </motion.div>
          )}

          {transfers.map((transfer, i) => {
            const Icon = transfer.direction === "sent" ? ArrowUpRightIcon : ArrowDownLeftIcon
            return (
              <motion.div
                key={transfer.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: i * 0.03, layout: { duration: 0.2 } }}
                className="group flex items-center gap-3 px-4 py-3"
              >
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    transfer.direction === "sent" ? "bg-rose-500/10 text-rose-500" : "bg-[#3F6B4E]/10 text-[#3F6B4E]"
                  )}
                >
                  <Icon className="size-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {transfer.direction === "sent" ? "To " : "From "}
                    {transfer.counterpartyLabel}
                  </p>
                  {transfer.note && (
                    <p className="truncate text-xs italic text-muted-foreground">{transfer.note}</p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "tabular-nums text-sm font-semibold",
                      transfer.direction === "sent" ? "text-rose-500" : "text-[#3F6B4E]"
                    )}
                  >
                    {transfer.direction === "sent" ? "-" : "+"}
                    {fmt(transfer.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{fmtDate(transfer.createdAt)}</p>
                </div>

                <div className="hidden shrink-0 sm:block">{statusBadge(transfer.status)}</div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
