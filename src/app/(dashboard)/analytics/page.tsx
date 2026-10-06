import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getAnalyticsDataForUser } from "@/lib/data"
import { CategoryDonut } from "@/components/analytics/category-donut"
import { MonthComparison } from "@/components/analytics/month-comparison"
import { SpendingHeatmap } from "@/components/analytics/spending-heatmap"
import { RecurringDetector } from "@/components/analytics/recurring-detector"

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const data = await getAnalyticsDataForUser(session.user.id)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-lg font-semibold">Spending Analytics</h1>
        <p className="text-sm text-muted-foreground">Understand where your money is going based on your transaction history.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryDonut data={data.categories} />
        <MonthComparison data={data.monthComparison} />
        <SpendingHeatmap data={data.heatmap} />
        <RecurringDetector data={data.recurring} />
      </div>
    </div>
  )
}
