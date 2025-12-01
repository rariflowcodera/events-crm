"use client"

import { useState, useMemo, useCallback } from "react"
import { useTranslations } from "next-intl"

import { useGuests } from "@/trpc/hooks/guests-hooks"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyPlaceholder } from "@/components/global/empty-placeholder"
import { GuestsTable, GuestsTableSkeleton } from "@/components/guests/guests-table"
import { GuestsToolbar } from "@/components/guests/guests-toolbar"
import { AddGuestModal } from "@/components/guests/add-guest-modal"
import { GuestDetailSheet } from "@/components/guests/guest-detail-sheet"
import { BulkDeleteDialog } from "@/components/guests/bulk-delete-dialog"
import { BulkSendEmailDialog } from "@/components/guests/bulk-send-email-dialog"
import { ImportGuestsModal } from "@/components/guests/import-guests-modal"
import type { EmailTemplateType } from "@/lib/schemas"

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
}

interface EventGuestsTabProps {
  event: Event
  workspaceSlug: string
}

export function EventGuestsTab({ event, workspaceSlug }: EventGuestsTabProps) {
  const t = useTranslations("guest")

  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<GuestStatus | "all">("all")
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [bulkEmailType, setBulkEmailType] = useState<EmailTemplateType | null>(null)

  // Fetch all guests for the event
  const { data, isLoading, error } = useGuests({ eventId: event.id })
  const guests = data?.guests ?? []

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

      // Status filter
      if (statusFilter !== "all" && guest.status !== statusFilter) {
        return false
      }

      // Category filter
      if (categoryFilter !== "all") {
        if (!guest.category || guest.category.id !== categoryFilter) {
          return false
        }
      }

      return true
    })
  }, [guests, searchQuery, statusFilter, categoryFilter])

  // Handlers
  const handleGuestClick = useCallback((guest: Guest) => {
    setSelectedGuest(guest)
  }, [])

  const handleBulkAction = useCallback((action: "delete" | "send_invitation" | "send_reminder") => {
    if (action === "delete") {
      setIsDeleteDialogOpen(true)
    } else if (action === "send_invitation") {
      setBulkEmailType("invitation")
    } else if (action === "send_reminder") {
      setBulkEmailType("reminder")
    }
  }, [])

  const handleBulkDeleteSuccess = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

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
        categories={event.guestCategories}
        selectedCount={selectedIds.size}
        onAddGuest={() => setIsAddModalOpen(true)}
        onImport={() => setIsImportModalOpen(true)}
        onBulkAction={handleBulkAction}
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
            onGuestClick={handleGuestClick}
            eventId={event.id}
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

      {/* Add Guest Modal */}
      <AddGuestModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        eventId={event.id}
        categories={event.guestCategories}
      />

      {/* Guest Detail Sheet */}
      <GuestDetailSheet
        guest={selectedGuest}
        isOpen={!!selectedGuest}
        onClose={() => setSelectedGuest(null)}
        categories={event.guestCategories}
        eventId={event.id}
      />

      {/* Bulk Delete Dialog */}
      <BulkDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        guestIds={Array.from(selectedIds)}
        eventId={event.id}
        onSuccess={handleBulkDeleteSuccess}
      />

      {/* Import Modal */}
      <ImportGuestsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        eventId={event.id}
        categories={event.guestCategories}
      />

      {/* Bulk Send Email Dialog */}
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
    </div>
  )
}
