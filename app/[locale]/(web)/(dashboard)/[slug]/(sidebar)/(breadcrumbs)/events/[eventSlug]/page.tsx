import { Metadata } from "next"
import { notFound } from "next/navigation"

import { HydrateClient, trpc } from "@/trpc/server"
import { ROUTES } from "@/lib/routes"
import { SectionWrapper } from "@/components/layout/section-wrapper"
import { EventDetailClient } from "@/components/events/event-detail-client"

export const metadata: Metadata = ROUTES["event-detail"].metadata
export const dynamic = "force-dynamic"

type EventDetailPageProps = {
  params: Promise<{ slug: string; eventSlug: string }>
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug, eventSlug } = await params

  // Prefetch the event data
  void trpc.events.getBySlug.prefetch({ workspaceSlug: slug, eventSlug })

  return (
    <HydrateClient>
      <SectionWrapper className="max-w-6xl">
        <EventDetailClient workspaceSlug={slug} eventSlug={eventSlug} />
      </SectionWrapper>
    </HydrateClient>
  )
}
