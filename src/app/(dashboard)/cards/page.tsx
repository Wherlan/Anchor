import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getAccountsForUser } from "@/lib/data"
import { CardsPageClient } from "@/components/cards/cards-page-client"

export default async function Page() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const accounts = await getAccountsForUser(session.user.id)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <CardsPageClient accounts={accounts} holderName={session.user.name ?? "Card Holder"} />
    </div>
  )
}
