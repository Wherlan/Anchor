"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Area, AreaChart, ReferenceLine, XAxis, YAxis } from "recharts"
import { AlertTriangleIcon, CheckCircle2Icon } from "lucide-react"
import { cn } from "@/lib/utils"
import { BUDGETS_UPDATED_EVENT, budgetStorageKey, type BudgetTransaction } from "./budget-rings"

type Budget = { category: string; budget: number }

const chartConfig = {
  cumulative: { label: "Spending", color: "var(--color-primary)" },
} satisfies ChartConfig

export function MonthProjection({ userId, transactions }: { userId: string; transactions: BudgetTransaction[] }) {
  const storageKey = budgetStorageKey(userId)
  const [budgets, setBudgets] = useState<Budget[]>([])

  useEffect(() => {
    const updateBudgets = () => {
      try {
        const stored = localStorage.getItem(storageKey)
        setBudgets(stored ? JSON.parse(stored) as Budget[] : [])
      } catch {
        setBudgets([])
      }
    }

    updateBudgets()
    window.addEventListener(BUDGETS_UPDATED_EVENT, updateBudgets)
    return () => window.removeEventListener(BUDGETS_UPDATED_EVENT, updateBudgets)
  }, [storageKey])

  const stats = useMemo(() => {
    const totalBudget = budgets.reduce((sum, budget) => sum + budget.budget, 0)
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const totals = Array.from({ length: daysInMonth }, () => 0)

    for (const transaction of transactions) {
      const date = new Date(transaction.createdAt)
      if (date < start || date > now) continue
      totals[date.getDate() - 1] += transaction.amount
    }

    const elapsedDays = now.getDate()
    const totalSpent = totals.slice(0, elapsedDays).reduce((sum, amount) => sum + amount, 0)
    const avgDaily = elapsedDays > 0 ? totalSpent / elapsedDays : 0
    const daysLeft = Math.max(daysInMonth - elapsedDays, 0)
    const projected = totalSpent + avgDaily * daysLeft
    const overBudget = totalBudget > 0 && projected > totalBudget
    const chartData = totals.map((amount, index) => {
      const cumulative = totals.slice(0, index + 1).reduce((sum, value) => sum + value, 0)
      return { day: index + 1, cumulative, budget: daysInMonth > 0 ? (totalBudget / daysInMonth) * (index + 1) : 0 }
    })

    return { totalBudget, totalSpent, avgDaily, daysLeft, projected, overBudget, chartData }
  }, [budgets, transactions])

  return (
    <Card>
      <CardHeader><CardTitle className="text-base font-semibold">Month Projection</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {stats.totalBudget > 0 ? (
          <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium", stats.overBudget ? "bg-destructive/10 text-destructive" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400")}>
            {stats.overBudget ? <AlertTriangleIcon className="size-4" /> : <CheckCircle2Icon className="size-4" />}
            {stats.overBudget ? "Projected to exceed budget" : "On track this month"}
          </div>
        ) : (
          <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Set at least one monthly budget to see a projection.</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-[10px] font-medium text-muted-foreground">Days Left</p><p className="text-lg font-bold tabular-nums">{stats.daysLeft}</p></div>
          <div><p className="text-[10px] font-medium text-muted-foreground">Avg/Day</p><p className="text-lg font-bold tabular-nums">${Math.round(stats.avgDaily).toLocaleString()}</p></div>
          <div><p className="text-[10px] font-medium text-muted-foreground">Spent So Far</p><p className="text-lg font-bold tabular-nums">${stats.totalSpent.toLocaleString()}</p></div>
          <div><p className="text-[10px] font-medium text-muted-foreground">Projected</p><p className={cn("text-lg font-bold tabular-nums", stats.overBudget && "text-destructive")}>${Math.round(stats.projected).toLocaleString()}</p></div>
        </div>
        <ChartContainer config={chartConfig} className="h-[140px] w-full">
          <AreaChart data={stats.chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs><linearGradient id="fillSpend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.2} /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={10} tickMargin={4} stroke="var(--color-muted-foreground)" />
            <YAxis tickLine={false} axisLine={false} fontSize={10} tickMargin={4} stroke="var(--color-muted-foreground)" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => `$${Number(value).toLocaleString()}`} />} />
            {stats.totalBudget > 0 && <ReferenceLine y={stats.totalBudget} stroke="var(--color-destructive)" strokeDasharray="4 4" strokeOpacity={0.5} />}
            {stats.totalBudget > 0 && <Area dataKey="budget" type="linear" stroke="var(--color-muted-foreground)" strokeOpacity={0.2} strokeDasharray="4 4" fill="transparent" dot={false} />}
            <Area dataKey="cumulative" type="monotone" stroke="var(--color-primary)" strokeWidth={2} fill="url(#fillSpend)" dot={false} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
