import { Metadata } from "next"
import { RedirectType } from "next/navigation"
import { getCurrentUser } from "@/server/queries/auth-queries"

import { createRoute, redirectToRoute, ROUTES } from "@/lib/routes"
import { SignOutButton } from "@/components/buttons/sign-out-button"

export const metadata: Metadata = ROUTES["sign-out"].metadata

export default async function AuthSignOutPage() {
  const { user } = await getCurrentUser()

  if (!user) {
    return redirectToRoute("sign-in", undefined, RedirectType.replace)
  }

  return <SignOutButton callbackUrl={createRoute("sign-in").href} size={"lg"} />
}
