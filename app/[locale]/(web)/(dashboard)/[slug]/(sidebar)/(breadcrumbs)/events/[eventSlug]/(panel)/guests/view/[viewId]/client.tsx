"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { notFound } from "next/navigation"
import { useTranslations } from "next-intl"
import { Search, X } from "lucide-react"

import { VIEW_COLORS, type ViewColor } from "@/server/db/schemas"
import { trpc } from "@/trpc/client"
import { PagePanel } from "@/components/global/page-panel"
import { GuestsDataTable } from "@/components/guests/guests-data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createRoute } from "@/lib/routes"
import { PERMISSIONS } from "@/lib/permissions"
import { usePermissions } from "@/hooks/use-permissions"
import { getCountryName } from "@/lib/data/countries"
import { syncViewConfigColumns, type GuestListViewConfig } from "@/lib/guest-columns"

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

  // Local search state with debouncing
  const [localSearchQuery, setLocalSearchQuery] = useState("")

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

  // Sync view config to ensure columns have correct widths from GUEST_COLUMNS
  const syncedViewConfig = useMemo(() => {
    if (!view?.config) return null
    return syncViewConfigColumns(view.config as GuestListViewConfig)
  }, [view?.config])

  // Use local config if modified, otherwise use synced view config
  const activeConfig = localViewConfig ?? syncedViewConfig

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

  // Debounce search to update viewConfig.filters.search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!syncedViewConfig) return

      const baseConfig = localViewConfig ?? syncedViewConfig
      const currentSearch = baseConfig.filters?.search || ""

      // Only update if search actually changed
      if (localSearchQuery !== currentSearch) {
        setLocalViewConfig({
          ...baseConfig,
          filters: {
            ...baseConfig.filters,
            search: localSearchQuery || undefined,
          },
        })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [localSearchQuery, syncedViewConfig, localViewConfig])

  // View config change handler
  const handleViewConfigChange = useCallback((config: GuestListViewConfig) => {
    setLocalViewConfig(config)
  }, [])

  // Guests array (derived from query data)
  const guests = guestsData?.guests ?? []

  // Compute filter options from event and guest data
  // NOTE: This must be before early returns to maintain hook order
  const filterOptions = useMemo(() => {
    // Categories from event
    const categories = (event?.guestCategories ?? []).map((cat) => ({
      value: cat.id,
      label: cat.name,
      color: cat.color ?? undefined,
    }))

    // Countries from guest data
    const countrySet = new Set<string>()
    guests.forEach((g) => {
      if (g.country) countrySet.add(g.country)
    })
    const countries = Array.from(countrySet)
      .map((code) => ({
        code,
        name: getCountryName(code) || code,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    // Tags from guest data
    const tagSet = new Set<string>()
    guests.forEach((g) => {
      g.tags?.forEach((tag) => tagSet.add(tag))
    })
    const tags = Array.from(tagSet)
      .sort()
      .map((tag) => ({ value: tag, label: tag }))

    // Last email template names from guest data
    const templateNameSet = new Set<string>()
    guests.forEach((g) => {
      if (g.lastEmailTemplateName) templateNameSet.add(g.lastEmailTemplateName)
    })
    const lastEmailTemplateNames = Array.from(templateNameSet)
      .sort()
      .map((name) => ({ value: name, label: name }))

    return {
      categories,
      countries,
      tags,
      lastEmailTemplateNames,
    }
  }, [event?.guestCategories, guests])

  // Fallback URL for back navigation
  const backHref = createRoute("event-detail", { slug: workspaceSlug, eventSlug }).href + "?tab=guests"

  // Only show full skeleton on initial load (when view/event not yet loaded)
  if (isLoadingView || isLoadingEvent) {
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

  const getGuestDetailHref = (guestId: string) =>
    `/${workspaceSlug}/events/${eventSlug}/guests/${guestId}?fromView=${viewId}`

  return (
    <PagePanel
      title={view.name}
      description={view.description || undefined}
      noScroll
      hideNavigation
    >
      <div className="flex flex-col h-full">
        {/* View info header */}
        <div className="mb-4 flex items-center justify-between gap-4">
          {/* Left: Count */}
          <div className="flex items-center gap-2">
            <span className={`size-3 rounded-full ${colorConfig.dot}`} />
            <span className="text-muted-foreground text-sm">
              {guests.length} {t("guest.guests").toLowerCase()}
            </span>
          </div>

          {/* Right: Search */}
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              placeholder="Search guests..."
              className="pl-9 h-8"
            />
            {localSearchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-5 w-5 -translate-y-1/2 p-0"
                onClick={() => setLocalSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Guest table with view configuration */}
        <div className="flex-1 min-h-0">
          {isLoadingGuests ? (
            <GuestTableSkeleton />
          ) : (
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
              viewConfig={(activeConfig ?? view.config) as GuestListViewConfig}
              onViewConfigChange={handleViewConfigChange}
              fillHeight
              canViewDetails={canViewDetails}
              filterOptions={filterOptions}
            />
          )}
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
      <GuestTableSkeleton />
    </div>
  )
}

function GuestTableSkeleton() {
  return (
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
  )
}
