"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import type { LoginActivityRow, UserProfile } from "@/lib/data"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  UserIcon,
  ShieldIcon,
  BellIcon,
  PaletteIcon,
  LoaderIcon,
  MonitorIcon,
  SunIcon,
  MoonIcon,
  CheckIcon,
  LaptopIcon,
  FileCheck2Icon,
  UploadIcon,
} from "lucide-react"

type TabId = "profile" | "security" | "kyc" | "notifications" | "appearance"

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profile", icon: <UserIcon className="size-4" /> },
  { id: "security", label: "Security", icon: <ShieldIcon className="size-4" /> },
  { id: "kyc", label: "KYC", icon: <FileCheck2Icon className="size-4" /> },
  { id: "notifications", label: "Notifications", icon: <BellIcon className="size-4" /> },
  { id: "appearance", label: "Appearance", icon: <PaletteIcon className="size-4" /> },
]

// ── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ profile }: { profile: UserProfile }) {
  const [saving, setSaving] = React.useState(false)
  const [name, setName] = React.useState(`${profile.firstName} ${profile.lastName}`)
  const [email, setEmail] = React.useState(profile.email)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Couldn't update your profile.")
        return
      }

      setName(`${data.user.firstName} ${data.user.lastName}`)
      setEmail(data.user.email)
      setSuccess(true)
    } catch {
      setError("Couldn't reach the server.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your account profile details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage src="/avatars/user.jpg" alt="User avatar" />
            <AvatarFallback className="text-lg">AG</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{name}</p>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="name">
              Full Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-[#3F6B4E]">Profile updated.</p>}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !name.trim() || !email.trim()}>
            {saving && <LoaderIcon className="size-4 animate-spin" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab({ loginActivity }: { loginActivity: LoginActivityRow[] }) {
  const [currentPw, setCurrentPw] = React.useState("")
  const [newPw, setNewPw] = React.useState("")
  const [confirmPw, setConfirmPw] = React.useState("")
  const [pwSaving, setPwSaving] = React.useState(false)
  const [pwError, setPwError] = React.useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = React.useState(false)

  async function handlePasswordChange() {
    if (newPw !== confirmPw) {
      setPwError("New passwords don't match.")
      return
    }
    setPwSaving(true)
    setPwError(null)
    setPwSuccess(false)
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPwError(data.error ?? "Couldn't update password.")
        return
      }
      setPwSuccess(true)
      setCurrentPw("")
      setNewPw("")
      setConfirmPw("")
      // The server ended all existing sessions (including this one) — sign in again.
      setTimeout(() => {
        void signOut({ callbackUrl: "/sign-in" })
      }, 1500)
    } catch {
      setPwError("Couldn't reach the server.")
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="current-pw">
              Current Password
            </label>
            <Input
              id="current-pw"
              type="password"
              placeholder="Enter current password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="new-pw">
                New Password
              </label>
              <Input
                id="new-pw"
                type="password"
                placeholder="Enter new password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirm-pw">
                Confirm Password
              </label>
              <Input
                id="confirm-pw"
                type="password"
                placeholder="Confirm new password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
            </div>
          </div>
          {pwError && <p className="text-sm text-destructive">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-[#3F6B4E]">Password updated. Signing you out so you can sign in again…</p>}
          <div className="flex justify-end">
            <Button onClick={handlePasswordChange} disabled={pwSaving || !currentPw || newPw.length < 8 || newPw !== confirmPw}>
              {pwSaving && <LoaderIcon className="size-4 animate-spin" />}
              {pwSaving ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor */}
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Not yet available</p>
              <p className="text-sm text-muted-foreground">
                Two-factor authentication is planned for a future update.
              </p>
            </div>
            <Switch checked={false} disabled />
          </div>
        </CardContent>
      </Card>

      {/* Login Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Login Activity</CardTitle>
          <CardDescription>
            Sign-in attempts on your account, most recent first
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loginActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No login activity recorded yet.</p>
          ) : (
            loginActivity.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex size-8 items-center justify-center rounded-full",
                    entry.success ? "bg-muted" : "bg-destructive/10"
                  )}>
                    <LaptopIcon className={cn("size-4", !entry.success && "text-destructive")} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {entry.device}
                      {!entry.success && <span className="ml-2 text-xs font-normal text-destructive">Failed attempt</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.ipAddress ?? "Unknown IP"} &middot; {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── KYC Tab ─────────────────────────────────────────────────────────────────

type KycDocumentRow = {
  id: string
  level: number
  type: "DRIVERS_LICENSE" | "SSN" | "TAX_ID"
  status: "PENDING" | "APPROVED" | "REJECTED"
  fileName: string | null
  mimeType: string | null
  textValue: string | null
  rejectionReason: string | null
  reviewedAt: string | null
  createdAt: string
}

function KycTab() {
  const [kycLevel, setKycLevel] = React.useState(1)
  const [exempt, setExempt] = React.useState(false)
  const [documents, setDocuments] = React.useState<KycDocumentRow[]>([])
  const [type, setType] = React.useState<KycDocumentRow["type"]>("DRIVERS_LICENSE")
  const [textValue, setTextValue] = React.useState("")
  const [file, setFile] = React.useState<File | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  async function loadKyc() {
    setLoading(true)
    try {
      const res = await fetch("/api/kyc", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Couldn't load KYC status.")
      setKycLevel(data.kycLevel ?? 1)
      setExempt(Boolean(data.exempt))
      setDocuments(data.documents ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load KYC status.")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/kyc", { cache: "no-store" })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(data.error ?? "Couldn't load KYC status.")
        setKycLevel(data.kycLevel ?? 1)
        setExempt(Boolean(data.exempt))
        setDocuments(data.documents ?? [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load KYC status.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const targetLevel = kycLevel === 1 ? 2 : kycLevel === 2 ? 3 : null
  const approvedLevel2 = documents.find((d) => d.level === 2 && d.status === "APPROVED")
  const pendingTarget = targetLevel ? documents.some((d) => d.level === targetLevel && d.status === "PENDING") : false
  const typeOptions = (["DRIVERS_LICENSE", "SSN", "TAX_ID"] as const).filter((item) => targetLevel !== 3 || item !== approvedLevel2?.type)

  async function submit() {
    if (!targetLevel || pendingTarget) return
    setSubmitting(true)
    setError(null)
    setMessage(null)
    const form = new FormData()
    form.set("type", type)
    if (type === "SSN") form.set("textValue", textValue)
    else if (file) form.set("file", file)
    else {
      setError("Select the ID document to upload.")
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch("/api/kyc", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Couldn't submit your ID.")
      setMessage(`KYC ${targetLevel} submitted for review.`)
      setTextValue("")
      setFile(null)
      const input = document.getElementById("kyc-file") as HTMLInputElement | null
      if (input) input.value = ""
      await loadKyc()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit your ID.")
    } finally {
      setSubmitting(false)
    }
  }

  if (exempt) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Identity Verification</CardTitle>
          <CardDescription>Admin accounts are not subject to KYC levels or transaction limits.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identity Verification</CardTitle>
          <CardDescription>Anchor verifies your identity in three levels. New accounts start at KYC 1.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((level) => {
              const active = kycLevel >= level
              return (
                <div key={level} className={cn("rounded-lg border p-4", active ? "border-foreground/30" : "border-muted")}>
                  <p className="text-sm font-semibold">KYC {level}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {level === 1 ? "Account created" : level === 2 ? "One approved valid ID" : "A second approved valid ID"}
                  </p>
                  <Badge className="mt-3" variant={active ? "default" : "secondary"}>{active ? "Verified" : "Locked"}</Badge>
                </div>
              )
            })}
          </div>

          {kycLevel === 3 ? (
            <div className="rounded-lg border p-4 text-sm">Your KYC is complete. No additional identity document is required.</div>
          ) : (
            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <p className="font-medium">Upgrade to KYC {targetLevel}</p>
                <p className="text-sm text-muted-foreground">Submit a valid identity document. A member of the Anchor team must approve it before your level changes.</p>
              </div>

              {pendingTarget ? (
                <div className="rounded-md bg-muted p-3 text-sm">Your KYC {targetLevel} document is currently under review.</div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="kyc-type">ID type</label>
                    <select id="kyc-type" value={type} onChange={(e) => setType(e.target.value as KycDocumentRow["type"])} className="h-10 w-full rounded-md border bg-background px-3 text-sm sm:max-w-sm">
                      {typeOptions.map((item) => <option key={item} value={item}>{item === "DRIVERS_LICENSE" ? "Driver's License" : item === "SSN" ? "SSN" : "Tax ID"}</option>)}
                    </select>
                  </div>

                  {type === "SSN" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="ssn">SSN</label>
                      <Input id="ssn" value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder="123-45-6789" inputMode="numeric" autoComplete="off" maxLength={11} />
                      <p className="text-xs text-muted-foreground">Your SSN is stored as sensitive verification data and is masked in the customer interface.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="kyc-file">ID document</label>
                      <Input id="kyc-file" type="file" accept="image/jpeg,image/jpg,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                      <p className="text-xs text-muted-foreground">JPG or PDF only, maximum 5 MB.</p>
                    </div>
                  )}

                  {error && <p className="text-sm text-destructive">{error}</p>}
                  {message && <p className="text-sm text-[#3F6B4E]">{message}</p>}
                  <div className="flex justify-end">
                    <Button onClick={submit} disabled={submitting || loading || !targetLevel || (type === "SSN" ? !textValue : !file)}>
                      {submitting ? "Submitting..." : <><UploadIcon className="size-4" /> Submit ID</>}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <div>
            <p className="mb-3 text-sm font-medium">Verification history</p>
            {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : documents.length === 0 ? <p className="text-sm text-muted-foreground">No ID submissions yet.</p> : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">KYC {doc.level} · {doc.type === "DRIVERS_LICENSE" ? "Driver's License" : doc.type === "SSN" ? "SSN" : "Tax ID"}</p>
                      <p className="text-xs text-muted-foreground">Submitted {new Date(doc.createdAt).toLocaleString()}</p>
                      {doc.status === "REJECTED" && doc.rejectionReason && <p className="mt-1 text-xs text-destructive">{doc.rejectionReason}</p>}
                    </div>
                    <div className="flex items-center gap-2"><Badge variant={doc.status === "APPROVED" ? "default" : doc.status === "REJECTED" ? "destructive" : "secondary"}>{doc.status}</Badge>{doc.mimeType && <a href={`/api/kyc/documents/${doc.id}`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>View document</a>}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Notifications Tab ────────────────────────────────────────────────────────

const notifToggles = [
  { id: "email", label: "Email Notifications", description: "Receive notifications via email", default: true },
  { id: "push", label: "Push Notifications", description: "Receive push notifications on your devices", default: true },
  { id: "transaction", label: "Transaction Alerts", description: "Get notified for every transaction", default: true },
  { id: "security", label: "Security Alerts", description: "Alerts for suspicious activity and logins", default: true },
  { id: "marketing", label: "Marketing Emails", description: "Receive product updates and offers", default: false },
  { id: "digest", label: "Weekly Digest", description: "A weekly summary of your account activity", default: true },
]

function NotificationsTab() {
  const [settings, setSettings] = React.useState<Record<string, boolean>>(
    () => Object.fromEntries(notifToggles.map((t) => [t.id, t.default]))
  )

  function toggle(id: string) {
    setSettings((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose what notifications you want to receive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {notifToggles.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-lg px-1 py-3"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-sm text-muted-foreground">{t.description}</p>
            </div>
            <Switch
              checked={settings[t.id]}
              onCheckedChange={() => toggle(t.id)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ── Appearance Tab ───────────────────────────────────────────────────────────

function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  // Required by next-themes to avoid a server/client hydration mismatch —
  // theme is unknowable until after mount, so this can't be computed eagerly.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), [])

  const themes: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: "light", label: "Light", icon: <SunIcon className="size-5" /> },
    { id: "dark", label: "Dark", icon: <MoonIcon className="size-5" /> },
    { id: "system", label: "System", icon: <MonitorIcon className="size-5" /> },
  ]

  if (!mounted) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize how Anchor looks on your device
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border-2 p-6 transition-all hover:bg-muted/50",
                theme === t.id
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border"
              )}
            >
              {t.icon}
              <span className="text-sm font-medium">{t.label}</span>
              {theme === t.id && (
                <CheckIcon className="size-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Settings Page ───────────────────────────────────────────────────────

export function SettingsPageClient({
  loginActivity,
  profile,
}: {
  loginActivity: LoginActivityRow[]
  profile: UserProfile
}) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = React.useState<TabId>(
    tabs.some((t) => t.id === tabParam) ? (tabParam as TabId) : "profile"
  )

  const tabContent: Record<TabId, React.ReactNode> = {
    profile: <ProfileTab profile={profile} />,
    security: <SecurityTab loginActivity={loginActivity} />,
    kyc: <KycTab />,
    notifications: <NotificationsTab />,
    appearance: <AppearanceTab />,
  }

  return (
    <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
      {/* Left nav (desktop) */}
      <nav className="hidden w-52 shrink-0 flex-col gap-1 lg:flex">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "justify-start gap-2",
              activeTab === tab.id && "font-semibold"
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </Button>
        ))}
      </nav>

      {/* Mobile tab bar */}
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 lg:hidden">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "secondary" : "ghost"}
            size="sm"
            className="shrink-0 gap-1.5 text-xs"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Content — full width */}
      <div className="min-w-0 flex-1">
        {tabContent[activeTab]}
        <div className="mt-6 flex gap-4 border-t pt-4 text-xs text-muted-foreground">
          <Link href="/terms" target="_blank" className="hover:text-foreground hover:underline">
            Terms of Service
          </Link>
          <Link href="/privacy" target="_blank" className="hover:text-foreground hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  )
}
