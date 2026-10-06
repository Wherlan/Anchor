"use client"

import { useMemo, useState } from "react"
import { PieChart, Pie, Cell } from "recharts"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeftIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { AnalyticsCategory } from "@/lib/data"

const SUBCATEGORY_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

export function CategoryDonut({ data }: { data: AnalyticsCategory[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const selectedCategory = useMemo(() => data.find((category) => category.category === selected) ?? null, [data, selected])
  const total = useMemo(() => data.reduce((sum, category) => sum + category.amount, 0), [data])
  const chartConfig = useMemo<ChartConfig>(() => {
    const source = selectedCategory?.subcategories ?? data
    return Object.fromEntries(source.map((entry, index) => [
      "name" in entry ? entry.name : entry.category,
      { label: "name" in entry ? entry.name : entry.category, color: "name" in entry ? SUBCATEGORY_COLORS[index % SUBCATEGORY_COLORS.length] : entry.color },
    ]))
  }, [data, selectedCategory])
  const pieData = selectedCategory
    ? selectedCategory.subcategories.map((entry, index) => ({ name: entry.name, value: entry.amount, fill: SUBCATEGORY_COLORS[index % SUBCATEGORY_COLORS.length] }))
    : data.map((entry) => ({ name: entry.category, value: entry.amount, fill: entry.color }))
  const centerAmount = selectedCategory?.amount ?? total

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{selectedCategory ? selectedCategory.category : "Spending by Category"}</CardTitle>
          {selectedCategory && <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setSelected(null)}><ArrowLeftIcon className="size-3" />Back to all</Button>}
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">No spending data is available yet.</p> : (
          <>
            <AnimatePresence mode="wait">
              <motion.div key={selected ?? "all"} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[280px]">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => `$${Number(value).toLocaleString()}`} />} />
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={75} outerRadius={110} strokeWidth={2} stroke="var(--color-card)" paddingAngle={2} onClick={(_, index) => { if (!selectedCategory) setSelected(data[index]?.category ?? null) }} className={selectedCategory ? "" : "cursor-pointer"}>
                      {pieData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                    </Pie>
                    <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-bold tabular-nums">${centerAmount.toLocaleString()}</text>
                    <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">{selectedCategory ? "category total" : "total spent"}</text>
                  </PieChart>
                </ChartContainer>
              </motion.div>
            </AnimatePresence>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {pieData.map((entry) => <div key={entry.name} className="flex items-center gap-2"><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.fill }} /><span className="truncate text-muted-foreground">{entry.name}</span><span className="ml-auto font-medium tabular-nums">${entry.value.toLocaleString()}</span></div>)}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
