"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { signIn } from "next-auth/react"
import {
  LandmarkIcon,
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  CheckIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
}

export default function SignInPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null)
  const [resetStatus, setResetStatus] = useState<string | null>(null)

  // Reads the ?verify= query param set by the email verification redirect.
  // Must run in an effect since window.location isn't available during SSR.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get("verify")
    const reset = params.get("reset")
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (status) setVerifyStatus(status)
    if (reset) setResetStatus(reset)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await signIn("credentials", { email, password, redirect: false })

      if (result?.ok && !result.error) {
        setIsSuccess(true)
        router.push("/dashboard")
      } else {
        const message =
          result?.code === "rate_limited"
            ? "Too many sign-in attempts. Please try again later."
            : "Email or password is incorrect. If you haven't registered, sign up first."
        setError(message)
      }
    } catch {
      setError("Couldn't reach the server. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh">
      {/* Left panel - vault ledger */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary lg:flex">
        {/* Ledger hairlines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent, transparent 63px, #B08D57 63px, #B08D57 64px)",
          }}
        />

        {/* Logo */}
        <Link href="/dashboard" className="relative z-20 flex items-center gap-2.5 p-8">
          <div className="flex size-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <LandmarkIcon className="size-4" />
          </div>
          <span className="font-display text-sm font-semibold tracking-wide text-primary-foreground">
            Anchor
          </span>
        </Link>

        <div className="relative z-20 flex flex-1 items-center px-12">
          <h2 className="max-w-sm font-display text-4xl font-medium leading-[1.15] text-primary-foreground">
            Built on trust, run with discipline.
          </h2>
        </div>

      </div>

      {/* Right panel - Form */}
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <motion.div
          className="w-full max-w-sm"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo (mobile) */}
          <motion.div
            className="mb-8 flex flex-col items-center lg:hidden"
            variants={itemVariants}
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <LandmarkIcon className="size-5" />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.div className="text-center" variants={itemVariants}>
            <h1 className="font-display text-2xl font-medium tracking-tight">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to your Anchor account
            </p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <motion.div variants={itemVariants}>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium"
              >
                Email
              </label>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <MailIcon className="size-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </InputGroup>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Forgot password?
                </Link>
              </div>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <LockIcon className="size-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="size-3.5 text-muted-foreground" />
                    ) : (
                      <EyeIcon className="size-3.5 text-muted-foreground" />
                    )}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </motion.div>

            {resetStatus === "success" && (
              <motion.p
                variants={itemVariants}
                className="rounded-md bg-[#3F6B4E]/10 px-3 py-2 text-sm text-[#3F6B4E]"
              >
                Password reset successfully. You can sign in with your new password.
              </motion.p>
            )}
            {verifyStatus === "success" && (
              <motion.p
                variants={itemVariants}
                className="rounded-md bg-[#3F6B4E]/10 px-3 py-2 text-sm text-[#3F6B4E]"
              >
                Email verified. You can sign in now.
              </motion.p>
            )}
            {verifyStatus === "invalid-or-expired" && (
              <motion.p
                variants={itemVariants}
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                That verification link is invalid or has expired.
              </motion.p>
            )}

            {error && (
              <motion.p
                variants={itemVariants}
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </motion.p>
            )}

            <motion.div variants={itemVariants} className="pt-1">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isLoading || isSuccess}
              >
                {isSuccess ? (
                  <>
                    <CheckIcon className="size-4" />
                    <span>Success!</span>
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign in</span>
                )}
              </Button>
            </motion.div>
          </form>

          {/* Footer */}
          <motion.p
            className="mt-6 text-center text-sm text-muted-foreground"
            variants={itemVariants}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/sign-up"
              className="font-medium text-foreground underline-offset-4 transition-colors hover:underline"
            >
              Sign up
            </Link>
          </motion.p>

          {/* Secured badge */}
          <motion.div
            className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60"
            variants={itemVariants}
          >
            <ShieldCheckIcon className="size-3.5" />
            <span>256-bit SSL encrypted</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
