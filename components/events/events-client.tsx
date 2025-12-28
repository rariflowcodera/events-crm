"use client"

import { Suspense, useState, useCallback } from "react"
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
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  return (
    <div className="space-y-6">
      <EventsHeader
        slug={slug}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />
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
          <EventsListSuspense slug={slug} searchQuery={searchQuery} />
        </ErrorBoundary>
      </Suspense>
    </div>
  )
}

interface EventsListSuspenseProps {
  slug: string
  searchQuery: string
}

function EventsListSuspense({ slug, searchQuery }: EventsListSuspenseProps) {
  const [events] = trpc.events.getMany.useSuspenseQuery({ workspaceSlug: slug })

  const filteredEvents = events.filter((event) =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return <EventsList events={filteredEvents} slug={slug} />
}
