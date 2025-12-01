import { Metadata } from "next"
import { getCurrentUser } from "@/server/queries/auth-queries"

import { redirectToRoute, ROUTES } from "@/lib/routes"
import { PersonalizationForm } from "@/components/forms/personalization-form"
import { SettingsWrapper, SettingsWrapperCard } from "@/components/layout/settings-wrapper"

export const metadata: Metadata = ROUTES["settings-personalization"].metadata

export default async function ProfileProfilePersonalizationPage() {
  const { user } = await getCurrentUser()

  if (!user) {
    return redirectToRoute("sign-in")
  }

  return (
    <SettingsWrapper title="Personalization" description="Manage your personalization settings">
      <SettingsWrapperCard>
        <PersonalizationForm />
      </SettingsWrapperCard>
    </SettingsWrapper>
  )
}
