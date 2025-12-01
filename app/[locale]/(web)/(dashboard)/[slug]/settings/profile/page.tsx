import { Metadata } from "next"
import { HydrateClient, trpc } from "@/trpc/server"

import { ROUTES } from "@/lib/routes"
import { SettingsWrapper } from "@/components/layout/settings-wrapper"
import { ProfileCard } from "@/components/profile/profile-card"
import { ProfileDangerZone } from "@/components/profile/profile-danger-zone"

export const metadata: Metadata = ROUTES["settings-profile"].metadata
export const dynamic = "force-dynamic"

export default async function ProfileSettingsPage() {
  void trpc.users.getOne.prefetch()

  return (
    <HydrateClient>
      <SettingsWrapper title="Profile" description="Manage your profile settings" className="pb-32">
        <ProfileCard />
        <ProfileDangerZone />
      </SettingsWrapper>
    </HydrateClient>
  )
}
