import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getAccountsForUser, getTransfersForUser } from "@/lib/data"
import { TransfersPageClient } from "@/components/transfers/transfers-page-client"

export default async function Page() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const [accounts, transfers] = await Promise.all([
    getAccountsForUser(session.user.id),
    getTransfersForUser(session.user.id),
  ])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <TransfersPageClient accounts={accounts} transfers={transfers} />
    </div>
  )
}
