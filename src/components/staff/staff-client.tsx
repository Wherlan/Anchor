"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { StaffUserRow, StaffTransactionRow } from "@/lib/data"

export function StaffClient({
  users,
  transactions,
}: {
  users: StaffUserRow[]
  transactions: StaffTransactionRow[]
}) {
  const router = useRouter()
  const [accountId, setAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [kycDocuments, setKycDocuments] = useState<Array<{ id: string; level: number; type: string; fileName: string | null; mimeType: string | null; textValue: string | null; createdAt: string; user: { firstName: string; lastName: string; email: string } }>>([])
  const [kycBusy, setKycBusy] = useState<string | null>(null)
  const [adminForm, setAdminForm] = useState({ firstName: "", lastName: "", email: "", password: "" })
  const [adminBusy, setAdminBusy] = useState(false)
  const [adminMsg, setAdminMsg] = useState<string | null>(null)

  async function loadKycDocuments() {
    const res = await fetch("/api/staff/kyc", { cache: "no-store" })
    if (!res.ok) return
    const data = await res.json()
    setKycDocuments(data.documents ?? [])
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch("/api/staff/kyc", { cache: "no-store" })
      if (!res.ok || cancelled) return
      const data = await res.json()
      if (!cancelled) setKycDocuments(data.documents ?? [])
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function registerAdmin() {
    setAdminBusy(true)
    setAdminMsg(null)
    try {
      const res = await fetch("/api/staff/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adminForm),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAdminMsg(data.error ?? "Couldn't register the admin.")
        return
      }
      setAdminMsg(`Admin registered: ${data.admin?.email}. They can now sign in at /staff-login.`)
      setAdminForm({ firstName: "", lastName: "", email: "", password: "" })
      router.refresh()
    } catch {
      setAdminMsg("Couldn't reach the server.")
    } finally {
      setAdminBusy(false)
    }
  }

  async function viewKycText(id: string) {
    const res = await fetch(`/api/staff/kyc/${id}`, { cache: "no-store" })
    const data = await res.json()
    if (res.ok && data.textValue) window.alert(`Sensitive ID value: ${data.textValue}`)
    else if (!res.ok) setMsg(data.error ?? "Couldn't load ID data.")
  }

  async function reviewKyc(id: string, action: "approve" | "reject") {
    let reason = ""
    if (action === "reject") {
      reason = window.prompt("Reason for rejection (minimum 5 characters):", "")?.trim() ?? ""
      if (reason.length < 5) return
    }
    setKycBusy(id)
    const res = await fetch(`/api/staff/kyc/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    })
    const data = await res.json()
    setKycBusy(null)
    if (!res.ok) {
      setMsg(data.error ?? "KYC review failed.")
      return
    }
    setMsg(action === "approve" ? "KYC document approved." : "KYC document rejected.")
    await loadKycDocuments()
    router.refresh()
  }

  const allAccounts = users.flatMap((u) =>
    u.accounts.map((a) => ({ ...a, owner: u.name }))
  )

  async function submit() {
    setBusy(true)
    setMsg(null)
    const res = await fetch("/api/staff/adjust-balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, amount: parseFloat(amount), reason }),
    })
    const data = await res.json()
    setMsg(res.ok ? "Adjustment applied." : (data.error ?? "Failed."))
    setBusy(false)
    if (res.ok) {
      setAmount("")
      setReason("")
      router.refresh()
    }
  }

  return (
    <div className="space-y-8 font-mono text-xs">
      <div>
        <h1 className="text-lg font-semibold">Anchor Admin</h1>
        <p className="mt-1 text-zinc-500">Registered users, accounts, balances, and recent activity.</p>
      </div>
      {/* Balance adjustment — always creates a visible transaction, never a silent edit */}
      <section className="rounded border border-zinc-800 p-4">
        <h2 className="mb-3 text-sm font-semibold">Adjust Account Balance</h2>
        <p className="mb-3 text-zinc-500">
          Every adjustment creates a real transaction on the customer&apos;s own statement and notifies them. There is no way to change a balance silently.
        </p>
        <div className="flex flex-wrap gap-2">
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
          >
            <option value="">Select account…</option>
            {allAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.owner} — {a.label} (****{a.accountNumber.slice(-4)}) ${a.balance.toFixed(2)}
              </option>
            ))}
          </select>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (+/-)"
            className="w-32 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (required)"
            className="flex-1 min-w-[180px] rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
          />
          <button
            onClick={submit}
            disabled={busy || !accountId || !amount || reason.length < 5}
            className="rounded bg-amber-500 px-3 py-1.5 font-semibold text-zinc-950 disabled:opacity-40"
          >
            {busy ? "Applying…" : "Apply"}
          </button>
        </div>
        {msg && <p className="mt-2 text-zinc-400">{msg}</p>}
      </section>

      {/* Register a new admin — they get full access to this page once registered */}
      <section className="rounded border border-zinc-800 p-4">
        <h2 className="mb-2 text-sm font-semibold">Register New Admin</h2>
        <p className="mb-3 text-zinc-500">
          New admins can sign in at /staff-login immediately and have the same access as you. Share the temporary password securely and ask them to change it.
        </p>
        <div className="flex flex-wrap gap-2">
          <input value={adminForm.firstName} onChange={(e) => setAdminForm({ ...adminForm, firstName: e.target.value })} placeholder="First name" autoComplete="off" className="w-36 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5" />
          <input value={adminForm.lastName} onChange={(e) => setAdminForm({ ...adminForm, lastName: e.target.value })} placeholder="Last name" autoComplete="off" className="w-36 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5" />
          <input type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} placeholder="Email" autoComplete="off" className="min-w-[200px] flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5" />
          <input type="password" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} placeholder="Temporary password (12+ chars)" autoComplete="new-password" className="w-60 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5" />
          <button
            onClick={registerAdmin}
            disabled={adminBusy || !adminForm.firstName.trim() || !adminForm.lastName.trim() || !adminForm.email.trim() || adminForm.password.length < 12}
            className="rounded bg-amber-500 px-3 py-1.5 font-semibold text-zinc-950 disabled:opacity-40"
          >
            {adminBusy ? "Registering…" : "Register admin"}
          </button>
        </div>
        {adminMsg && <p className="mt-2 text-zinc-400">{adminMsg}</p>}
      </section>

      {/* KYC review */}
      <section className="rounded border border-zinc-800 p-4">
        <h2 className="mb-2 text-sm font-semibold">Pending KYC Verification ({kycDocuments.length})</h2>
        <p className="mb-3 text-zinc-500">Review submitted identity documents before a customer moves to the next KYC level.</p>
        {kycDocuments.length === 0 ? (
          <p className="text-zinc-600">No pending KYC submissions.</p>
        ) : (
          <div className="space-y-2">
            {kycDocuments.map((doc) => (
              <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-zinc-800 p-3">
                <div>
                  <p className="font-semibold">{doc.user.firstName} {doc.user.lastName} · KYC {doc.level}</p>
                  <p className="text-zinc-500">{doc.user.email} · {doc.type === "DRIVERS_LICENSE" ? "Driver's License" : doc.type === "SSN" ? "SSN" : "Tax ID"}</p>
                  <p className="text-zinc-600">Submitted {new Date(doc.createdAt).toLocaleString()}{doc.textValue ? ` · ${doc.textValue}` : doc.fileName ? ` · ${doc.fileName}` : ""}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {doc.fileName ? <a href={`/api/kyc/documents/${doc.id}`} target="_blank" rel="noreferrer" className="rounded border border-zinc-700 px-3 py-1.5">View ID</a> : <button onClick={() => viewKycText(doc.id)} className="rounded border border-zinc-700 px-3 py-1.5">View ID value</button>}
                  <button onClick={() => reviewKyc(doc.id, "reject")} disabled={kycBusy === doc.id} className="rounded border border-red-900 px-3 py-1.5 text-red-300 disabled:opacity-40">Reject</button>
                  <button onClick={() => reviewKyc(doc.id, "approve")} disabled={kycBusy === doc.id} className="rounded bg-emerald-500 px-3 py-1.5 font-semibold text-zinc-950 disabled:opacity-40">Approve</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Users */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">Users ({users.length})</h2>
        <div className="overflow-x-auto rounded border border-zinc-800">
          <table className="w-full text-left">
            <thead className="border-b border-zinc-800 text-zinc-500">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Email</th>
                <th className="p-2">Role</th>
                <th className="p-2">KYC</th>
                <th className="p-2">Accounts</th>
                <th className="p-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-900">
                  <td className="p-2">{u.name}</td>
                  <td className="p-2 text-zinc-400">{u.email}</td>
                  <td className="p-2">{u.role}</td>
                  <td className="p-2">{u.role === "STAFF" ? "Not required" : `KYC ${u.kycLevel}`}</td>
                  <td className="p-2 text-zinc-400">
                    <div className="space-y-1.5">
                      {u.accounts.length === 0 ? (
                        <span className="text-zinc-600">No accounts</span>
                      ) : (
                        u.accounts.map((a) => (
                          <div key={a.id}>
                            <span className="text-zinc-200">{a.label}</span> · {a.accountNumber} · ${a.balance.toFixed(2)} · {a.isActive ? "Active" : "Inactive"}
                          </div>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="p-2 text-zinc-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Transaction log */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">Recent Transactions ({transactions.length})</h2>
        <div className="overflow-x-auto rounded border border-zinc-800">
          <table className="w-full text-left">
            <thead className="border-b border-zinc-800 text-zinc-500">
              <tr>
                <th className="p-2">Type</th>
                <th className="p-2">From</th>
                <th className="p-2">To</th>
                <th className="p-2">Amount</th>
                <th className="p-2">Status</th>
                <th className="p-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-zinc-900">
                  <td className="p-2">{t.type}</td>
                  <td className="p-2 text-zinc-400">{t.fromLabel}</td>
                  <td className="p-2 text-zinc-400">{t.toLabel}</td>
                  <td className="p-2">${t.amount.toFixed(2)}</td>
                  <td className="p-2">{t.status}</td>
                  <td className="p-2 text-zinc-500">{new Date(t.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
