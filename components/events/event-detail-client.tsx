"use client"

import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { notFound } from "next/navigation"

import { trpc } from "@/trpc/client"
import { Alert } from "@/components/global/alert"
import { EventDetailSkeleton } from "@/components/events/event-detail-skeleton"
import { EventHeader } from "@/components/events/event-header"
import { EventTabs } from "@/components/events/event-tabs"

interface EventDetailClientProps {
  workspaceSlug: string
  eventSlug: string
}

export function EventDetailClient({ workspaceSlug, eventSlug }: EventDetailClientProps) {
  return (
    <Suspense fallback={<EventDetailSkeleton />}>
      <ErrorBoundary
        fallbackRender={({ error }) => (
          <Alert
            variant="error"
            title={`Failed to load event: ${error.message}`}
            icon="alertTriangle"
          />
        )}
      >
        <EventDetailSuspense workspaceSlug={workspaceSlug} eventSlug={eventSlug} />
      </ErrorBoundary>
    </Suspense>
  )
}

function EventDetailSuspense({ workspaceSlug, eventSlug }: EventDetailClientProps) {
  const [event] = trpc.events.getBySlug.useSuspenseQuery({
    workspaceSlug,
    eventSlug,
  })

  if (!event) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <EventHeader event={event} workspaceSlug={workspaceSlug} />
      <EventTabs event={event} workspaceSlug={workspaceSlug} />
    </div>
  )
}
