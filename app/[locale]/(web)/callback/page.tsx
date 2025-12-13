import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/server/queries/auth-queries"
import { getCallbackPageQuery, getPendingInvitationsForUser } from "@/server/queries/callback"
import { acceptInvitation } from "@/server/queries/invitations"

import { RoleTypesType } from "@/types/types"
import { redirectToRoute, ROUTES } from "@/lib/routes"

export const metadata: Metadata = ROUTES.callback.metadata

export default async function CallbackPage() {
  const { user } = await getCurrentUser()

  if (!user) {
    return redirectToRoute("sign-in")
  }

  // Auto-accept any pending invitations for this user
  const pendingInvitations = await getPendingInvitationsForUser(user.email)

  for (const invitation of pendingInvitations) {
    await acceptInvitation({
      invitationId: invitation.id,
      userId: user.id,
      workspaceId: invitation.workspaceId,
      role: invitation.role as RoleTypesType,
    })
  }

  // Get all user data (now includes auto-accepted workspaces)
  const { ownedWorkspaces, memberWorkspaces } = await getCallbackPageQuery(user.id)

  if (ownedWorkspaces.length) {
    return redirectToRoute("dashboard", { slug: ownedWorkspaces[0].slug })
  }

  if (memberWorkspaces.length) {
    return redirectToRoute("dashboard", { slug: memberWorkspaces[0].slug })
  }

  return redirect("/access-denied")
}
