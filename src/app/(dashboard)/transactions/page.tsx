import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getAllTransactionsForUser } from "@/lib/data"
import { TransactionsPageClient } from "@/components/transactions/transactions-page-client"

export default async function Page() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const transactions = await getAllTransactionsForUser(session.user.id)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <TransactionsPageClient transactions={transactions} />
    </div>
  )
}
