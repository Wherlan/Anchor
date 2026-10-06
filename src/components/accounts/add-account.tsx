"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon, CheckIcon, LoaderIcon } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

import { cn } from "@/lib/utils"
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

type Step = "idle" | "form" | "loading" | "success" | "error"

const accountTypes = [
  { value: "CHECKING", label: "Checking" },
  { value: "SAVINGS", label: "Savings" },
] as const

export function AddAccount() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("idle")
  const [type, setType] = useState<string>("")
  const [nickname, setNickname] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!type || !nickname) return
    setStep("loading")
    setError(null)

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, nickname }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Couldn't open the account.")
        setStep("form")
        return
      }
      setStep("success")
      setTimeout(() => {
        setStep("idle")
        setType("")
        setNickname("")
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
          className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-foreground/15 text-muted-foreground transition-colors hover:border-accent hover:text-accent"
        >
          <PlusIcon className="size-6" />
          <span className="text-sm font-medium">Open new account</span>
        </motion.button>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
        >
          <Card className="ring-1 ring-foreground/10">
            <CardContent className="flex flex-col gap-3 p-4">
              {step === "success" ? (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-[#3F6B4E]">
                  <CheckIcon className="size-6" />
                  <span className="text-sm font-medium">Account opened</span>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold">Open new account</p>
                  <Select value={type} onValueChange={(v) => setType(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Account type" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Nickname (e.g. Vacation Fund)"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={40}
                  />
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setStep("idle")
                        setError(null)
                      }}
                      disabled={step === "loading"}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className={cn("flex-1")}
                      onClick={handleCreate}
                      disabled={step === "loading" || !type || !nickname}
                    >
                      {step === "loading" ? (
                        <LoaderIcon className="size-4 animate-spin" />
                      ) : (
                        "Open account"
                      )}
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
