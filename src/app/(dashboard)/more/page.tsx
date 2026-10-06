import Link from "next/link"
import {
  ReceiptTextIcon,
  TargetIcon,
  BellIcon,
  SettingsIcon,
  ChevronRightIcon,
} from "lucide-react"

const items = [
  { label: "Bill Pay", href: "/bills", icon: ReceiptTextIcon },
  { label: "Budgets", href: "/budgets", icon: TargetIcon },
  { label: "Notifications", href: "/notifications", icon: BellIcon },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
]

export default function MorePage() {
  return (
    <div className="flex flex-1 flex-col gap-2 p-4 pt-0">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <item.icon className="size-4" />
          </div>
          <span className="flex-1 text-sm font-medium">{item.label}</span>
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        </Link>
      ))}
    </div>
  )
}
