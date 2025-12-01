import { Metadata } from "next"

import { HydrateClient, trpc } from "@/trpc/server"
import { ROUTES } from "@/lib/routes"
import { SectionWrapper } from "@/components/layout/section-wrapper"
import { EventsClient } from "@/components/events/events-client"

export const metadata: Metadata = ROUTES.events.metadata
export const dynamic = "force-dynamic"

type EventsPageProps = {
  params: Promise<{ slug: string }>
}

export default async function EventsPage({ params }: EventsPageProps) {
  const { slug } = await params
  void trpc.events.getMany.prefetch({ workspaceSlug: slug })

  return (
    <HydrateClient>
      <SectionWrapper>
        <EventsClient slug={slug} />
      </SectionWrapper>
    </HydrateClient>
  )
}
