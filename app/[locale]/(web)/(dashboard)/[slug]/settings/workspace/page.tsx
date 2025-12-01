import { Metadata } from "next"
import { HydrateClient, trpc } from "@/trpc/server"

import { ROUTES } from "@/lib/routes"
import { SettingsWrapper } from "@/components/layout/settings-wrapper"
import { WorkspaceSettingsClient } from "@/components/workspace/workspace-settings-client"

export const metadata: Metadata = ROUTES["settings-workspace"].metadata
export const dynamic = "force-dynamic"

type WorkspaceSettingsPageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function WorkspaceSettingsPage({ params }: WorkspaceSettingsPageProps) {
  const { slug } = await params

  void trpc.workspaces.getOne.prefetch({ slug })

  return (
    <HydrateClient>
      <SettingsWrapper title="Workspace" description="Manage your workspace settings and members">
        <WorkspaceSettingsClient slug={slug} />
      </SettingsWrapper>
    </HydrateClient>
  )
}
