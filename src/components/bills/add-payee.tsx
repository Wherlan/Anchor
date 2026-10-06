"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon, CheckIcon, LoaderIcon } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import type { AccountWithCard } from "@/lib/data"

type Step = "idle" | "form" | "loading" | "success"

const frequencies = [
  { value: "ONCE", label: "One time" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
] as const

export function AddPayee({ accounts }: { accounts: AccountWithCard[] }) {
  const router = useRouter()
  const active = accounts.filter((a) => a.isActive)
  const [step, setStep] = useState<Step>("idle")
  const [name, setName] = useState("")
  const [accountRef, setAccountRef] = useState("")
  const [amount, setAmount] = useState("")
  const [sourceAccountId, setSourceAccountId] = useState(active[0]?.id ?? "")
  const [frequency, setFrequency] = useState<string>("MONTHLY")
  const [error, setError] = useState<string | null>(null)

  const parsedAmount = parseFloat(amount)
  const canSubmit = name && accountRef && sourceAccountId && !Number.isNaN(parsedAmount) && parsedAmount > 0

  async function handleCreate() {
    if (!canSubmit) return
    setStep("loading")
    setError(null)

    try {
      const res = await fetch("/api/payees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          accountRef,
          sourceAccountId,
          amount: parsedAmount,
          frequency,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Couldn't add payee.")
        setStep("form")
        return
      }
      setStep("success")
      setTimeout(() => {
        setStep("idle")
        setName("")
        setAccountRef("")
        setAmount("")
        router.refresh()
      }, 1200)
    } catch {
      setError("Couldn't reach the server.")
      setStep("form")
    }
  }

  return (
    <AnimatePresence mode="wait">
      {step === "idle" ? (
        <motion.button
          key="idle"
          onClick={() => setStep("form")}
          className="flex min-h-[140px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-foreground/15 text-muted-foreground transition-colors hover:border-accent hover:text-accent"
        >
          <PlusIcon className="size-5" />
          <span className="text-sm font-medium">Add a payee</span>
        </motion.button>
      ) : (
        <motion.div key="form" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
          <Card className="ring-1 ring-foreground/10">
            <CardContent className="flex flex-col gap-3 p-4">
              {step === "success" ? (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-[#3F6B4E]">
                  <CheckIcon className="size-6" />
                  <span className="text-sm font-medium">Payee added</span>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold">Add a payee</p>
                  <Input placeholder="Payee name (e.g. City Electric)" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
                  <Input placeholder="Account or reference number" value={accountRef} onChange={(e) => setAccountRef(e.target.value)} maxLength={60} />
                  <Select value={sourceAccountId} onValueChange={(v) => v && setSourceAccountId(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pay from" />
                    </SelectTrigger>
                    <SelectContent>
                      {active.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nickname} (${a.balance.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Amount"
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={frequency} onValueChange={(v) => v && setFrequency(v)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {frequencies.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setStep("idle"); setError(null) }} disabled={step === "loading"}>
                      Cancel
                    </Button>
                    <Button size="sm" className="flex-1" onClick={handleCreate} disabled={!canSubmit || step === "loading"}>
                      {step === "loading" ? <LoaderIcon className="size-4 animate-spin" /> : "Add payee"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
