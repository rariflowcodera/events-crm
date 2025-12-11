"use client"

import { useRef, useCallback } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table" // Used in skeleton
import { Checkbox } from "@/components/ui/checkbox"
import { GuestStatusBadge } from "@/components/guests/guest-status-badge"
import { GuestCategoryBadge } from "@/components/guests/guest-category-badge"
import { GuestRowActions } from "@/components/guests/guest-row-actions"
import { GuestEmailStatusIndicator } from "@/components/guests/guest-email-history"
import { Skeleton } from "@/components/ui/skeleton"
import { getCountryName } from "@/lib/data/countries"

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
  category: GuestCategory
  createdAt: Date
  rsvpRespondedAt: Date | null
}

interface EventCustomDomain {
  customDomain: string | null
  customDomainVerified: boolean | null
}

interface GuestsTableProps {
  guests: Guest[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onGuestClick: (guest: Guest) => void
  eventId: string
  event: EventCustomDomain
}

const ROW_HEIGHT = 56
const MAX_VISIBLE_ROWS = 10

export function GuestsTable({
  guests,
  selectedIds,
  onSelectionChange,
  onGuestClick,
  eventId,
  event,
}: GuestsTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: guests.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  const allSelected = guests.length > 0 && selectedIds.size === guests.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < guests.length

  const toggleAll = useCallback(() => {
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(guests.map((g) => g.id)))
    }
  }, [allSelected, guests, onSelectionChange])

  const toggleOne = useCallback((id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    onSelectionChange(newSelected)
  }, [selectedIds, onSelectionChange])

  const virtualRows = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  // Dynamic max-height: only constrain when we have many rows
  const maxContainerHeight = Math.min(guests.length * ROW_HEIGHT, MAX_VISIBLE_ROWS * ROW_HEIGHT)

  return (
    <div className="rounded-md border">
      <div className="flex items-center border-b bg-background sticky top-0 z-10 h-10 text-sm font-medium text-muted-foreground">
        <div className="w-12 p-2 flex-shrink-0">
          <Checkbox
            checked={allSelected}
            ref={(el) => {
              if (el) {
                (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected
              }
            }}
            onCheckedChange={toggleAll}
            aria-label="Select all"
          />
        </div>
        <div className="w-[180px] p-2 flex-shrink-0">Name</div>
        <div className="w-[220px] p-2 flex-shrink-0">Email</div>
        <div className="flex-1 min-w-[100px] p-2">Entity</div>
        <div className="w-[130px] p-2 flex-shrink-0">Country</div>
        <div className="w-[100px] p-2 flex-shrink-0">Category</div>
        <div className="w-[100px] p-2 flex-shrink-0">Status</div>
        <div className="w-[70px] p-2 flex-shrink-0">Emails</div>
        <div className="w-[50px] p-2 flex-shrink-0"></div>
      </div>
        <div
          ref={parentRef}
          className="overflow-y-auto"
          style={{ maxHeight: maxContainerHeight > 0 ? maxContainerHeight : undefined }}
        >
        <div style={{ height: totalSize, position: "relative" }}>
          {virtualRows.map((virtualRow) => {
            const guest = guests[virtualRow.index]
            const isSelected = selectedIds.has(guest.id)

            return (
              <div
                key={guest.id}
                data-state={isSelected ? "selected" : undefined}
                className="flex items-center cursor-pointer border-b hover:bg-muted/50 data-[state=selected]:bg-muted"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: ROW_HEIGHT,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="w-12 p-2 flex-shrink-0">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleOne(guest.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${guest.firstName} ${guest.lastName}`}
                  />
                </div>
                <div
                  className="w-[180px] p-2 flex-shrink-0 font-medium truncate"
                  onClick={() => onGuestClick(guest)}
                  title={`${guest.firstName} ${guest.lastName}`}
                >
                  <div className="truncate">
                    {guest.firstName} {guest.lastName}
                    {guest.position && (
                      <p className="text-muted-foreground text-xs truncate">{guest.position}</p>
                    )}
                  </div>
                </div>
                <div
                  className="w-[220px] p-2 flex-shrink-0 truncate"
                  onClick={() => onGuestClick(guest)}
                  title={guest.email || undefined}
                >
                  {guest.email || "-"}
                </div>
                <div
                  className="flex-1 min-w-[100px] p-2 truncate"
                  onClick={() => onGuestClick(guest)}
                  title={guest.entity || undefined}
                >
                  {guest.entity || "-"}
                </div>
                <div
                  className="w-[130px] p-2 flex-shrink-0 truncate"
                  onClick={() => onGuestClick(guest)}
                  title={guest.country ? getCountryName(guest.country) || guest.country : undefined}
                >
                  {guest.country ? getCountryName(guest.country) || guest.country : "-"}
                </div>
                <div className="w-[100px] p-2 flex-shrink-0">
                  <GuestCategoryBadge category={guest.category} />
                </div>
                <div className="w-[100px] p-2 flex-shrink-0">
                  <GuestStatusBadge status={guest.status} />
                </div>
                <div className="w-[70px] p-2 flex-shrink-0">
                  <GuestEmailStatusIndicator guestId={guest.id} />
                </div>
                <div className="w-[50px] p-2 flex-shrink-0">
                  <GuestRowActions guest={guest} eventId={eventId} event={event} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function GuestsTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Skeleton className="h-4 w-4" />
            </TableHead>
            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-4" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-40" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-8 w-8" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
