import { HydrateClient, trpc } from "@/trpc/server"

import { SettingsWrapper } from "@/components/layout/settings-wrapper"
import { WorkspacesGrid } from "@/components/workspace/workspaces-grid"

export default async function WorkspacesPage() {
  void trpc.workspaces.getMany.prefetch()

  return (
    <HydrateClient>
      <SettingsWrapper title="Workspaces" description="Manage your workspaces">
        <WorkspacesGrid />
      </SettingsWrapper>
    </HydrateClient>
  )
}
