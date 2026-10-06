"use client"

import { useEffect, useState } from "react"
import { ShieldCheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type TransactionPinDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAuthorize: (pin: string) => Promise<string | null>
}

export function TransactionPinDialog({ open, onOpenChange, onAuthorize }: TransactionPinDialogProps) {
  const [hasPin, setHasPin] = useState<boolean | null>(null)
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasPin(null)
    setPin("")
    setConfirmPin("")
    setError(null)
    setIsLoading(true)

    fetch("/api/settings/transaction-pin")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error ?? "Couldn't check your transaction PIN.")
        if (active) setHasPin(Boolean(data.hasPin))
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Couldn't check your transaction PIN.")
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [open])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!/^\d{4}$/.test(pin)) {
      setError("Enter a 4-digit PIN.")
      return
    }
    if (!hasPin && pin !== confirmPin) {
      setError("The PINs don't match.")
      return
    }

    setIsSubmitting(true)
    try {
      if (!hasPin) {
        const response = await fetch("/api/settings/transaction-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error ?? "Couldn't set your transaction PIN.")
        setHasPin(true)
        setConfirmPin("")
      }

      const authorizationError = await onAuthorize(pin)
      if (authorizationError) {
        setError(authorizationError)
        return
      }

      setPin("")
      setConfirmPin("")
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't confirm this transaction.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-md bg-accent/20 text-accent-foreground">
            <ShieldCheckIcon className="size-5" />
          </div>
          <DialogTitle>{hasPin ? "Confirm transaction" : "Create transaction PIN"}</DialogTitle>
          <DialogDescription>
            {hasPin
              ? "Enter your 4-digit PIN to authorize this transaction."
              : "Set a 4-digit PIN to protect your transfers and bill payments."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Checking PIN settings...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="transaction-pin" className="text-sm font-medium">
                {hasPin ? "Transaction PIN" : "Create 4-digit PIN"}
              </label>
              <Input
                id="transaction-pin"
                type="password"
                inputMode="numeric"
                autoComplete={hasPin ? "current-password" : "new-password"}
                pattern="[0-9]{4}"
                maxLength={4}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {!hasPin && (
              <div className="space-y-1.5">
                <label htmlFor="confirm-transaction-pin" className="text-sm font-medium">
                  Confirm 4-digit PIN
                </label>
                <Input
                  id="confirm-transaction-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  disabled={isSubmitting}
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoading || hasPin === null}>
                {isSubmitting ? "Processing..." : hasPin ? "Confirm" : "Set PIN and continue"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}