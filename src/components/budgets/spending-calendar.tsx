"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { BudgetTransaction } from "./budget-rings"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function SpendingCalendar({ transactions }: { transactions: BudgetTransaction[] }) {
  const { weeks, maxAmount, title } = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startPad = firstDay.getDay()
    const totals = new Map<string, number>()

    for (const transaction of transactions) {
      const date = new Date(transaction.createdAt)
      if (date.getFullYear() !== year || date.getMonth() !== month) continue
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
      totals.set(key, (totals.get(key) ?? 0) + transaction.amount)
    }

    const cells: { day: number | null; amount: number; date: string }[] = []
    for (let i = 0; i < startPad; i += 1) cells.push({ day: null, amount: 0, date: "" })
    let max = 0
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      const amount = totals.get(date) ?? 0
      max = Math.max(max, amount)
      cells.push({ day, amount, date })
    }

    const weeks: typeof cells[] = []
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
    const last = weeks[weeks.length - 1]
    while (last.length < 7) last.push({ day: null, amount: 0, date: "" })

    return {
      weeks,
      maxAmount: max,
      title: firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    }
  }, [transactions])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title} Spending</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
          {DAYS.map((day) => <div key={day} className="py-1">{day}</div>)}
        </div>
        <div className="mt-1 grid gap-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.map((cell, cellIndex) => {
                if (cell.day === null) return <div key={cellIndex} />
                const intensity = cell.amount === 0 || maxAmount === 0 ? 0 : Math.min(Math.round((cell.amount / maxAmount) * 4), 4)
                const isToday = cell.date === new Date().toISOString().slice(0, 10)
                return (
                  <div
                    key={cellIndex}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-lg py-1.5 text-center transition-colors",
                      intensity === 0 && "bg-transparent",
                      intensity === 1 && "bg-primary/10",
                      intensity === 2 && "bg-primary/20",
                      intensity === 3 && "bg-primary/35",
                      intensity === 4 && "bg-primary/50",
                      isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                    )}
                  >
                    <span className="text-[11px] font-medium">{cell.day}</span>
                    {cell.amount > 0 && <span className="hidden text-[9px] tabular-nums text-muted-foreground sm:inline">${Math.round(cell.amount)}</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
