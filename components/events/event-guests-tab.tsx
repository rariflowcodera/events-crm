"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useTranslations } from "next-intl"

import { useGuests } from "@/trpc/hooks/guests-hooks"
import {
  useGuestListViews,
  useUpdateGuestListView,
  useDefaultGuestListView,
  useGetOrCreateAllGuestsView,
  useSetDefaultGuestListView,
} from "@/trpc/hooks/guest-list-views-hooks"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/permissions"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyPlaceholder } from "@/components/global/empty-placeholder"
import { GuestsDataTable } from "@/components/guests/guests-data-table"
import { GuestsToolbar } from "@/components/guests/guests-toolbar"
import { BulkDeleteDialog } from "@/components/guests/bulk-delete-dialog"
import { BulkSendEmailDialog } from "@/components/guests/bulk-send-email-dialog"
import { SendEmailDialog } from "@/components/guests/send-email-dialog"
import { EditViewDialog, ManageViewsDialog } from "@/components/guests/view-manager"
import { GetFormLinkDialog } from "@/components/guests/get-form-link-dialog"
import { VappLinkDialog } from "@/components/guests/vapp-link-dialog"
import { GenerateEmailLinkDialog } from "@/components/guests/generate-email-link-dialog"
import type { EmailTemplateType } from "@/lib/schemas"
import { getCountryName } from "@/lib/data/countries"
import { createRoute } from "@/lib/routes"
import { exportGuestsToExcel } from "@/lib/export-guests"
import { getVappUrl, getFullRsvpUrl, getShortRsvpUrl } from "@/lib/rsvp-url"
import { toast } from "sonner"
import {
  DEFAULT_VIEW_CONFIG,
  syncViewConfigColumns,
  type GuestListViewConfig,
  type GuestListViewColumnConfig,
  type GuestListViewFilterConfig,
} from "@/lib/guest-columns"
import { Skeleton } from "@/components/ui/skeleton"

interface GuestCategory {
  id: string
  name: string
  code: string
  color: string | null
  sortOrder: number
}

interface Event {
  id: string
  name: string
  slug: string
  guestCategories: GuestCategory[]
  customDomain: string | null
  customDomainVerified: boolean | null
  settings?: {
    allowPlusOne?: boolean
    maxPlusOnes?: number
    requireApproval?: boolean
    sendReminders?: boolean
    reminderDays?: number[]
    vapp?: {
      enabled?: boolean
      venueCode?: string
      matchCode?: string
    }
  } | null
}

interface EventGuestsTabProps {
  event: Event
  workspaceSlug: string
  fullHeight?: boolean
}

export function EventGuestsTab({ event, workspaceSlug, fullHeight = false }: EventGuestsTabProps) {
  const t = useTranslations("guest")

  // Check if user can view guest details
  const { can } = usePermissions(workspaceSlug)
  const canViewDetails = can(PERMISSIONS.VIEW_GUEST_DETAILS)

  // State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [bulkEmailType, setBulkEmailType] = useState<EmailTemplateType | null>(null)
  const [isSendEmailDialogOpen, setIsSendEmailDialogOpen] = useState(false)
  const [isFormLinkDialogOpen, setIsFormLinkDialogOpen] = useState(false)
  const [isVappLinkDialogOpen, setIsVappLinkDialogOpen] = useState(false)
  const [isGenerateEmailLinkDialogOpen, setIsGenerateEmailLinkDialogOpen] = useState(false)
  const [viewConfig, setViewConfig] = useState<GuestListViewConfig>(DEFAULT_VIEW_CONFIG)
  const [showFilters, setShowFilters] = useState(false)

  // View management state
  const [currentViewId, setCurrentViewId] = useState<string | null>(null)
  const [savedViewConfig, setSavedViewConfig] = useState<GuestListViewConfig | null>(null)
  const [showEditViewDialog, setShowEditViewDialog] = useState(false)
  const [showManageViewsDialog, setShowManageViewsDialog] = useState(false)

  // Fetch available views
  const { data: views } = useGuestListViews(event.id)

  // Fetch default view
  const { data: defaultView, isLoading: isLoadingDefaultView } = useDefaultGuestListView(event.id)

  // Get or create "All Guests" system view
  const { mutateAsync: getOrCreateAllGuests } = useGetOrCreateAllGuestsView()

  // Update view mutation
  const { mutate: updateView, isPending: isUpdatingView } = useUpdateGuestListView()

  // Set default view mutation
  const { mutate: setDefaultView } = useSetDefaultGuestListView()

  // Compute hasUnsavedChanges
  const hasUnsavedChanges = useMemo(() => {
    if (!savedViewConfig) return false
    return JSON.stringify(viewConfig) !== JSON.stringify(savedViewConfig)
  }, [viewConfig, savedViewConfig])

  // Compute current view from views data
  const currentView = useMemo(() => {
    if (!currentViewId || !views) return null
    return views.find((v) => v.id === currentViewId) ?? null
  }, [currentViewId, views])

  // Load default view on mount
  useEffect(() => {
    // Wait until we know if there's a default view
    if (isLoadingDefaultView) return

    // If a view is already selected, don't override
    if (currentViewId) return

    const loadDefaultView = async () => {
      if (defaultView) {
        // Use existing default view
        const syncedConfig = syncViewConfigColumns(defaultView.config as GuestListViewConfig)
        setCurrentViewId(defaultView.id)
        setViewConfig(syncedConfig)
        setSavedViewConfig(syncedConfig)
      } else {
        // No default view exists, create "All Guests" system view
        try {
          const allGuestsView = await getOrCreateAllGuests({ eventId: event.id })
          const syncedConfig = syncViewConfigColumns(allGuestsView.config as GuestListViewConfig)
          setCurrentViewId(allGuestsView.id)
          setViewConfig(syncedConfig)
          setSavedViewConfig(syncedConfig)
        } catch {
          // Fallback to hardcoded default if creation fails
          setViewConfig(DEFAULT_VIEW_CONFIG)
        }
      }
    }

    loadDefaultView()
  }, [defaultView, isLoadingDefaultView, currentViewId, event.id, getOrCreateAllGuests])

  // View selection handler
  const handleViewSelect = useCallback(async (viewId: string | null) => {
    if (viewId === null) {
      // Get or create "All Guests" system view
      try {
        const allGuestsView = await getOrCreateAllGuests({ eventId: event.id })
        const syncedConfig = syncViewConfigColumns(allGuestsView.config as GuestListViewConfig)
        setCurrentViewId(allGuestsView.id)
        setViewConfig(syncedConfig)
        setSavedViewConfig(syncedConfig)
      } catch {
        // Fallback to hardcoded default
        setCurrentViewId(null)
        setViewConfig(DEFAULT_VIEW_CONFIG)
        setSavedViewConfig(null)
      }
    } else {
      // Find the selected view and apply its config
      const selectedView = views?.find((v) => v.id === viewId)
      if (selectedView) {
        const syncedConfig = syncViewConfigColumns(selectedView.config as GuestListViewConfig)
        setCurrentViewId(viewId)
        setViewConfig(syncedConfig)
        setSavedViewConfig(syncedConfig)
      }
    }
  }, [views, getOrCreateAllGuests, event.id])

  // Set default view handler
  const handleSetDefault = useCallback(() => {
    if (!currentViewId) return
    setDefaultView({ viewId: currentViewId })
  }, [currentViewId, setDefaultView])

  // Save current view handler
  const handleSaveView = useCallback(() => {
    if (!currentViewId) return
    updateView(
      { viewId: currentViewId, config: viewConfig },
      {
        onSuccess: () => {
          setSavedViewConfig(viewConfig)
        },
      }
    )
  }, [currentViewId, viewConfig, updateView])

  // Edit view handler
  const handleEditView = useCallback(() => {
    setShowEditViewDialog(true)
  }, [])

  // Manage views handler
  const handleManageViews = useCallback(() => {
    setShowManageViewsDialog(true)
  }, [])

  // Handle view deletion - reset to All Guests if current view was deleted
  const handleViewDeleted = useCallback(async (deletedViewId: string) => {
    if (currentViewId === deletedViewId) {
      // Current view was deleted, switch to All Guests
      try {
        const allGuestsView = await getOrCreateAllGuests({ eventId: event.id })
        const syncedConfig = syncViewConfigColumns(allGuestsView.config as GuestListViewConfig)
        setCurrentViewId(allGuestsView.id)
        setViewConfig(syncedConfig)
        setSavedViewConfig(syncedConfig)
      } catch {
        // Fallback to hardcoded default
        setCurrentViewId(null)
        setViewConfig(DEFAULT_VIEW_CONFIG)
        setSavedViewConfig(null)
      }
    }
    setShowEditViewDialog(false)
  }, [currentViewId, event.id, getOrCreateAllGuests])

  // Navigation hrefs
  const addGuestHref = createRoute("guest-new", { slug: workspaceSlug, eventSlug: event.slug }).href
  const importHref = createRoute("guest-import", { slug: workspaceSlug, eventSlug: event.slug }).href
  const getGuestDetailHref = useCallback(
    (guestId: string) => createRoute("guest-detail", { slug: workspaceSlug, eventSlug: event.slug, guestId }).href,
    [workspaceSlug, event.slug]
  )

  // Fetch guests with server-side filtering
  const { data, isLoading, error } = useGuests({
    eventId: event.id,
    filters: viewConfig.filters,
    sorting: viewConfig.sorting,
    limit: 100, // Get more guests since we're server-side filtering
  })
  const guests = data?.guests ?? []
  const totalGuests = data?.total ?? 0

  // Compute available countries from guest data (for country filter options)
  const availableCountries = useMemo(() => {
    if (!guests.length) return []

    const countrySet = new Set<string>()
    guests.forEach((guest) => {
      if (guest.country) {
        countrySet.add(guest.country)
      }
    })

    return Array.from(countrySet)
      .map((code) => ({
        code,
        name: getCountryName(code) || code,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [guests])

  // Update handlers
  const handleFiltersChange = useCallback((filters: GuestListViewFilterConfig) => {
    setViewConfig((prev) => ({ ...prev, filters }))
  }, [])

  const handleViewConfigChange = useCallback((config: GuestListViewConfig) => {
    setViewConfig(config)
  }, [])

  const handleColumnsChange = useCallback((columns: GuestListViewColumnConfig[]) => {
    setViewConfig((prev) => ({ ...prev, columns }))
  }, [])

  // Bulk action handlers
  const handleBulkAction = useCallback(
    (
      action:
        | "delete"
        | "send_invitation"
        | "send_email"
        | "get_form_link"
        | "get_vapp_link"
        | "generate_email_link"
        | "copy_rsvp_link"
        | "copy_short_rsvp_link"
    ) => {
      if (action === "delete") {
        setIsDeleteDialogOpen(true)
      } else if (action === "send_invitation") {
        setBulkEmailType("invitation")
      } else if (action === "send_email") {
        setIsSendEmailDialogOpen(true)
      } else if (action === "get_form_link") {
        setIsFormLinkDialogOpen(true)
      } else if (action === "get_vapp_link") {
        setIsVappLinkDialogOpen(true)
      } else if (action === "generate_email_link") {
        setIsGenerateEmailLinkDialogOpen(true)
      } else if (action === "copy_rsvp_link") {
        if (selectedIds.size === 1) {
          const selectedGuestId = Array.from(selectedIds)[0]
          const selectedGuest = guests.find((g) => g.id === selectedGuestId)
          if (selectedGuest) {
            const rsvpUrl = getFullRsvpUrl(event, selectedGuest as any)
            navigator.clipboard.writeText(rsvpUrl)
            toast.success("RSVP link copied to clipboard")
          }
        }
      } else if (action === "copy_short_rsvp_link") {
        if (selectedIds.size === 1) {
          const selectedGuestId = Array.from(selectedIds)[0]
          const selectedGuest = guests.find((g) => g.id === selectedGuestId) as any
          if (selectedGuest?.rsvpShortCode) {
            const shortUrl = getShortRsvpUrl(event, selectedGuest)
            if (shortUrl) {
              navigator.clipboard.writeText(shortUrl)
              toast.success("Short RSVP link copied to clipboard")
            }
          }
        }
      }
    },
    [selectedIds, guests, event]
  )

  const handleBulkDeleteSuccess = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleExport = useCallback(() => {
    // Cast guests to the expected type for export
    const guestsForExport = guests.map((guest) => ({
      ...guest,
      category: guest.category || { id: "", name: "", code: "", color: null },
    }))
    exportGuestsToExcel(guestsForExport as any, event.slug, event.name)
  }, [guests, event.slug, event.name])

  // Filter change handlers for toolbar (must be before early returns)
  const handleSearchChange = useCallback((query: string) => {
    handleFiltersChange({ ...viewConfig.filters, search: query || undefined })
  }, [viewConfig.filters, handleFiltersChange])

  const handleStatusFilterChange = useCallback((statuses: string[]) => {
    handleFiltersChange({ ...viewConfig.filters, status: statuses.length ? statuses : undefined })
  }, [viewConfig.filters, handleFiltersChange])

  const handleCategoryFilterChange = useCallback((categoryIds: string[]) => {
    handleFiltersChange({ ...viewConfig.filters, categoryIds: categoryIds.length ? categoryIds : undefined })
  }, [viewConfig.filters, handleFiltersChange])

  const handleCountryFilterChange = useCallback((countries: string[]) => {
    handleFiltersChange({ ...viewConfig.filters, countries: countries.length ? countries : undefined })
  }, [viewConfig.filters, handleFiltersChange])

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    const { filters } = viewConfig
    return !!(
      filters.search ||
      (filters.status && filters.status.length > 0) ||
      (filters.categoryIds && filters.categoryIds.length > 0) ||
      (filters.countries && filters.countries.length > 0) ||
      (filters.tags && filters.tags.length > 0)
    )
  }, [viewConfig.filters])

  // Check if selected guest has a short RSVP code (for showing the copy short link option)
  const hasShortRsvpCode = useMemo(() => {
    if (selectedIds.size !== 1) return false
    const selectedGuestId = Array.from(selectedIds)[0]
    const selectedGuest = guests.find((g) => g.id === selectedGuestId) as any
    return !!selectedGuest?.rsvpShortCode
  }, [selectedIds, guests])

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <EmptyPlaceholder>
            <EmptyPlaceholder.Icon name="alertTriangle" />
            <EmptyPlaceholder.Title>Failed to load guests</EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              {error.message}
            </EmptyPlaceholder.Description>
          </EmptyPlaceholder>
        </CardContent>
      </Card>
    )
  }

  const hasGuests = totalGuests > 0 || guests.length > 0

  return (
    <div className={fullHeight ? "flex flex-col h-full" : "space-y-4"}>
      <GuestsToolbar
        searchQuery={viewConfig.filters.search || ""}
        onSearchChange={handleSearchChange}
        statusFilter={(viewConfig.filters.status || []) as any}
        onStatusFilterChange={handleStatusFilterChange as any}
        categoryFilter={viewConfig.filters.categoryIds || []}
        onCategoryFilterChange={handleCategoryFilterChange}
        countryFilter={viewConfig.filters.countries || []}
        onCountryFilterChange={handleCountryFilterChange}
        availableCountries={availableCountries}
        categories={event.guestCategories}
        selectedCount={selectedIds.size}
        addGuestHref={addGuestHref}
        importHref={importHref}
        onBulkAction={handleBulkAction}
        onExport={handleExport}
        workspaceSlug={workspaceSlug}
        eventId={event.id}
        viewConfig={viewConfig}
        onColumnsChange={handleColumnsChange}
        currentViewId={currentViewId}
        currentViewIsSystem={currentView?.isSystem}
        hasUnsavedChanges={hasUnsavedChanges}
        onViewSelect={handleViewSelect}
        onSaveView={handleSaveView}
        onSetDefault={handleSetDefault}
        onEditView={handleEditView}
        onManageViews={handleManageViews}
        defaultViewId={defaultView?.id}
        totalGuests={totalGuests}
        filteredCount={hasActiveFilters ? guests.length : undefined}
        showFilters={showFilters}
        onShowFiltersChange={setShowFilters}
        vappEnabled={event.settings?.vapp?.enabled}
        hasShortRsvpCode={hasShortRsvpCode}
      />

      {isLoading ? (
        <GuestsTableSkeleton />
      ) : hasGuests || hasActiveFilters ? (
        <div className={fullHeight ? "flex-1 min-h-0 mt-4" : ""}>
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
            viewConfig={viewConfig}
            onViewConfigChange={handleViewConfigChange}
            totalGuests={totalGuests}
            fillHeight={fullHeight}
            canViewDetails={canViewDetails}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="py-10">
            <EmptyPlaceholder>
              <EmptyPlaceholder.Icon name="users" />
              <EmptyPlaceholder.Title>No guests yet</EmptyPlaceholder.Title>
              <EmptyPlaceholder.Description>
                Add your first guest manually or import from Excel.
              </EmptyPlaceholder.Description>
            </EmptyPlaceholder>
          </CardContent>
        </Card>
      )}

      {/* Bulk Delete Dialog */}
      <BulkDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        guestIds={Array.from(selectedIds)}
        eventId={event.id}
        onSuccess={handleBulkDeleteSuccess}
      />

      {/* Bulk Send Email Dialog (for Send Invitations) */}
      {bulkEmailType && (
        <BulkSendEmailDialog
          isOpen={!!bulkEmailType}
          onClose={() => setBulkEmailType(null)}
          eventId={event.id}
          guestIds={Array.from(selectedIds)}
          emailType={bulkEmailType}
          onSuccess={() => setSelectedIds(new Set())}
        />
      )}

      {/* Send Email Dialog (with template selection) */}
      <SendEmailDialog
        isOpen={isSendEmailDialogOpen}
        onClose={() => setIsSendEmailDialogOpen(false)}
        eventId={event.id}
        guestIds={Array.from(selectedIds)}
        onSuccess={() => setSelectedIds(new Set())}
      />

      {/* Get Form Link Dialog */}
      {isFormLinkDialogOpen && selectedIds.size === 1 && (() => {
        const selectedGuestId = Array.from(selectedIds)[0]
        const selectedGuest = guests.find((g) => g.id === selectedGuestId)
        if (!selectedGuest) return null
        return (
          <GetFormLinkDialog
            open={isFormLinkDialogOpen}
            onOpenChange={setIsFormLinkDialogOpen}
            eventId={event.id}
            guestId={selectedGuestId}
            guestName={`${selectedGuest.firstName} ${selectedGuest.lastName}`}
            event={{
              customDomain: event.customDomain,
              customDomainVerified: event.customDomainVerified,
            }}
          />
        )
      })()}

      {/* VAPP Link Dialog */}
      {isVappLinkDialogOpen && selectedIds.size === 1 && (() => {
        const selectedGuestId = Array.from(selectedIds)[0]
        const selectedGuest = guests.find((g) => g.id === selectedGuestId) as any
        if (!selectedGuest) return null
        const vappLink = getVappUrl(event, selectedGuest.rsvpToken)
        return (
          <VappLinkDialog
            open={isVappLinkDialogOpen}
            onOpenChange={setIsVappLinkDialogOpen}
            guestName={`${selectedGuest.firstName} ${selectedGuest.lastName || ""}`.trim()}
            serialNumber={selectedGuest.serialNumber}
            vappLink={vappLink}
          />
        )
      })()}

      {/* Generate Email Link Dialog */}
      {isGenerateEmailLinkDialogOpen && selectedIds.size === 1 && (() => {
        const selectedGuestId = Array.from(selectedIds)[0]
        const selectedGuest = guests.find((g) => g.id === selectedGuestId)
        if (!selectedGuest) return null
        return (
          <GenerateEmailLinkDialog
            open={isGenerateEmailLinkDialogOpen}
            onOpenChange={setIsGenerateEmailLinkDialogOpen}
            eventId={event.id}
            guestId={selectedGuestId}
            guestName={`${selectedGuest.firstName} ${selectedGuest.lastName || ""}`.trim()}
          />
        )
      })()}

      {/* Edit View Dialog */}
      {currentView && (
        <EditViewDialog
          open={showEditViewDialog}
          onOpenChange={setShowEditViewDialog}
          view={{
            id: currentView.id,
            name: currentView.name,
            color: currentView.color as any,
            visibleToRoles: currentView.visibleToRoles ?? [],
            isPinned: currentView.isPinned,
            isSystem: currentView.isSystem,
          }}
          onDeleted={() => handleViewDeleted(currentView.id)}
        />
      )}

      {/* Manage Views Dialog */}
      <ManageViewsDialog
        open={showManageViewsDialog}
        onOpenChange={setShowManageViewsDialog}
        eventId={event.id}
        onViewDeleted={handleViewDeleted}
      />
    </div>
  )
}

// Skeleton for loading state
function GuestsTableSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="flex items-center border-b bg-background h-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-2 flex-1">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center border-b h-14">
          {Array.from({ length: 6 }).map((_, j) => (
            <div key={j} className="p-2 flex-1">
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
