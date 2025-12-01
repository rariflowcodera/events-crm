import { Suspense } from "react"
import { Metadata } from "next"
import { getCurrentUser } from "@/server/queries/auth-queries"

import { ROUTES } from "@/lib/routes"
import { SignInForm } from "@/components/forms/sign-in-form"

export const metadata: Metadata = ROUTES["sign-in"].metadata

export default async function SignInPage() {
  const { user } = await getCurrentUser()

  return (
    <Suspense>
      <SignInForm isLoggedIn={!!user} />
    </Suspense>
  )
}
