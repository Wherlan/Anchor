"use client"

import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  ArrowLeftRightIcon,
  ReceiptTextIcon,
  CircleAlertIcon,
  ChevronRightIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { TransactionRow } from "@/lib/data"
import { EmptyState } from "@/components/empty-state"

const typeIcon: Record<string, React.ElementType> = {
  DEPOSIT: ArrowDownToLineIcon,
  WITHDRAWAL: ArrowUpFromLineIcon,
  TRANSFER_INTERNAL: ArrowLeftRightIcon,
  TRANSFER_P2P: ArrowLeftRightIcon,
  TRANSFER_EXTERNAL: ArrowLeftRightIcon,
  BILL_PAYMENT: ReceiptTextIcon,
  FEE: CircleAlertIcon,
}

const typeLabel: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  TRANSFER_INTERNAL: "Transfer",
  TRANSFER_P2P: "Transfer",
  TRANSFER_EXTERNAL: "External transfer",
  BILL_PAYMENT: "Bill payment",
  FEE: "Fee",
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

export function RecentTransactions({ transactions }: { transactions: TransactionRow[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          nativeButton={false}
          render={<Link href="/transactions" />}
        >
          See All
          <ChevronRightIcon className="size-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <EmptyState
            variant="transactions"
            title="No transactions yet"
            description="Once you make a transfer or payment, it'll show up here."
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[560px] space-y-1">
              <div className="grid grid-cols-[1fr_100px_120px_32px] gap-4 border-b pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span>Description</span>
                <span className="text-right">Amount</span>
                <span className="hidden md:inline">Date</span>
                <span />
              </div>

              {transactions.map((tx) => {
                const Icon = typeIcon[tx.type] ?? ArrowLeftRightIcon
                const isIncoming = tx.direction === "in"
                return (
                  <div
                    key={tx.id}
                    className="group grid grid-cols-[1fr_100px_120px_32px] items-center gap-4 rounded-lg py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {tx.description || typeLabel[tx.type] || tx.type}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px] font-medium">
                            {tx.category || typeLabel[tx.type]}
                          </Badge>
                          {tx.accountNickname && (
                            <span className="truncate text-[11px] text-muted-foreground">
                              {tx.accountNickname}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "text-right text-sm font-semibold tabular-nums",
                        isIncoming ? "text-[#3F6B4E]" : "text-foreground"
                      )}
                    >
                      {isIncoming ? "+" : "-"}$
                      {tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>

                    <span className="hidden text-xs text-muted-foreground md:inline">
                      {fmtDate(tx.createdAt)}
                    </span>

                    <span
                      className={cn(
                        "size-2 justify-self-end rounded-full",
                        tx.status === "COMPLETED" && "bg-[#3F6B4E]",
                        tx.status === "PENDING" && "bg-accent",
                        tx.status === "FAILED" && "bg-destructive"
                      )}
                      title={tx.status}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
