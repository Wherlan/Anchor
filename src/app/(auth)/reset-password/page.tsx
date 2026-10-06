"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { motion } from "motion/react"
import { LandmarkIcon, LockIcon, EyeIcon, EyeOffIcon, Loader2Icon, CheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from "@/components/ui/input-group"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token") || ""
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError("That password reset link is invalid or has expired.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Unable to reset your password. Please try again.")
        return
      }

      setIsSuccess(true)
      setTimeout(() => router.push("/sign-in?reset=success"), 900)
    } catch {
      setError("Unable to reset your password. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6 py-12">
      <motion.div className="w-full max-w-sm" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/sign-in" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <LandmarkIcon className="size-5" />
          </div>
        </Link>

        <div className="text-center">
          <h1 className="font-display text-2xl font-medium tracking-tight">Create a new password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Choose a new password for your Anchor account.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">New password</label>
            <InputGroup>
              <InputGroupAddon align="inline-start"><LockIcon className="size-4 text-muted-foreground" /></InputGroupAddon>
              <InputGroupInput
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton type="button" size="icon-xs" variant="ghost" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOffIcon className="size-3.5 text-muted-foreground" /> : <EyeIcon className="size-3.5 text-muted-foreground" />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium">Confirm password</label>
            <InputGroup>
              <InputGroupAddon align="inline-start"><LockIcon className="size-4 text-muted-foreground" /></InputGroupAddon>
              <InputGroupInput
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repeat your password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton type="button" size="icon-xs" variant="ghost" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                  {showConfirmPassword ? <EyeOffIcon className="size-3.5 text-muted-foreground" /> : <EyeIcon className="size-3.5 text-muted-foreground" />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>

          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={isLoading || isSuccess}>
            {isSuccess ? <><CheckIcon className="size-4" /> Password updated</> : isLoading ? <><Loader2Icon className="size-4 animate-spin" /> Resetting...</> : "Reset password"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remember your password? <Link href="/sign-in" className="font-medium text-foreground hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}

// useSearchParams() must sit under a Suspense boundary or `next build` fails to prerender this page.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}
