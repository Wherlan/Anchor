import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getBudgetTransactionsForUser } from "@/lib/data"
import { BudgetRings } from "@/components/budgets/budget-rings"
import { SavingsGoals } from "@/components/budgets/savings-goals"
import { SpendingCalendar } from "@/components/budgets/spending-calendar"
import { MonthProjection } from "@/components/budgets/month-projection"

export default async function Page() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const userId = session.user.id
  const transactions = await getBudgetTransactionsForUser(userId)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <BudgetRings key={userId} userId={userId} transactions={transactions} />
      <SavingsGoals key={userId} userId={userId} />
      <div className="grid gap-4 lg:grid-cols-2">
        <SpendingCalendar transactions={transactions} />
        <MonthProjection key={userId} userId={userId} transactions={transactions} />
      </div>
    </div>
  )
}
