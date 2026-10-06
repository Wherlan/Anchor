import { Suspense } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getLoginActivityForUser, getUserProfileForUser } from "@/lib/data"
import { SettingsPageClient } from "@/components/settings/settings-page-client"

export default async function Page() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const [loginActivity, profile] = await Promise.all([
    getLoginActivityForUser(session.user.id),
    getUserProfileForUser(session.user.id),
  ])

  if (!profile) {
    redirect("/sign-in")
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <Suspense>
        <SettingsPageClient loginActivity={loginActivity} profile={profile} />
      </Suspense>
    </div>
  )
}
