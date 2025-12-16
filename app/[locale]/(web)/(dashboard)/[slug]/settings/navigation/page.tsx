import { Metadata } from "next"
import { HydrateClient, trpc } from "@/trpc/server"

import { ROUTES } from "@/lib/routes"
import { SettingsWrapper } from "@/components/layout/settings-wrapper"
import { WorkspaceNavigationSettingsClient } from "@/components/workspace/workspace-navigation-settings-client"

export const metadata: Metadata = ROUTES["settings-navigation"].metadata
export const dynamic = "force-dynamic"

type NavigationSettingsPageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function NavigationSettingsPage({ params }: NavigationSettingsPageProps) {
  const { slug } = await params

  void trpc.workspaces.getOne.prefetch({ slug })
  void trpc.workspaces.getNavigationSettings.prefetch({ slug })

  return (
    <HydrateClient>
      <SettingsWrapper
        title="Navigation Settings"
        description="Configure which menu items each role can see when viewing events"
      >
        <WorkspaceNavigationSettingsClient slug={slug} />
      </SettingsWrapper>
    </HydrateClient>
  )
}
