"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ReceiptTextIcon, LoaderIcon, TrashIcon, CheckIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"
import type { PayeeRow } from "@/lib/data"
import { newIdempotencyKey } from "@/lib/idempotency-client"
import { TransactionPinDialog } from "@/components/transactions/transaction-pin-dialog"

const frequencyLabel: Record<string, string> = {
  ONCE: "One time",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n)

export function PayeeList({ payees }: { payees: PayeeRow[] }) {
  const router = useRouter()
  const [payingId, setPayingId] = useState<string | null>(null)
  const [paidId, setPaidId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pendingPayeeId, setPendingPayeeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // One key per in-flight payment. Kept across network failures (so a retry can't
  // double-pay) and discarded once the server gives a definitive answer.
  const payKeys = useRef<Record<string, string>>({})

  async function handlePay(transactionPin: string): Promise<string | null> {
    const payeeId = pendingPayeeId
    if (!payeeId) return "Choose a payee and try again."
    setPayingId(payeeId)
    const idempotencyKey = (payKeys.current[payeeId] ??= newIdempotencyKey())
    try {
      const res = await fetch("/api/payees/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payeeId, idempotencyKey, transactionPin }),
      })
      const data = await res.json().catch(() => ({}))
      delete payKeys.current[payeeId]
      if (!res.ok) {
        setPayingId(null)
        return data.error ?? "Payment failed."
      }
      setPaidId(payeeId)
      setTimeout(() => {
        setPaidId(null)
        setPayingId(null)
        router.refresh()
      }, 1200)
      return null
    } catch {
      setPayingId(null)
      return "Couldn't reach the server."
    }
  }

  async function handleDelete(payeeId: string) {
    setDeletingId(payeeId)
    setError(null)
    try {
      const res = await fetch(`/api/payees/${payeeId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Couldn't remove this payee.")
        return
      }
      router.refresh()
    } catch {
      setError("Couldn't reach the server.")
    } finally {
      setDeletingId(null)
    }
  }

  if (payees.length === 0) {
    return (
      <EmptyState
        variant="generic"
        title="No payees yet"
        description="Add a payee to start paying bills from your account."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-xs text-destructive">{error}</p>}
      {payees.map((payee) => (
        <Card key={payee.id} className="ring-1 ring-foreground/10">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ReceiptTextIcon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{payee.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px]">{frequencyLabel[payee.frequency]}</Badge>
                <span className="text-[11px] text-muted-foreground">from {payee.sourceAccountNickname}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="tabular-nums text-sm font-semibold">{fmt(payee.amount)}</p>
            </div>
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => {
                setPendingPayeeId(payee.id)
                setPinDialogOpen(true)
              }}
              disabled={payingId === payee.id}
            >
              {paidId === payee.id ? (
                <CheckIcon className="size-4" />
              ) : payingId === payee.id ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                "Pay now"
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(payee.id)}
              disabled={deletingId === payee.id}
            >
              <TrashIcon className="size-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
      <TransactionPinDialog
        open={pinDialogOpen}
        onOpenChange={(open) => {
          setPinDialogOpen(open)
          if (!open) setPendingPayeeId(null)
        }}
        onAuthorize={handlePay}
      />
    </div>
  )
}
