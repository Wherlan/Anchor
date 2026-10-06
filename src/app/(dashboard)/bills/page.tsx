import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getAccountsForUser, getPayeesForUser } from "@/lib/data"
import { BillsPageClient } from "@/components/bills/bills-page-client"

export default async function Page() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const [accounts, payees] = await Promise.all([
    getAccountsForUser(session.user.id),
    getPayeesForUser(session.user.id),
  ])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <BillsPageClient accounts={accounts} payees={payees} />
    </div>
  )
}
