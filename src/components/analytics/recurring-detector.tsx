"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CheckCircle2Icon, FlagIcon, CircleDashedIcon } from "lucide-react"
import type { AnalyticsRecurringCharge } from "@/lib/data"

type Status = "unset" | "wanted" | "review"
const CYCLE: Status[] = ["unset", "wanted", "review"]

function nextStatus(current: Status) { return CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length] }
function StatusIcon({ status }: { status: Status }) {
  if (status === "wanted") return <CheckCircle2Icon className="size-4 text-emerald-500" />
  if (status === "review") return <FlagIcon className="size-4 text-amber-500" />
  return <CircleDashedIcon className="size-4 text-muted-foreground/50" />
}

export function RecurringDetector({ data }: { data: AnalyticsRecurringCharge[] }) {
  const [statuses, setStatuses] = useState<Record<string, Status>>({})
  const monthlyTotal = useMemo(() => data.reduce((sum, charge) => sum + (charge.frequency === "yearly" ? charge.amount / 12 : charge.amount), 0), [data])
  const summary = useMemo(() => Object.values(statuses).reduce<{ wanted: number; review: number }>((result, status) => ({ wanted: result.wanted + (status === "wanted" ? 1 : 0), review: result.review + (status === "review" ? 1 : 0) }), { wanted: 0, review: 0 }), [statuses])
  function toggleStatus(id: string) { setStatuses((current) => ({ ...current, [id]: nextStatus(current[id] ?? "unset") })) }

  return <Card><CardHeader><CardTitle>Recurring Payments</CardTitle><CardDescription><span className="tabular-nums font-medium text-foreground">${monthlyTotal.toFixed(2)}</span>/month estimated</CardDescription></CardHeader><CardContent className="space-y-1">{data.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No recurring payments detected yet.</p> : data.map((charge) => { const status = statuses[charge.id] ?? "unset"; return <div key={charge.id} className={cn("flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50")}><div className="flex size-7 items-center justify-center rounded-md bg-muted text-xs font-semibold">{charge.merchant.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{charge.merchant}</p><p className="text-xs text-muted-foreground">Next: {charge.nextDate}</p></div><div className="mr-2 text-right"><p className="text-sm font-medium tabular-nums">${charge.amount.toFixed(2)}</p><p className="text-[10px] capitalize text-muted-foreground">{charge.frequency}</p></div><button type="button" onClick={() => toggleStatus(charge.id)} className="rounded-full p-1 transition-colors hover:bg-muted" aria-label={`Toggle status for ${charge.merchant}`}><StatusIcon status={status} /></button></div> })}</CardContent>{data.length > 0 && <CardFooter><div className="flex w-full items-center justify-between text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><CheckCircle2Icon className="size-3.5 text-emerald-500" /><span className="tabular-nums">{summary.wanted}</span> kept</span><span className="flex items-center gap-1.5"><FlagIcon className="size-3.5 text-amber-500" /><span className="tabular-nums">{summary.review}</span> review</span></div></CardFooter>}</Card>
}
