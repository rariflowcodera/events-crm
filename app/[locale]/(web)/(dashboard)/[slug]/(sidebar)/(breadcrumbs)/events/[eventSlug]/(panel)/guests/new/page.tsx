import { Metadata } from "next"

import { HydrateClient, trpc } from "@/trpc/server"
import { ROUTES } from "@/lib/routes"
import { AddGuestPageClient } from "./client"

export const metadata: Metadata = ROUTES["guest-new"].metadata
export const dynamic = "force-dynamic"

type AddGuestPageProps = {
  params: Promise<{
    slug: string
    eventSlug: string
  }>
}

export default async function AddGuestPage({ params }: AddGuestPageProps) {
  const { slug, eventSlug } = await params

  // Prefetch event (categories are fetched client-side after we have eventId)
  void trpc.events.getBySlug.prefetch({ workspaceSlug: slug, eventSlug })

  return (
    <HydrateClient>
      <AddGuestPageClient workspaceSlug={slug} eventSlug={eventSlug} />
    </HydrateClient>
  )
}
