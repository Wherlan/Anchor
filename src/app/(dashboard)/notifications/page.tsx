import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getNotificationsForUser } from "@/lib/data"
import { NotificationsPageClient } from "@/components/notifications/notifications-page-client"

export default async function Page() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const notifications = await getNotificationsForUser(session.user.id)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <NotificationsPageClient notifications={notifications} />
    </div>
  )
}
