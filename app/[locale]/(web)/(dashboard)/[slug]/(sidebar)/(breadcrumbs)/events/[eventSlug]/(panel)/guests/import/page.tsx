import { Metadata } from "next"

import { HydrateClient, trpc } from "@/trpc/server"
import { ROUTES } from "@/lib/routes"
import { ImportGuestsPageClient } from "./client"

export const metadata: Metadata = ROUTES["guest-import"].metadata
export const dynamic = "force-dynamic"

type ImportGuestsPageProps = {
  params: Promise<{
    slug: string
    eventSlug: string
  }>
}

export default async function ImportGuestsPage({ params }: ImportGuestsPageProps) {
  const { slug, eventSlug } = await params

  // Prefetch event (categories are fetched client-side after we have eventId)
  void trpc.events.getBySlug.prefetch({ workspaceSlug: slug, eventSlug })

  return (
    <HydrateClient>
      <ImportGuestsPageClient workspaceSlug={slug} eventSlug={eventSlug} />
    </HydrateClient>
  )
}
