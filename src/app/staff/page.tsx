import { getUsersForStaff, getRecentTransactionsForStaff } from "@/lib/data"
import { StaffClient } from "@/components/staff/staff-client"

export default async function StaffPage() {
  const [users, transactions] = await Promise.all([
    getUsersForStaff(),
    getRecentTransactionsForStaff(),
  ])

  return <StaffClient users={users} transactions={transactions} />
}
