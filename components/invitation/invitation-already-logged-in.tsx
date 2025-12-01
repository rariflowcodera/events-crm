"use client"

import { UserType } from "@/server/db/schema-types"

import { SignOutButton } from "@/components/buttons/sign-out-button"
import { RestrictedContent } from "@/components/global/restricted-content"

type InvitationAlreadyLoggedInProps = {
  callbackUrl: string
  email: UserType["email"]
}

export function InvitationAlreadyLoggedIn({ callbackUrl, email }: InvitationAlreadyLoggedInProps) {
  return (
    <RestrictedContent
      title="This invitation is not for you"
      description={`It seems like you are already logged in: ${email}
          Please sign out to continue.
          `}
      cta={<SignOutButton className="mx-auto w-32" callbackUrl={callbackUrl} />}
    />
  )
}
