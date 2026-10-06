"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"
import type { NotificationRow } from "@/lib/data"
import {
  ArrowLeftRightIcon,
  ShieldAlertIcon,
  InfoIcon,
  XIcon,
  CheckCheckIcon,
} from "lucide-react"

type FilterType = "all" | "unread" | "TRANSACTION" | "SECURITY" | "SYSTEM"

const iconMap: Record<string, React.ReactNode> = {
  TRANSACTION: <ArrowLeftRightIcon className="size-4" />,
  SECURITY: <ShieldAlertIcon className="size-4" />,
  SYSTEM: <InfoIcon className="size-4" />,
}

const typeColors: Record<string, string> = {
  TRANSACTION: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  SECURITY: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  SYSTEM: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
}

const filters: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Transactions", value: "TRANSACTION" },
  { label: "Security", value: "SECURITY" },
  { label: "System", value: "SYSTEM" },
]

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function NotificationsPageClient({ notifications }: { notifications: NotificationRow[] }) {
  const router = useRouter()
  const [filter, setFilter] = React.useState<FilterType>("all")

  const unreadCount = notifications.filter((n) => !n.read).length

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true
    if (filter === "unread") return !n.read
    return n.type === filter
  })

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    })
    router.refresh()
  }

  async function toggleRead(id: string, alreadyRead: boolean) {
    if (alreadyRead) return
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    router.refresh()
  }

  async function dismiss(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" })
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="default" className="tabular-nums">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheckIcon className="size-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Notification List */}
      <Card>
        <CardContent className="p-0">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <EmptyState
                  variant={filter === "all" || filter === "unread" ? "notifications" : "filter"}
                  className="py-12"
                />
              </motion.div>
            ) : (
              filtered.map((n) => (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className={cn(
                      "group relative flex cursor-pointer items-start gap-3 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/50",
                      !n.read && "bg-primary/[0.03]"
                    )}
                    onClick={() => toggleRead(n.id, n.read)}
                  >
                    {!n.read && (
                      <span className="absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-emerald-500" />
                    )}

                    <div className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", typeColors[n.type])}>
                      {iconMap[n.type]}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm", !n.read ? "font-semibold" : "font-medium")}>{n.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{n.body}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          dismiss(n.id)
                        }}
                      >
                        <XIcon className="size-3" />
                        <span className="sr-only">Dismiss</span>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}
