"use client"

import { format } from "date-fns"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, type DotProps } from "recharts"
import type { AccountWithCard, BalancePoint } from "@/lib/data"
import { EmptyState } from "@/components/empty-state"

function SquareDot({ cx, cy, fill, size = 6 }: DotProps & { size?: number }) {
  if (cx == null || cy == null) return null
  return <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} fill={fill} rx={1} />
}

const chartConfig = {
  balance: {
    label: "Balance",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig

const fmt = (n: number) =>
  `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)}`

export function FinancialOverview({
  history,
  currentBalance,
  accounts,
}: {
  history: BalancePoint[]
  currentBalance: number
  accounts: AccountWithCard[]
}) {
  const chartData = history.map((p) => ({
    ...p,
    label: format(new Date(p.date), "MMM d"),
  }))

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">Balance History</CardTitle>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" />
              Current total
              <span className="font-medium text-foreground">{fmt(currentBalance)}</span>
            </div>
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center gap-1.5">
                <span>{account.nickname || (account.type === "CHECKING" ? "Checking" : "Savings")}</span>
                <span className="font-mono font-medium text-foreground">{account.accountNumber}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {chartData.length < 2 ? (
          <div className="flex h-[260px] items-center justify-center">
            <EmptyState
              variant="generic"
              title="Building your history"
              description="Your balance chart fills in as you make transactions — check back after a few transfers or purchases."
            />
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[260px] w-full">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="fillBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tickMargin={8}
                stroke="var(--color-muted-foreground)"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tickMargin={8}
                stroke="var(--color-muted-foreground)"
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => label}
                    formatter={(value) => `$${Number(value).toLocaleString()}`}
                  />
                }
              />
              <Area
                dataKey="balance"
                type="linear"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#fillBalance)"
                dot={<SquareDot fill="var(--color-primary)" size={6} />}
                activeDot={<SquareDot fill="var(--color-primary)" size={9} />}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
