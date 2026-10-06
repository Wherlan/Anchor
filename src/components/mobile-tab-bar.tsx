"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  LayoutDashboardIcon,
  CreditCardIcon,
  ArrowLeftRightIcon,
  Grid2x2Icon,
} from "lucide-react"

const TAB_GROUP = ["/dashboard", "/cards", "/transfers", "/more"]

const tabs = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboardIcon },
  { label: "Cards", href: "/cards", icon: CreditCardIcon },
  { label: "Transfers", href: "/transfers", icon: ArrowLeftRightIcon },
  { label: "More", href: "/more", icon: Grid2x2Icon },
]

export function MobileTabBar() {
  const isMobile = useIsMobile()
  const pathname = usePathname()

  if (!isMobile || !TAB_GROUP.includes(pathname)) return null

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-background/95 backdrop-blur">
      {tabs.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <tab.icon className="size-5" />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
