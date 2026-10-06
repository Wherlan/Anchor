import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getAccountsForUser,
  getBalanceHistoryForUser,
  getDashboardSummary,
  getRecentTransactionsForUser,
  getMoneyMovementForUser,
  getFinancialHealthForUser,
  getSpendingLimitForUser,
} from "@/lib/data"
import { DashboardCustomizer } from "@/components/dashboard/dashboard-customizer"

export default async function Page() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const [balanceHistory, summary, transactions, accounts, moneyMovement, financialHealth, spendingLimit] = await Promise.all([
    getBalanceHistoryForUser(session.user.id),
    getDashboardSummary(session.user.id),
    getRecentTransactionsForUser(session.user.id, 8),
    getAccountsForUser(session.user.id),
    getMoneyMovementForUser(session.user.id),
    getFinancialHealthForUser(session.user.id),
    getSpendingLimitForUser(session.user.id),
  ])

  return (
    <DashboardCustomizer
      balanceHistory={balanceHistory}
      summary={summary}
      transactions={transactions}
      accounts={accounts}
      moneyMovement={moneyMovement}
      financialHealth={financialHealth}
      spendingLimit={spendingLimit}
    />
  )
}
