"use client"

import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { notFound, useSearchParams } from "next/navigation"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { trpc } from "@/trpc/client"
import { Alert } from "@/components/global/alert"
import { EventDetailSkeleton } from "@/components/events/event-detail-skeleton"
import { EventHeader } from "@/components/events/event-header"
import { EventTabs } from "@/components/events/event-tabs"
import { Icons } from "@/components/global/icons"
import { createRoute } from "@/lib/routes"
import { SectionWrapper } from "@/components/layout/section-wrapper"

interface EventDetailClientProps {
  workspaceSlug: string
  eventSlug: string
  fullWidth?: boolean
}

export function EventDetailClient({ workspaceSlug, eventSlug, fullWidth = false }: EventDetailClientProps) {
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
        <EventDetailSuspense workspaceSlug={workspaceSlug} eventSlug={eventSlug} fullWidth={fullWidth} />
      </ErrorBoundary>
    </Suspense>
  )
}

function EventDetailSuspense({ workspaceSlug, eventSlug, fullWidth }: EventDetailClientProps) {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") || "overview"
  const isGuestsTab = activeTab === "guests"

  const [event] = trpc.events.getBySlug.useSuspenseQuery({
    workspaceSlug,
    eventSlug,
  })

  if (!event) {
    notFound()
  }

  // For guests tab with fullWidth, use edge-to-edge layout
  if (isGuestsTab && fullWidth) {
    return (
      <div className="flex h-full flex-col px-4 py-2">
        {/* Simple back link for guests tab */}
        <Link
          href={createRoute("events", { slug: workspaceSlug }).href}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors mb-4"
        >
          <Icons.arrowLeft className="h-4 w-4" />
          <span>Events</span>
        </Link>
        <div className="flex-1 flex flex-col min-h-0">
          <EventTabs event={event} workspaceSlug={workspaceSlug} fullHeight />
        </div>
      </div>
    )
  }

  // For guests tab without fullWidth prop (fallback)
  if (isGuestsTab) {
    return (
      <SectionWrapper className="max-w-6xl">
        <div className="space-y-4">
          <Link
            href={createRoute("events", { slug: workspaceSlug }).href}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
          >
            <Icons.arrowLeft className="h-4 w-4" />
            <span>Events</span>
          </Link>
          <EventTabs event={event} workspaceSlug={workspaceSlug} />
        </div>
      </SectionWrapper>
    )
  }

  // Default layout for other tabs
  return (
    <SectionWrapper className="max-w-6xl">
      <div className="space-y-6">
        <EventHeader event={event} workspaceSlug={workspaceSlug} />
        <EventTabs event={event} workspaceSlug={workspaceSlug} />
      </div>
    </SectionWrapper>
  )
}
