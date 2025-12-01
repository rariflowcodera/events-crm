import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/server/queries/auth-queries"
import { getCallbackPageQuery } from "@/server/queries/callback"

import { redirectToRoute, ROUTES } from "@/lib/routes"

export const metadata: Metadata = ROUTES.callback.metadata

export default async function CallbackPage() {
  const { user } = await getCurrentUser()

  if (!user) {
    return redirectToRoute("sign-in")
  }

  // Get all user data in parallel
  const { ownedWorkspaces, memberWorkspaces } = await getCallbackPageQuery(user.id)

  if (ownedWorkspaces.length) {
    return redirectToRoute("dashboard", { slug: ownedWorkspaces[0].slug })
  }

  if (memberWorkspaces.length) {
    return redirectToRoute("dashboard", { slug: memberWorkspaces[0].slug })
  }

  return redirect("/join")
}
