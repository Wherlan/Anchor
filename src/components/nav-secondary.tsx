"use client"

import * as React from "react"
import Link from "next/link"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { NotificationRow } from "@/lib/data"
import {
  ArrowLeftRightIcon,
  ShieldAlertIcon,
  InfoIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const iconMap: Record<string, React.ReactNode> = {
  TRANSACTION: <ArrowLeftRightIcon className="size-3.5" />,
  SECURITY: <ShieldAlertIcon className="size-3.5" />,
  SYSTEM: <InfoIcon className="size-3.5" />,
}

const typeColor: Record<string, string> = {
  TRANSACTION: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  SECURITY: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
  SYSTEM: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
}

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

function NotificationDropdown({ icon, notifications }: { icon: React.ReactNode; notifications: NotificationRow[] }) {
  const unreadCount = notifications.filter((n) => !n.read).length
  const latest = notifications.slice(0, 6)

  return (
    <Popover>
      <PopoverTrigger render={<SidebarMenuButton size="sm" className="relative" />}>
        {icon}
        <span className="flex-1">Notifications</span>
        {unreadCount > 0 && (
          <span className="flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold leading-none text-primary-foreground tabular-nums">
            {unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent side="right" align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <span className="text-[10px] font-medium text-muted-foreground">{unreadCount} unread</span>
          )}
        </div>
        <div className="max-h-[380px] overflow-y-auto">
          {latest.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            latest.map((n) => (
              <div key={n.id} className={cn("flex gap-3 border-b px-4 py-3 last:border-0", !n.read && "bg-muted/50")}>
                <div className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", typeColor[n.type])}>
                  {iconMap[n.type]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-xs", !n.read ? "font-semibold" : "font-medium")}>{n.title}</p>
                    {!n.read && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-emerald-500" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{n.body}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/60">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t p-2">
          <Link
            href="/notifications"
            className="flex items-center justify-center rounded-md py-1.5 text-xs font-medium text-primary hover:bg-muted transition-colors"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function NavSecondary({
  items,
  notifications,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: React.ReactNode
  }[]
  notifications: NotificationRow[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.title === "Notifications" ? (
                <NotificationDropdown icon={item.icon} notifications={notifications} />
              ) : (
                <SidebarMenuButton size="sm" render={<Link href={item.url} />}>
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
