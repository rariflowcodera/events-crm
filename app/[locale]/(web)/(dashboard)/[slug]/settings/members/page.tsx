import { Metadata } from "next"
import { HydrateClient, trpc } from "@/trpc/server"

import { ROUTES } from "@/lib/routes"
import { SettingsWrapper } from "@/components/layout/settings-wrapper"
import { MembersClient } from "@/components/members/members-client"

export const metadata: Metadata = ROUTES["settings-members"].metadata
export const dynamic = "force-dynamic"

type WorkspaceMembersPageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function WorkspaceMembersPage({ params }: WorkspaceMembersPageProps) {
  const { slug } = await params

  void trpc.invitations.getMany.prefetch({ slug })
  void trpc.members.getMany.prefetch({ slug })

  return (
    <HydrateClient>
      <SettingsWrapper
        title="Members"
        description="Manage your workspace members"
        className="pb-28"
      >
        <MembersClient slug={slug} />
      </SettingsWrapper>
    </HydrateClient>
  )
}
