"use client"

import { useState, useMemo, useCallback } from "react"
import { useTranslations } from "next-intl"

import { useGuests } from "@/trpc/hooks/guests-hooks"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyPlaceholder } from "@/components/global/empty-placeholder"
import { GuestsTable, GuestsTableSkeleton } from "@/components/guests/guests-table"
import { GuestsToolbar } from "@/components/guests/guests-toolbar"
import { BulkDeleteDialog } from "@/components/guests/bulk-delete-dialog"
import { BulkSendEmailDialog } from "@/components/guests/bulk-send-email-dialog"
import { SendEmailDialog } from "@/components/guests/send-email-dialog"
import type { EmailTemplateType } from "@/lib/schemas"
import { getCountryName } from "@/lib/data/countries"
import { createRoute } from "@/lib/routes"
import { exportGuestsToExcel } from "@/lib/export-guests"

type GuestStatus =
  | "pending"
  | "invited"
  | "reminded"
  | "viewed"
  | "confirmed"
  | "declined"
  | "maybe"
  | "waitlisted"
  | "cancelled"
  | "attended"
  | "no_show"

interface GuestCategory {
  id: string
  name: string
  code: string
  color: string | null
  sortOrder: number
}

interface Guest {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  country: string | null
  position: string | null
  entity: string | null
  status: GuestStatus
  rsvpToken: string
  internalNotes: string | null
  hasCompanion: boolean | null
  dietaryRequirements: string | null
  category: {
    id: string
    name: string
    code: string
    color: string | null
  }
  createdAt: Date
  rsvpRespondedAt: Date | null
}

interface Event {
  id: string
  name: string
  slug: string
  guestCategories: GuestCategory[]
  customDomain: string | null
  customDomainVerified: boolean | null
}

interface EventGuestsTabProps {
  event: Event
  workspaceSlug: string
}

export function EventGuestsTab({ event, workspaceSlug }: EventGuestsTabProps) {
  const t = useTranslations("guest")

  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<GuestStatus[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [countryFilter, setCountryFilter] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [bulkEmailType, setBulkEmailType] = useState<EmailTemplateType | null>(null)
  const [isSendEmailDialogOpen, setIsSendEmailDialogOpen] = useState(false)

  // Navigation hrefs
  const addGuestHref = createRoute("guest-new", { slug: workspaceSlug, eventSlug: event.slug }).href
  const importHref = createRoute("guest-import", { slug: workspaceSlug, eventSlug: event.slug }).href
  const getGuestDetailHref = useCallback(
    (guestId: string) => createRoute("guest-detail", { slug: workspaceSlug, eventSlug: event.slug, guestId }).href,
    [workspaceSlug, event.slug]
  )

  // Fetch all guests for the event
  const { data, isLoading, error } = useGuests({ eventId: event.id })
  const guests = data?.guests ?? []

  // Compute available countries from guest data
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

  // Client-side filtering
  const filteredGuests = useMemo(() => {
    if (!guests.length) return []

    return guests.filter((guest) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const searchableFields = [
          guest.firstName,
          guest.lastName,
          guest.email,
          guest.entity,
          guest.position,
        ]
        const matches = searchableFields.some(
          (field) => field && field.toLowerCase().includes(query)
        )
        if (!matches) return false
      }

      // Status filter (empty array = show all)
      if (statusFilter.length > 0 && !statusFilter.includes(guest.status)) {
        return false
      }

      // Category filter (empty array = show all)
      if (categoryFilter.length > 0) {
        if (!guest.category || !categoryFilter.includes(guest.category.id)) {
          return false
        }
      }

      // Country filter (empty array = show all)
      if (countryFilter.length > 0 && (!guest.country || !countryFilter.includes(guest.country))) {
        return false
      }

      return true
    })
  }, [guests, searchQuery, statusFilter, categoryFilter, countryFilter])

  // Handlers
  const handleBulkAction = useCallback((action: "delete" | "send_invitation" | "send_email") => {
    if (action === "delete") {
      setIsDeleteDialogOpen(true)
    } else if (action === "send_invitation") {
      setBulkEmailType("invitation")
    } else if (action === "send_email") {
      setIsSendEmailDialogOpen(true)
    }
  }, [])

  const handleBulkDeleteSuccess = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleExport = useCallback(() => {
    exportGuestsToExcel(filteredGuests, event.slug)
  }, [filteredGuests, event.slug])

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">{t("guests")}</h3>
            <p className="text-muted-foreground text-sm">
              Manage guests for this event
            </p>
          </div>
        </div>
        <GuestsTableSkeleton />
      </div>
    )
  }

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

  const hasGuests = guests.length > 0

  return (
    <div className="space-y-6">
      <GuestsToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        countryFilter={countryFilter}
        onCountryFilterChange={setCountryFilter}
        availableCountries={availableCountries}
        categories={event.guestCategories}
        selectedCount={selectedIds.size}
        addGuestHref={addGuestHref}
        importHref={importHref}
        onBulkAction={handleBulkAction}
        onExport={handleExport}
        workspaceSlug={workspaceSlug}
      />

      {hasGuests ? (
        <>
          <div className="text-muted-foreground text-sm">
            Showing {filteredGuests.length} of {guests.length} guest{guests.length !== 1 ? "s" : ""}
          </div>
          <GuestsTable
            guests={filteredGuests}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            getGuestDetailHref={getGuestDetailHref}
            eventId={event.id}
            event={{
              customDomain: event.customDomain,
              customDomainVerified: event.customDomainVerified,
            }}
            workspaceSlug={workspaceSlug}
          />
        </>
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
    </div>
  )
}
