"use client"

import { useState, useCallback } from "react"
import { notFound } from "next/navigation"
import { useTranslations } from "next-intl"

import { VIEW_COLORS, type ViewColor } from "@/server/db/schemas"
import { trpc } from "@/trpc/client"
import { PagePanel } from "@/components/global/page-panel"
import { GuestsDataTable } from "@/components/guests/guests-data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { createRoute } from "@/lib/routes"
import { PERMISSIONS } from "@/lib/permissions"
import { usePermissions } from "@/hooks/use-permissions"
import type { GuestListViewConfig } from "@/lib/guest-columns"

interface GuestListViewPageClientProps {
  workspaceSlug: string
  eventSlug: string
  viewId: string
}

export function GuestListViewPageClient({
  workspaceSlug,
  eventSlug,
  viewId,
}: GuestListViewPageClientProps) {
  const t = useTranslations()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Check if user can view guest details
  const { can } = usePermissions(workspaceSlug)
  const canViewDetails = can(PERMISSIONS.VIEW_GUEST_DETAILS)

  // Local view config state (allows users to modify filters without saving)
  const [localViewConfig, setLocalViewConfig] = useState<GuestListViewConfig | null>(null)

  // Fetch the view
  const { data: view, isLoading: isLoadingView } = trpc.guestListViews.getOne.useQuery(
    { viewId },
    { enabled: !!viewId }
  )

  // Fetch event data
  const { data: event, isLoading: isLoadingEvent } = trpc.events.getBySlug.useQuery(
    { workspaceSlug, eventSlug },
    { enabled: !!workspaceSlug && !!eventSlug }
  )

  // Use local config if modified, otherwise use view config
  const activeConfig = localViewConfig ?? view?.config

  // Fetch guests with filters from view config
  const { data: guestsData, isLoading: isLoadingGuests } = trpc.guests.getMany.useQuery(
    {
      eventId: event?.id ?? "",
      filters: activeConfig?.filters,
      sorting: activeConfig?.sorting,
      limit: 100,
    },
    { enabled: !!event?.id }
  )

  // View config change handler
  const handleViewConfigChange = useCallback((config: GuestListViewConfig) => {
    setLocalViewConfig(config)
  }, [])

  const isLoading = isLoadingView || isLoadingEvent || isLoadingGuests

  // Fallback URL for back navigation
  const backHref = createRoute("event-detail", { slug: workspaceSlug, eventSlug }).href + "?tab=guests"

  if (isLoading) {
    return (
      <PagePanel
        title={t("common.loading")}
      >
        <GuestListViewSkeleton />
      </PagePanel>
    )
  }

  if (!view || !event) {
    notFound()
  }

  const colorConfig = VIEW_COLORS[view.color as ViewColor] ?? VIEW_COLORS.gray
  const guests = guestsData?.guests ?? []

  const getGuestDetailHref = (guestId: string) =>
    `/${workspaceSlug}/events/${eventSlug}/guests/${guestId}?fromView=${viewId}`

  // Check if filters are modified from saved view
  const hasUnsavedChanges = localViewConfig !== null

  return (
    <PagePanel
      title={view.name}
      description={view.description || undefined}
      noScroll
    >
      <div className="flex flex-col h-full">
        {/* View info header */}
        <div className="mb-4 flex items-center gap-2">
          <span className={`size-3 rounded-full ${colorConfig.dot}`} />
          <span className="text-muted-foreground text-sm">
            {guests.length} {t("guest.guests").toLowerCase()}
            {hasUnsavedChanges && (
              <span className="ml-2 text-yellow-600">(unsaved changes)</span>
            )}
          </span>
        </div>

        {/* Guest table with view configuration */}
        <div className="flex-1 min-h-0">
          <GuestsDataTable
            guests={guests as any}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            getGuestDetailHref={getGuestDetailHref}
            eventId={event.id}
            event={{
              customDomain: event.customDomain,
              customDomainVerified: event.customDomainVerified,
            }}
            workspaceSlug={workspaceSlug}
            viewConfig={activeConfig ?? view.config}
            onViewConfigChange={handleViewConfigChange}
            fillHeight
            canViewDetails={canViewDetails}
          />
        </div>
      </div>
    </PagePanel>
  )
}

function GuestListViewSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="size-3 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-2">
        <div className="flex gap-4 border-b pb-2">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
