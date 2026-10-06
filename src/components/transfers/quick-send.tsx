"use client"

import { useState, useEffect, useRef } from "react"
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
import { SendIcon, LoaderCircleIcon, CheckCircle2Icon,
  ReceiptTextIcon, UserCheckIcon, CircleAlertIcon } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import type { AccountWithCard } from "@/lib/data"
import { newIdempotencyKey } from "@/lib/idempotency-client"
import { TransactionPinDialog } from "@/components/transactions/transaction-pin-dialog"

type SendState = "idle" | "sending" | "success"
type LookupState = "idle" | "checking" | "found" | "not-found"
type TransferMode = "anchor" | "external"

const externalBanks = [
  "Access Bank",
  "First Bank",
  "GTBank",
  "UBA",
  "Zenith Bank",
  "Fidelity Bank",
  "FCMB",
  "Union Bank",
  "Stanbic IBTC",
  "Sterling Bank",
  "Wema Bank",
  "Kuda Bank",
  "OPay",
  "PalmPay",
]

export function QuickSend({ accounts }: { accounts: AccountWithCard[] }) {
  const router = useRouter()
  const active = accounts.filter((a) => a.isActive)
  const [fromId, setFromId] = useState(active[0]?.id ?? "")
  const [transferMode, setTransferMode] = useState<TransferMode>("anchor")
  const [bankName, setBankName] = useState("")
  const [externalRecipientName, setExternalRecipientName] = useState("")
  const [toAccountNumber, setToAccountNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [sendState, setSendState] = useState<SendState>("idle")
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lookupState, setLookupState] = useState<LookupState>("idle")
  const [recipientName, setRecipientName] = useState<string | null>(null)
  // Same key for retries of one attempt; replaced once the server answers definitively.
  const idempotencyKey = useRef(newIdempotencyKey())

  // Debounced "name enquiry" — confirms who you're sending to before you can
  // send, the same way real bank transfer forms work.
  useEffect(() => {
    if (transferMode !== "anchor") return
    const num = toAccountNumber.trim()
    if (num.length !== 10) return
    // Starting the "checking" state here is correct: it marks the moment
    // this debounced lookup begins, which can't be derived from render-time
    // values alone (unlike the idle/reset case above).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLookupState("checking")
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/accounts/lookup?accountNumber=${encodeURIComponent(num)}`)
        const data = await res.json()
        if (res.ok) {
          setRecipientName(data.name)
          setLookupState("found")
        } else {
          setRecipientName(null)
          setLookupState("not-found")
        }
      } catch {
        setRecipientName(null)
        setLookupState("not-found")
      }
    }, 500)
    return () => clearTimeout(handle)
  }, [toAccountNumber, transferMode])

  const effectiveLookupState: LookupState = toAccountNumber.trim().length !== 10 ? "idle" : lookupState

  const fromAccount = active.find((a) => a.id === fromId)
  const recipientForExternal = externalRecipientName.trim()
  const parsedAmount = parseFloat(amount)
  const canSend =
    fromId &&
    (transferMode === "anchor"
      ? effectiveLookupState === "found"
      : bankName !== "" && toAccountNumber.trim().length === 10 && recipientForExternal.length >= 2) &&
    !Number.isNaN(parsedAmount) &&
    parsedAmount >= 0.01 &&
    (fromAccount ? parsedAmount <= fromAccount.balance : false)

  const resetForm = () => {
    setSendState("idle")
    setAmount("")
    setNote("")
    setToAccountNumber("")
    setBankName("")
    setExternalRecipientName("")
    setLookupState("idle")
    setRecipientName(null)
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
        body: JSON.stringify({
          fromAccountId: fromId,
          transferType: transferMode,
          toAccountNumber: toAccountNumber.trim(),
          bankName: transferMode === "external" ? bankName : undefined,
          recipientName: transferMode === "external" ? recipientForExternal : undefined,
          amount: parsedAmount,
          description: note || undefined,
          idempotencyKey: idempotencyKey.current,
          transactionPin,
        }),
      })
      const data = await res.json().catch(() => ({}))
      idempotencyKey.current = newIdempotencyKey()
      if (!res.ok) {
        setSendState("idle")
        return data.error ?? "Transfer failed."
      }
      setRecipientName(data.recipientName ?? recipientName)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Send Money</CardTitle>
        <p className="text-xs text-muted-foreground">
          Send money to another Anchor account or simulate a transfer to another bank
        </p>
      </CardHeader>
      <CardContent>
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
                ${parsedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} sent
              </p>
              {recipientName && <p className="text-xs text-muted-foreground">to {recipientName}</p>}
              <div className="mt-3 flex items-center gap-2">
                <a
                  href={`/api/transactions/${receiptId}/receipt`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  <ReceiptTextIcon className="size-3.5" /> Download receipt
                </a>
                <Button variant="outline" size="sm" onClick={resetForm}>Done</Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">From</label>
                <Select value={fromId} onValueChange={(v) => v && setFromId(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {active.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nickname} (${a.balance.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => { setTransferMode("anchor"); setBankName(""); setExternalRecipientName("") }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${transferMode === "anchor" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                >
                  Anchor account
                </button>
                <button
                  type="button"
                  onClick={() => { setTransferMode("external"); setLookupState("idle"); setRecipientName(null) }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${transferMode === "external" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                >
                  Other bank
                </button>
              </div>

              {transferMode === "external" && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Bank</label>
                  <Select value={bankName} onValueChange={(v) => v && setBankName(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {externalBanks.map((bank) => (
                        <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Recipient account number</label>
                <Input
                  value={toAccountNumber}
                  onChange={(e) => setToAccountNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="10-digit account number"
                  maxLength={10}
                  disabled={sendState === "sending"}
                />
                {transferMode === "anchor" && effectiveLookupState === "checking" && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <LoaderCircleIcon className="size-3 animate-spin" /> Looking up account…
                  </p>
                )}
                {transferMode === "anchor" && effectiveLookupState === "found" && recipientName && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-[#3F6B4E]">
                    <UserCheckIcon className="size-3.5" /> {recipientName} · Anchor
                  </p>
                )}
                {transferMode === "anchor" && effectiveLookupState === "not-found" && (
                  <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <CircleAlertIcon className="size-3.5" /> No Anchor account found with that number.
                  </p>
                )}
              </div>

              {transferMode === "external" && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Recipient full name</label>
                  <Input
                    value={externalRecipientName}
                    onChange={(e) => setExternalRecipientName(e.target.value)}
                    placeholder="Enter the account holder's full name"
                    maxLength={120}
                    disabled={sendState === "sending"}
                  />
                  <p className="text-[11px] text-muted-foreground">Name is entered manually because this transfer is simulated and does not perform an external bank name enquiry.</p>
                </div>
              )}

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
                  {sendState === "sending" ? "Sending..." : "Send"}
                </Button>
              </div>

              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note (optional)"
                disabled={sendState === "sending"}
              />

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
