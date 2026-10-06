"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { AnalyticsHeatmapDay } from "@/lib/data"

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""]
const CELL_SIZE = 13
const CELL_GAP = 3
const TOTAL = CELL_SIZE + CELL_GAP

function intensityClass(amount: number, max: number): string {
  if (amount === 0) return "fill-muted/40"
  const ratio = max > 0 ? amount / max : 0
  if (ratio < 0.2) return "fill-primary/10"
  if (ratio < 0.4) return "fill-primary/25"
  if (ratio < 0.65) return "fill-primary/45"
  return "fill-primary/70"
}

export function SpendingHeatmap({ data }: { data: AnalyticsHeatmapDay[] }) {
  const { grid, monthLabels, yearTotal, max } = useMemo(() => {
    if (data.length === 0) return { grid: [], monthLabels: [], yearTotal: 0, max: 0 }
    const max = Math.max(...data.map((day) => day.amount))
    const yearTotal = data.reduce((sum, day) => sum + day.amount, 0)
    const firstDate = new Date(data[0].date + "T12:00:00")
    const startDay = firstDate.getDay()
    const gridStart = new Date(firstDate)
    gridStart.setDate(gridStart.getDate() - startDay)
    const lookup = new Map(data.map((day) => [day.date, day.amount]))
    const grid: { date: string; amount: number; col: number; row: number }[] = []
    const monthLabels: { label: string; col: number }[] = []
    const seenMonths = new Set<string>()
    for (let col = 0; col < 53; col++) for (let row = 0; row < 7; row++) {
      const date = new Date(gridStart)
      date.setDate(date.getDate() + col * 7 + row)
      const key = date.toISOString().slice(0, 10)
      grid.push({ date: key, amount: lookup.get(key) ?? 0, col, row })
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`
      if (!seenMonths.has(monthKey) && row === 0) { seenMonths.add(monthKey); monthLabels.push({ label: date.toLocaleDateString("en-US", { month: "short" }), col }) }
    }
    return { grid, monthLabels, yearTotal, max }
  }, [data])

  return <Card><CardHeader><CardTitle>Spending Activity</CardTitle><CardDescription><span className="tabular-nums font-medium text-foreground">${yearTotal.toLocaleString()}</span> total spent in the last 12 months</CardDescription></CardHeader><CardContent>{data.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">No spending data is available yet.</p> : <div className="overflow-x-auto"><TooltipProvider delay={0}><svg width={53 * TOTAL + 32} height={7 * TOTAL + 24} className="text-muted-foreground">{monthLabels.map((month) => <text key={`${month.label}-${month.col}`} x={month.col * TOTAL + 32} y={10} className="fill-muted-foreground text-[10px]">{month.label}</text>)}{DAY_LABELS.map((label, index) => label ? <text key={index} x={0} y={index * TOTAL + 28} className="fill-muted-foreground text-[10px]" dominantBaseline="middle">{label}</text> : null)}{grid.map((cell) => <Tooltip key={cell.date}><TooltipTrigger render={<rect x={cell.col * TOTAL + 32} y={cell.row * TOTAL + 18} width={CELL_SIZE} height={CELL_SIZE} rx={2} className={`${intensityClass(cell.amount, max)} transition-colors hover:stroke-foreground/30 hover:stroke-1`} />} /><TooltipContent><span className="tabular-nums">${cell.amount.toLocaleString()}</span> on {new Date(cell.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</TooltipContent></Tooltip>)}</svg></TooltipProvider></div>}</CardContent></Card>
}
