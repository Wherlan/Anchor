"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  SendIcon,
  LoaderCircleIcon,
  CheckCircle2Icon,
  ReceiptTextIcon,
  ArrowRightIcon,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import type { AccountWithCard } from "@/lib/data"
import { newIdempotencyKey } from "@/lib/idempotency-client"
import { TransactionPinDialog } from "@/components/transactions/transaction-pin-dialog"

type SendState = "idle" | "sending" | "success"

export function QuickTransfer({ accounts }: { accounts: AccountWithCard[] }) {
  const router = useRouter()
  const active = accounts.filter((a) => a.isActive)
  const [fromId, setFromId] = useState(active[0]?.id ?? "")
  const [toId, setToId] = useState(active[1]?.id ?? "")
  const [amount, setAmount] = useState("")
  const [sendState, setSendState] = useState<SendState>("idle")
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Same key for retries of one attempt; replaced once the server answers definitively.
  const idempotencyKey = useRef(newIdempotencyKey())

  const fromAccount = active.find((a) => a.id === fromId)
  const toAccount = active.find((a) => a.id === toId)
  const parsedAmount = parseFloat(amount)

  const canSend =
    fromId &&
    toId &&
    fromId !== toId &&
    !Number.isNaN(parsedAmount) &&
    parsedAmount >= 0.01 &&
    (fromAccount ? parsedAmount <= fromAccount.balance : false)

  const resetForm = () => {
    setSendState("idle")
    setAmount("")
    setReceiptId(null)
  }

  const handleSend = async (transactionPin: string): Promise<string | null> => {
    if (!canSend || sendState !== "idle") return "Check the transfer details and try again."
    setSendState("sending")
    setError(null)

    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromAccountId: fromId, toAccountId: toId, amount: parsedAmount, idempotencyKey: idempotencyKey.current, transactionPin }),
      })
      const data = await res.json().catch(() => ({}))
      idempotencyKey.current = newIdempotencyKey()
      if (!res.ok) {
        setSendState("idle")
        return data.error ?? "Transfer failed."
      }
      setReceiptId(data.transactionId)
      setSendState("success")
      router.refresh()
      return null
    } catch {
      setSendState("idle")
      return "Couldn't reach the server."
    }
  }

  const requestSend = () => {
    if (!canSend || sendState !== "idle") return
    setError(null)
    setPinDialogOpen(true)
  }

  if (active.length < 2) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Quick Transfer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Open a second account to move money between your own accounts here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Quick Transfer</CardTitle>
        <p className="text-xs text-muted-foreground">Between your own accounts</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence mode="wait">
          {sendState === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-2 py-6"
            >
              <CheckCircle2Icon className="size-10 text-[#3F6B4E]" />
              <p className="text-sm font-semibold">
                ${parsedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} moved
              </p>
              <div className="mt-3 flex items-center gap-2">
                <a
                  href={`/api/transactions/${receiptId}/receipt`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  <ReceiptTextIcon className="size-3.5" /> Download receipt
                </a>
                <Button variant="outline" size="sm" onClick={resetForm}>Done</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {fromAccount?.nickname} → {toAccount?.nickname}
              </p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="flex items-center gap-2">
                <Select value={fromId} onValueChange={(v) => v && setFromId(v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="From" />
                  </SelectTrigger>
                  <SelectContent>
                    {active.map((a) => (
                      <SelectItem key={a.id} value={a.id} disabled={a.id === toId}>
                        {a.nickname} (${a.balance.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
                <Select value={toId} onValueChange={(v) => v && setToId(v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="To" />
                  </SelectTrigger>
                  <SelectContent>
                    {active.map((a) => (
                      <SelectItem key={a.id} value={a.id} disabled={a.id === fromId}>
                        {a.nickname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs text-muted-foreground">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={sendState === "sending"}
                      className="h-10 pl-7 text-lg font-semibold tabular-nums"
                    />
                  </div>
                </div>
                <Button
                  className="h-10 gap-2 px-6"
                  disabled={!canSend || sendState === "sending"}
                  onClick={requestSend}
                >
                  {sendState === "sending" ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : (
                    <SendIcon className="size-4" />
                  )}
                  {sendState === "sending" ? "Sending..." : "Move"}
                </Button>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </motion.div>
          )}
        </AnimatePresence>
        <TransactionPinDialog
          open={pinDialogOpen}
          onOpenChange={setPinDialogOpen}
          onAuthorize={handleSend}
        />
      </CardContent>
    </Card>
  )
}
