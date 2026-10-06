"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { AnalyticsMonthComparison } from "@/lib/data"

const chartConfig = { thisMonth: { label: "This Month", color: "var(--color-primary)" }, lastMonth: { label: "Last Month", color: "var(--color-muted-foreground)" } } satisfies ChartConfig

// Plain render function (not a component) so it isn't re-created on every render.
function renderChangeLabel(props: Record<string, unknown>, data: AnalyticsMonthComparison[]) {
  const { x, y, width, index } = props as { x: number; y: number; width: number; index: number }
  const row = data[index]
  if (!row || row.lastMonth === 0) return null
  const pct = Math.round(((row.thisMonth - row.lastMonth) / row.lastMonth) * 100)
  if (pct === 0) return null
  return <text x={x + width / 2} y={y - 6} textAnchor="middle" className={`text-[10px] font-medium tabular-nums ${pct > 0 ? "fill-rose-500" : "fill-emerald-500"}`}>{pct > 0 ? "+" : ""}{pct}%</text>
}

export function MonthComparison({ data }: { data: AnalyticsMonthComparison[] }) {
  const totals = useMemo(() => data.reduce((result, row) => ({ thisMonth: result.thisMonth + row.thisMonth, lastMonth: result.lastMonth + row.lastMonth }), { thisMonth: 0, lastMonth: 0 }), [data])

  return <Card><CardHeader><CardTitle>Month vs Last Month</CardTitle><CardDescription><span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"><span>This Month <span className="font-medium tabular-nums text-foreground">${totals.thisMonth.toLocaleString()}</span></span><span>Last Month <span className="font-medium tabular-nums text-foreground">${totals.lastMonth.toLocaleString()}</span></span></span></CardDescription></CardHeader><CardContent className="min-w-0">{data.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">No spending data is available yet.</p> : <ChartContainer config={chartConfig} className="h-[280px] w-full"><BarChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: -20 }} barGap={4}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} /><XAxis dataKey="category" tickLine={false} axisLine={false} fontSize={11} tickMargin={8} stroke="var(--color-muted-foreground)" tickFormatter={(v: string) => v.length > 8 ? v.slice(0, 7) + "..." : v} /><YAxis tickLine={false} axisLine={false} fontSize={11} tickMargin={8} stroke="var(--color-muted-foreground)" tickFormatter={(v: number) => `$${v}`} /><ChartTooltip content={<ChartTooltipContent formatter={(value) => `$${Number(value).toLocaleString()}`} />} /><Bar dataKey="lastMonth" fill="var(--color-muted-foreground)" fillOpacity={0.3} radius={[4, 4, 0, 0]} barSize={18} /><Bar dataKey="thisMonth" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={18}><LabelList dataKey="thisMonth" content={(props) => renderChangeLabel(props as unknown as Record<string, unknown>, data)} /></Bar></BarChart></ChartContainer>}</CardContent></Card>
}
