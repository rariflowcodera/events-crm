import { Metadata } from "next"

import { ROUTES } from "@/lib/routes"
import { HydrateClient, trpc } from "@/trpc/server"
import { SectionWrapper } from "@/components/layout/section-wrapper"
import { WorkspaceGuestsClient } from "@/components/guests/workspace-guests-client"

export const metadata: Metadata = ROUTES.guests.metadata
export const dynamic = "force-dynamic"

type WorkspaceGuestsPageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function WorkspaceGuestsPage({ params }: WorkspaceGuestsPageProps) {
  const { slug } = await params
  void trpc.guests.getWorkspaceGuests.prefetch({ workspaceSlug: slug })
  void trpc.events.getMany.prefetch({ workspaceSlug: slug })

  return (
    <HydrateClient>
      <SectionWrapper>
        <WorkspaceGuestsClient slug={slug} />
      </SectionWrapper>
    </HydrateClient>
  )
}
