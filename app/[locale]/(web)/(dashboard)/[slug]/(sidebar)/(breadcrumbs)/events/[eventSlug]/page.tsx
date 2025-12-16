import { Metadata } from "next"
import { notFound } from "next/navigation"

import { HydrateClient, trpc } from "@/trpc/server"
import { ROUTES } from "@/lib/routes"
import { EventDetailClient } from "@/components/events/event-detail-client"

export const metadata: Metadata = ROUTES["event-detail"].metadata
export const dynamic = "force-dynamic"

type EventDetailPageProps = {
  params: Promise<{ slug: string; eventSlug: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function EventDetailPage({ params, searchParams }: EventDetailPageProps) {
  const { slug, eventSlug } = await params
  const { tab } = await searchParams
  const isGuestsTab = tab === "guests"

  // Prefetch event and sidebar navigation data
  void trpc.events.getBySlug.prefetch({ workspaceSlug: slug, eventSlug })
  void trpc.events.getMany.prefetch({ workspaceSlug: slug })
  void trpc.workspaces.getNavigationSettings.prefetch({ slug })

  // For guests tab, use full-width layout without SectionWrapper constraints
  // For other tabs, use centered constrained layout
  return (
    <HydrateClient>
      <EventDetailClient
        workspaceSlug={slug}
        eventSlug={eventSlug}
        fullWidth={isGuestsTab}
      />
    </HydrateClient>
  )
}
