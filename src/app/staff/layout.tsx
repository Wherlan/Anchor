import { redirect } from "next/navigation"
import { auth } from "@/auth"

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user?.id) redirect("/staff-login")
  if (role !== "STAFF") redirect("/dashboard")

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <span className="font-mono text-sm font-semibold tracking-wide">ANCHOR / INTERNAL</span>
        <span className="ml-3 rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">Staff Tools</span>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
