import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ShieldCheckIcon } from "lucide-react"
import type { SpendingLimitData } from "@/lib/data"

export function SpendingLimit({ data }: { data: SpendingLimitData }) {
  const percentUsed = data.budget > 0 ? Math.min(100, Math.round((data.spent / data.budget) * 100)) : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Monthly Spending Limit</CardTitle>
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted"><ShieldCheckIcon className="size-4 text-muted-foreground" /></div>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.budget > 0 ? (
          <>
            <div><p className="text-xs text-muted-foreground">Budget</p><p className="text-2xl font-bold tabular-nums tracking-tight">${data.budget.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{data.currency}</span></p></div>
            <Progress value={percentUsed} className="h-2" />
            <div className="flex items-center justify-between text-sm"><div><p className="text-xs text-muted-foreground">Spend</p><p className="font-semibold tabular-nums">${data.spent.toLocaleString()}</p></div><div className="text-right"><p className="text-xs text-muted-foreground">Remaining</p><p className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">${data.remaining.toLocaleString()}</p></div></div>
            <p className="text-xs text-muted-foreground">{data.periodStart} - {data.periodEnd}</p>
          </>
        ) : <p className="py-4 text-sm text-muted-foreground">No spending limit is set on your active card.</p>}
      </CardContent>
    </Card>
  )
}
