"use client"

import { AnimatePresence, motion } from "motion/react"
import { EmptyState } from "@/components/empty-state"
import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  ArrowLeftRightIcon,
  ReceiptTextIcon,
  CircleAlertIcon,
  InfoIcon,
  WalletIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { TransactionRow } from "@/lib/data"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface TransactionTableProps {
  transactions: TransactionRow[]
  selectedIds: Set<string>
  setSelectedIds: (ids: Set<string>) => void
  expandedId: string | null
  setExpandedId: (id: string | null) => void
}

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

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })

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
      return <Badge variant="destructive">Failed</Badge>
    case "REVERSED":
      return <Badge variant="outline">Reversed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function TransactionTable({
  transactions,
  selectedIds,
  setSelectedIds,
  expandedId,
  setExpandedId,
}: TransactionTableProps) {
  const allSelected =
    transactions.length > 0 && transactions.every((t) => selectedIds.has(t.id))
  const someSelected =
    transactions.some((t) => selectedIds.has(t.id)) && !allSelected

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(transactions.map((t) => t.id)))
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                  onChange={toggleAll}
                  className="size-4 cursor-pointer rounded accent-primary"
                />
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="hidden sm:table-cell">Account</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="hidden lg:table-cell">Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState variant="transactions" className="py-12" />
                </TableCell>
              </TableRow>
            )}

            {transactions.map((tx) => {
              const isExpanded = expandedId === tx.id
              return (
                <TransactionTableRow
                  key={tx.id}
                  tx={tx}
                  isSelected={selectedIds.has(tx.id)}
                  isExpanded={isExpanded}
                  onToggleSelect={() => toggleOne(tx.id)}
                  onToggleExpand={() => setExpandedId(isExpanded ? null : tx.id)}
                />
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function TransactionTableRow({
  tx,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
}: {
  tx: TransactionRow
  isSelected: boolean
  isExpanded: boolean
  onToggleSelect: () => void
  onToggleExpand: () => void
}) {
  const Icon = typeIcon[tx.type] ?? WalletIcon
  const isIncoming = tx.direction === "in"

  return (
    <>
      <TableRow
        className={cn("group cursor-pointer", isSelected && "bg-muted/50", isExpanded && "border-b-0")}
        onClick={onToggleExpand}
      >
        <TableCell className="pl-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="size-4 cursor-pointer rounded accent-primary"
          />
        </TableCell>

        <TableCell>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{tx.description || typeLabel[tx.type] || tx.type}</p>
              <Badge variant="secondary" className="mt-0.5 text-[10px]">
                {tx.category || typeLabel[tx.type]}
              </Badge>
            </div>
          </div>
        </TableCell>

        <TableCell className="hidden sm:table-cell">
          <span className="text-xs text-muted-foreground">{tx.accountNickname ?? "—"}</span>
        </TableCell>

        <TableCell className="text-right">
          <span className={cn("tabular-nums text-sm font-semibold", isIncoming ? "text-[#3F6B4E]" : "text-foreground")}>
            {isIncoming ? "+" : "-"}
            {fmt(tx.amount)}
          </span>
        </TableCell>

        <TableCell className="hidden md:table-cell">
          <span className="text-sm text-muted-foreground">{fmtDate(tx.createdAt)}</span>
        </TableCell>

        <TableCell className="hidden lg:table-cell">{statusBadge(tx.status)}</TableCell>
      </TableRow>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <tr>
            <td colSpan={6} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-4 border-b bg-muted/30 px-4 py-3 pl-12 text-sm">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
                    <span>{fmtDateTime(tx.createdAt)}</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <WalletIcon className="mt-0.5 size-3.5 shrink-0" />
                    <span>{tx.accountNickname ?? "Unknown account"}</span>
                  </div>
                  <a
                    href={`/api/transactions/${tx.id}/receipt`}
                    onClick={(e) => e.stopPropagation()}
                    className="ml-auto flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
                  >
                    <ReceiptTextIcon className="size-3.5" />
                    Download receipt
                  </a>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}
