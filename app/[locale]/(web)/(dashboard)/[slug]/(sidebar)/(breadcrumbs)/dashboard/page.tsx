import { Metadata } from "next"

import { ROUTES } from "@/lib/routes"
import { HydrateClient, trpc } from "@/trpc/server"
import { SectionWrapper } from "@/components/layout/section-wrapper"
import { EventsClient } from "@/components/events/events-client"

export const metadata: Metadata = ROUTES.dashboard.metadata
export const dynamic = "force-dynamic"

type DashboardPageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { slug } = await params
  void trpc.events.getMany.prefetch({ workspaceSlug: slug })
  void trpc.events.getWorkspaceStats.prefetch({ workspaceSlug: slug })

  return (
    <HydrateClient>
      <SectionWrapper>
        <EventsClient slug={slug} />
      </SectionWrapper>
    </HydrateClient>
  )
}
