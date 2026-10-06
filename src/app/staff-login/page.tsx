"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"

export default function StaffLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await signIn("credentials", { email, password, redirect: false })
      if (result?.ok && !result.error) {
        router.push("/staff")
      } else {
        const message =
          result?.code === "rate_limited"
            ? "Too many sign-in attempts. Please try again later."
            : "Email or password is incorrect."
        setError(message)
      }
    } catch {
      setError("Couldn't reach the server. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4 rounded border border-zinc-800 p-6 font-mono text-sm">
        <div>
          <p className="font-semibold tracking-wide">ANCHOR / INTERNAL</p>
          <p className="text-xs text-zinc-500">Staff access only</p>
        </div>
        <input
          type="email"
          placeholder="Staff email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
          required
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-amber-500 py-2 font-semibold text-zinc-950 disabled:opacity-40"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  )
}
