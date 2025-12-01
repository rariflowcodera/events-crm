import { Suspense } from "react"
import { Metadata } from "next"
import { RedirectType } from "next/navigation"
import { acceptInvitation, getInvitePageQuery } from "@/server/queries/invitations"

import { redirectToRoute, ROUTES } from "@/lib/routes"
import { InvitationAlreadyLoggedIn } from "@/components/invitation/invitation-already-logged-in"
import { InvitationExpired } from "@/components/invitation/invitation-expired"
import { InvitationNotFound } from "@/components/invitation/invitation-not-found"
import { InvitationSignIn } from "@/components/invitation/invitation-sign-in"

export const metadata: Metadata = ROUTES.invite.metadata

type InviteKeyPageProps = {
  params: Promise<{
    token: string
  }>
}

export default async function InviteKeyPage(props: InviteKeyPageProps) {
  const params = await props.params

  const { token } = params

  if (!token) {
    return redirectToRoute("callback", undefined, RedirectType.replace)
  }

  const result = await getInvitePageQuery({ token })
  const callbackUrl = `/invite/${token}?from=invitation`

  switch (result.status) {
    case "not_found":
      return <InvitationNotFound />

    case "expired":
      return <InvitationExpired />

    case "requires_signin":
      return (
        <Suspense>
          <InvitationSignIn
            email={result.invitation.email}
            callbackUrl={callbackUrl}
            workspace={result.workspace}
          />
        </Suspense>
      )

    case "wrong_user":
      return <InvitationAlreadyLoggedIn callbackUrl={callbackUrl} email={result.user.email!} />

    case "ready": {
      await acceptInvitation({
        invitationId: result.invitation.id,
        userId: result.dbUser.id,
        workspaceId: result.invitation.workspaceId,
        role: result.invitation.role,
      })

      return redirectToRoute("dashboard", { slug: result.workspace.slug })
    }
  }
}
