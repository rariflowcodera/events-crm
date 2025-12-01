"use client"

import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"

import { trpc } from "@/trpc/client"
import { Alert } from "@/components/global/alert"
import { EventsList } from "@/components/events/events-list"
import { EventsListSkeleton } from "@/components/events/events-list-skeleton"
import { EventsHeader } from "@/components/events/events-header"

interface EventsClientProps {
  slug: string
}

export function EventsClient({ slug }: EventsClientProps) {
  return (
    <div className="space-y-6">
      <EventsHeader slug={slug} />
      <Suspense fallback={<EventsListSkeleton />}>
        <ErrorBoundary
          fallbackRender={({ error }) => (
            <Alert
              variant="error"
              title={`Failed to load events: ${error.message}`}
              icon="alertTriangle"
            />
          )}
        >
          <EventsListSuspense slug={slug} />
        </ErrorBoundary>
      </Suspense>
    </div>
  )
}

function EventsListSuspense({ slug }: EventsClientProps) {
  const [events] = trpc.events.getMany.useSuspenseQuery({ workspaceSlug: slug })

  return <EventsList events={events} slug={slug} />
}
