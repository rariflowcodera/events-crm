"use client"

import { notFound } from "next/navigation"

import { trpc } from "@/trpc/client"
import { PagePanel } from "@/components/global/page-panel"
import { GuestDetailContent } from "@/components/guests/guest-detail-content"
import { Skeleton } from "@/components/ui/skeleton"
import { createRoute } from "@/lib/routes"

interface GuestDetailPageClientProps {
  workspaceSlug: string
  eventSlug: string
  guestId: string
  initialEditMode?: boolean
}

export function GuestDetailPageClient({
  workspaceSlug,
  eventSlug,
  guestId,
  initialEditMode = false,
}: GuestDetailPageClientProps) {
  // Fetch guest data
  const { data: guest, isLoading: isLoadingGuest } = trpc.guests.getOne.useQuery(
    { guestId },
    { enabled: !!guestId }
  )

  // Fetch event data for custom domain
  const { data: event, isLoading: isLoadingEvent } = trpc.events.getBySlug.useQuery(
    { workspaceSlug, eventSlug },
    { enabled: !!workspaceSlug && !!eventSlug }
  )

  // Fetch categories (needs eventId from event)
  const { data: categoriesData } = trpc.guestCategories.getMany.useQuery(
    { eventId: event?.id ?? "" },
    { enabled: !!event?.id }
  )

  const isLoading = isLoadingGuest || isLoadingEvent

  // Fallback URL for back navigation - include tab=guests to return to Guests tab
  const backHref = createRoute("event-detail", { slug: workspaceSlug, eventSlug }).href + "?tab=guests"

  if (isLoading) {
    return (
      <PagePanel
        title="Loading..."
        backHref={backHref}
      >
        <GuestDetailSkeleton />
      </PagePanel>
    )
  }

  if (!guest || !event) {
    notFound()
  }

  const guestName = `${guest.firstName} ${guest.lastName}`

  return (
    <PagePanel
      title={guestName}
      description={guest.email || undefined}
      backHref={backHref}
    >
      <GuestDetailContent
        guest={guest}
        categories={categoriesData || []}
        eventId={event.id}
        event={{
          customDomain: event.customDomain,
          customDomainVerified: event.customDomainVerified,
        }}
        workspaceSlug={workspaceSlug}
        initialEditMode={initialEditMode}
      />
    </PagePanel>
  )
}

function GuestDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-20" />
      </div>

      {/* RSVP Link skeleton */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
    </div>
  )
}
