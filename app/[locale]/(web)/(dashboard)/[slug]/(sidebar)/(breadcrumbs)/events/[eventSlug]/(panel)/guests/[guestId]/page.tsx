import { Metadata } from "next"
import { notFound } from "next/navigation"

import { HydrateClient, trpc } from "@/trpc/server"
import { ROUTES } from "@/lib/routes"
import { GuestDetailPageClient } from "./client"

export const metadata: Metadata = ROUTES["guest-detail"].metadata
export const dynamic = "force-dynamic"

type GuestDetailPageProps = {
  params: Promise<{
    slug: string
    eventSlug: string
    guestId: string
  }>
  searchParams: Promise<{
    edit?: string
    fromView?: string
  }>
}

export default async function GuestDetailPage({ params, searchParams }: GuestDetailPageProps) {
  const { slug, eventSlug, guestId } = await params
  const { edit, fromView } = await searchParams
  const isEditMode = edit === "true"

  // Prefetch guest and event data (categories are fetched client-side after we have eventId)
  void trpc.guests.getOne.prefetch({ guestId })
  void trpc.events.getBySlug.prefetch({ workspaceSlug: slug, eventSlug })

  return (
    <HydrateClient>
      <GuestDetailPageClient
        workspaceSlug={slug}
        eventSlug={eventSlug}
        guestId={guestId}
        initialEditMode={isEditMode}
        fromView={fromView}
      />
    </HydrateClient>
  )
}
