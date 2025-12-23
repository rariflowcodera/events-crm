"use client"

import { useRef, useMemo, useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type VisibilityState,
  type SortingState,
  type ColumnOrderState,
  type ColumnSizingState,
  type Row,
  type Header,
} from "@tanstack/react-table"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { getCountryName } from "@/lib/data/countries"
import {
  type GuestListViewConfig,
  GUEST_COLUMNS,
  DEFAULT_VIEW_CONFIG,
} from "@/lib/guest-columns"
import { Checkbox } from "@/components/ui/checkbox"
import { GuestStatusBadge } from "@/components/guests/guest-status-badge"
import { GuestCategoryBadge } from "@/components/guests/guest-category-badge"
import { GuestRowActions } from "@/components/guests/guest-row-actions"
import { GuestEmailStatusIndicator } from "@/components/guests/guest-email-history"
import { AttendanceToggle } from "@/components/guests/attendance-toggle"
import { FilterableHeader } from "@/components/guests/column-filters"
import { GuestAvatarCell } from "@/components/guests/guest-avatar-cell"
import { ImageLightbox } from "@/components/guests/image-lightbox"

// ============================================================================
// Types
// ============================================================================

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

interface AttendedByUser {
  id: string
  name: string
  email: string
}

interface Guest {
  id: string
  firstName: string
  lastName: string
  preferredName: string | null
  displayNameAr: string | null
  gender: "male" | "female" | "unspecified" | null
  title: string | null
  salutation: string | null
  profileImage: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  country: string | null
  position: string | null
  entity: string | null
  department: string | null
  status: GuestStatus
  rsvpToken: string
  rsvpRespondedAt: Date | null
  hasCompanion: boolean | null
  dietaryRequirements: string | null
  accessibilityNeeds: string | null
  tags: string[] | null
  internalNotes: string | null
  lastEmailSentAt: Date | null
  lastEmailOpenedAt: Date | null
  lastRsvpPageVisitAt: Date | null
  attendedAt: Date | null
  attendedBy: string | null
  attendedByUser?: AttendedByUser | null
  category: GuestCategory
  createdAt: Date
}

interface EventCustomDomain {
  customDomain: string | null
  customDomainVerified: boolean | null
}

interface GuestsDataTableProps {
  guests: Guest[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  getGuestDetailHref: (guestId: string) => string
  eventId: string
  event: EventCustomDomain
  workspaceSlug: string
  viewConfig?: GuestListViewConfig
  onViewConfigChange?: (config: GuestListViewConfig) => void
  totalGuests?: number
  fillHeight?: boolean
  canViewDetails?: boolean
}

// ============================================================================
// Constants
// ============================================================================

const ROW_HEIGHT = 44
const MAX_VISIBLE_ROWS = 20
const SELECT_COLUMN_WIDTH = 40
const ACTIONS_COLUMN_WIDTH = 48
const MIN_TABLE_WIDTH = 1200 // Minimum width to ensure horizontal scroll

// ============================================================================
// Resize Handle Component
// ============================================================================

function ColumnResizeHandle<T>({
  header,
  isResizing,
}: {
  header: Header<T, unknown>
  isResizing: boolean
}) {
  return (
    <div
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      className={cn(
        "absolute right-0 top-0 h-full w-[3px] cursor-col-resize select-none touch-none",
        "bg-transparent hover:bg-primary/60 active:bg-primary transition-colors",
        isResizing && "bg-primary"
      )}
      style={{ transform: "translateX(50%)" }}
    />
  )
}

// ============================================================================
// Component
// ============================================================================

export function GuestsDataTable({
  guests,
  selectedIds,
  onSelectionChange,
  getGuestDetailHref,
  eventId,
  event,
  workspaceSlug,
  viewConfig = DEFAULT_VIEW_CONFIG,
  onViewConfigChange,
  totalGuests,
  fillHeight = false,
  canViewDetails = true,
}: GuestsDataTableProps) {
  const router = useRouter()
  const parentRef = useRef<HTMLDivElement>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // Lightbox state for viewing full-size profile images
  const [lightboxImage, setLightboxImage] = useState<{
    src: string
    name: string
  } | null>(null)

  // Derive TanStack Table state from viewConfig
  const columnVisibility = useMemo<VisibilityState>(() => {
    const visibility: VisibilityState = {}
    viewConfig.columns.forEach((col) => {
      visibility[col.id] = col.visible
    })
    return visibility
  }, [viewConfig.columns])

  const columnOrder = useMemo<ColumnOrderState>(
    () => viewConfig.columns.map((col) => col.id),
    [viewConfig.columns]
  )

  const sorting = useMemo<SortingState>(
    () =>
      viewConfig.sorting.map((s) => ({
        id: s.column,
        desc: s.direction === "desc",
      })),
    [viewConfig.sorting]
  )

  // Column sizing state from viewConfig
  const columnSizing = useMemo<ColumnSizingState>(() => {
    const sizing: ColumnSizingState = {}
    viewConfig.columns.forEach((col) => {
      if (col.width) {
        sizing[col.id] = col.width
      }
    })
    return sizing
  }, [viewConfig.columns])

  // Row selection state derived from selectedIds
  const rowSelection = useMemo(() => {
    const selection: Record<string, boolean> = {}
    selectedIds.forEach((id) => {
      selection[id] = true
    })
    return selection
  }, [selectedIds])

  // Handle sorting change
  const handleSortingChange = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const newSorting =
        typeof updater === "function" ? updater(sorting) : updater
      onViewConfigChange?.({
        ...viewConfig,
        sorting: newSorting.map((s) => ({
          column: s.id,
          direction: s.desc ? "desc" : "asc",
        })),
      })
    },
    [sorting, viewConfig, onViewConfigChange]
  )

  // Handle row selection change
  const handleRowSelectionChange = useCallback(
    (
      updater:
        | Record<string, boolean>
        | ((old: Record<string, boolean>) => Record<string, boolean>)
    ) => {
      const newSelection =
        typeof updater === "function" ? updater(rowSelection) : updater
      onSelectionChange(
        new Set(Object.keys(newSelection).filter((k) => newSelection[k]))
      )
    },
    [rowSelection, onSelectionChange]
  )

  // Handle column sizing change (persist to viewConfig)
  const handleColumnSizingChange = useCallback(
    (updater: ColumnSizingState | ((old: ColumnSizingState) => ColumnSizingState)) => {
      const newSizing =
        typeof updater === "function" ? updater(columnSizing) : updater

      // Update viewConfig with new column widths
      const updatedColumns = viewConfig.columns.map((col) => ({
        ...col,
        width: newSizing[col.id] ?? col.width,
      }))

      onViewConfigChange?.({
        ...viewConfig,
        columns: updatedColumns,
      })
    },
    [columnSizing, viewConfig, onViewConfigChange]
  )

  // Get column width from config
  const getColumnWidth = useCallback(
    (columnId: string): number => {
      const colConfig = viewConfig.columns.find((c) => c.id === columnId)
      if (colConfig?.width) return colConfig.width
      const colDef = GUEST_COLUMNS.find((c) => c.id === columnId)
      return colDef?.defaultWidth ?? 100
    },
    [viewConfig.columns]
  )

  // Define columns
  const columns = useMemo<ColumnDef<Guest>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${row.original.firstName} ${row.original.lastName}`}
          />
        ),
        size: getColumnWidth("select"),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "profileImage",
        accessorKey: "profileImage",
        header: "",
        cell: ({ row }) => (
          <GuestAvatarCell
            profileImage={row.original.profileImage}
            firstName={row.original.firstName}
            lastName={row.original.lastName}
            onClick={() => {
              if (row.original.profileImage) {
                setLightboxImage({
                  src: row.original.profileImage,
                  name: `${row.original.firstName} ${row.original.lastName}`,
                })
              }
            }}
          />
        ),
        size: getColumnWidth("profileImage"),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "fullName",
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        header: ({ column }) => (
          <FilterableHeader column={column} title="Name" />
        ),
        cell: ({ row }) => (
          <div className="truncate">
            <span className="font-medium">
              {row.original.firstName} {row.original.lastName}
            </span>
            {row.original.position && (
              <p className="text-muted-foreground text-xs truncate">
                {row.original.position}
              </p>
            )}
          </div>
        ),
        size: getColumnWidth("fullName"),
      },
      {
        id: "firstName",
        accessorKey: "firstName",
        header: ({ column }) => (
          <FilterableHeader column={column} title="First Name" />
        ),
        size: getColumnWidth("firstName"),
      },
      {
        id: "lastName",
        accessorKey: "lastName",
        header: ({ column }) => (
          <FilterableHeader column={column} title="Last Name" />
        ),
        size: getColumnWidth("lastName"),
      },
      {
        id: "preferredName",
        accessorKey: "preferredName",
        header: "Preferred Name",
        cell: ({ getValue }) => (getValue() as string) || "",
        size: getColumnWidth("preferredName"),
      },
      {
        id: "displayNameAr",
        accessorKey: "displayNameAr",
        header: "Arabic Name",
        cell: ({ getValue }) => {
          const value = getValue() as string | null
          return (
            <span className="truncate" dir="rtl" title={value ?? undefined}>
              {value || ""}
            </span>
          )
        },
        size: getColumnWidth("displayNameAr"),
      },
      {
        id: "gender",
        accessorKey: "gender",
        header: ({ column }) => (
          <FilterableHeader column={column} title="Gender" />
        ),
        cell: ({ getValue }) => {
          const value = getValue() as string | null
          if (!value) return ""
          // Capitalize first letter
          return value.charAt(0).toUpperCase() + value.slice(1)
        },
        size: getColumnWidth("gender"),
      },
      {
        id: "title",
        accessorKey: "title",
        header: "Title",
        cell: ({ getValue }) => (getValue() as string) || "",
        size: getColumnWidth("title"),
      },
      {
        id: "salutation",
        accessorKey: "salutation",
        header: "Salutation",
        cell: ({ getValue }) => (getValue() as string) || "",
        size: getColumnWidth("salutation"),
      },
      {
        id: "email",
        accessorKey: "email",
        header: ({ column }) => (
          <FilterableHeader column={column} title="Email" />
        ),
        cell: ({ getValue }) => {
          const value = getValue() as string | null
          return (
            <span className="truncate" title={value ?? undefined}>
              {value || ""}
            </span>
          )
        },
        size: getColumnWidth("email"),
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: "Phone",
        cell: ({ getValue }) => (getValue() as string) || "",
        size: getColumnWidth("phone"),
      },
      {
        id: "whatsapp",
        accessorKey: "whatsapp",
        header: "WhatsApp",
        cell: ({ getValue }) => (getValue() as string) || "",
        size: getColumnWidth("whatsapp"),
      },
      {
        id: "entity",
        accessorKey: "entity",
        header: ({ column }) => (
          <FilterableHeader column={column} title="Entity" />
        ),
        cell: ({ getValue }) => {
          const value = getValue() as string | null
          return (
            <span className="truncate" title={value ?? undefined}>
              {value || ""}
            </span>
          )
        },
        size: getColumnWidth("entity"),
      },
      {
        id: "position",
        accessorKey: "position",
        header: ({ column }) => (
          <FilterableHeader column={column} title="Position" />
        ),
        cell: ({ getValue }) => (getValue() as string) || "",
        size: getColumnWidth("position"),
      },
      {
        id: "department",
        accessorKey: "department",
        header: ({ column }) => (
          <FilterableHeader column={column} title="Department" />
        ),
        cell: ({ getValue }) => (getValue() as string) || "",
        size: getColumnWidth("department"),
      },
      {
        id: "country",
        accessorKey: "country",
        header: ({ column }) => (
          <FilterableHeader column={column} title="Country" />
        ),
        cell: ({ getValue }) => {
          const code = getValue() as string | null
          if (!code) return ""
          return getCountryName(code) || code
        },
        size: getColumnWidth("country"),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <FilterableHeader column={column} title="Status" />
        ),
        cell: ({ getValue }) => (
          <GuestStatusBadge status={getValue() as GuestStatus} />
        ),
        size: getColumnWidth("status"),
      },
      {
        id: "category",
        accessorFn: (row) => row.category.name,
        header: ({ column }) => (
          <FilterableHeader column={column} title="Category" />
        ),
        cell: ({ row }) => <GuestCategoryBadge category={row.original.category} />,
        size: getColumnWidth("category"),
      },
      {
        id: "rsvpRespondedAt",
        accessorKey: "rsvpRespondedAt",
        header: ({ column }) => (
          <FilterableHeader column={column} title="RSVP Date" />
        ),
        cell: ({ getValue }) => {
          const date = getValue() as Date | null
          return date ? format(date, "MMM d, yyyy") : ""
        },
        size: getColumnWidth("rsvpRespondedAt"),
      },
      {
        id: "dietaryRequirements",
        accessorKey: "dietaryRequirements",
        header: "Dietary",
        cell: ({ getValue }) => {
          const value = getValue() as string | null
          return (
            <span className="truncate" title={value ?? undefined}>
              {value || ""}
            </span>
          )
        },
        size: getColumnWidth("dietaryRequirements"),
      },
      {
        id: "accessibilityNeeds",
        accessorKey: "accessibilityNeeds",
        header: "Accessibility",
        cell: ({ getValue }) => {
          const value = getValue() as string | null
          return (
            <span className="truncate" title={value ?? undefined}>
              {value || ""}
            </span>
          )
        },
        size: getColumnWidth("accessibilityNeeds"),
      },
      {
        id: "hasCompanion",
        accessorKey: "hasCompanion",
        header: ({ column }) => (
          <FilterableHeader column={column} title="Companion" />
        ),
        cell: ({ getValue }) => (getValue() ? "Yes" : "No"),
        size: getColumnWidth("hasCompanion"),
      },
      {
        id: "tags",
        accessorKey: "tags",
        header: "Tags",
        cell: ({ getValue }) => {
          const tags = getValue() as string[] | null
          if (!tags?.length) return ""
          return tags.join(", ")
        },
        size: getColumnWidth("tags"),
      },
      {
        id: "internalNotes",
        accessorKey: "internalNotes",
        header: "Notes",
        cell: ({ getValue }) => {
          const value = getValue() as string | null
          return (
            <span className="truncate" title={value ?? undefined}>
              {value || ""}
            </span>
          )
        },
        size: getColumnWidth("internalNotes"),
      },
      {
        id: "lastEmailSentAt",
        accessorKey: "lastEmailSentAt",
        header: ({ column }) => (
          <FilterableHeader column={column} title="Last Email" />
        ),
        cell: ({ getValue }) => {
          const date = getValue() as Date | null
          return date ? format(date, "MMM d, yyyy") : ""
        },
        size: getColumnWidth("lastEmailSentAt"),
      },
      {
        id: "lastEmailOpenedAt",
        accessorKey: "lastEmailOpenedAt",
        header: ({ column }) => (
          <FilterableHeader column={column} title="Last Opened" />
        ),
        cell: ({ getValue }) => {
          const date = getValue() as Date | null
          return date ? format(date, "MMM d, yyyy") : ""
        },
        size: getColumnWidth("lastEmailOpenedAt"),
      },
      {
        id: "lastRsvpPageVisitAt",
        accessorKey: "lastRsvpPageVisitAt",
        header: ({ column }) => (
          <FilterableHeader column={column} title="Last Visit" />
        ),
        cell: ({ getValue }) => {
          const date = getValue() as Date | null
          return date ? format(date, "MMM d, yyyy") : ""
        },
        size: getColumnWidth("lastRsvpPageVisitAt"),
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => (
          <FilterableHeader column={column} title="Created" />
        ),
        cell: ({ getValue }) => {
          const date = getValue() as Date
          return format(date, "MMM d, yyyy")
        },
        size: getColumnWidth("createdAt"),
      },
      {
        id: "emails",
        header: "Emails",
        cell: ({ row }) => (
          <GuestEmailStatusIndicator guestId={row.original.id} />
        ),
        size: getColumnWidth("emails"),
        enableSorting: false,
      },
      {
        id: "attended",
        accessorFn: (row) => !!row.attendedAt,
        header: ({ column }) => (
          <FilterableHeader column={column} title="Attendance" />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <AttendanceToggle
              guestId={row.original.id}
              isAttended={!!row.original.attendedAt}
              status={row.original.status}
              guestName={`${row.original.firstName} ${row.original.lastName}`}
            />
          </div>
        ),
        size: getColumnWidth("attended"),
      },
      {
        id: "attendedAt",
        accessorKey: "attendedAt",
        header: ({ column }) => (
          <FilterableHeader column={column} title="Attended At" />
        ),
        cell: ({ getValue }) => {
          const date = getValue() as Date | null
          return date ? format(date, "MMM d, h:mm a") : ""
        },
        size: getColumnWidth("attendedAt"),
      },
      {
        id: "attendedBy",
        accessorFn: (row) => row.attendedByUser?.name || row.attendedByUser?.email,
        header: "Logged By",
        cell: ({ getValue }) => (getValue() as string) || "",
        size: getColumnWidth("attendedBy"),
        enableSorting: false,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          canViewDetails ? (
            <GuestRowActions
              guest={row.original}
              eventId={eventId}
              event={event}
              workspaceSlug={workspaceSlug}
            />
          ) : null,
        size: getColumnWidth("actions"),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [
      eventId,
      event,
      workspaceSlug,
      getColumnWidth,
      canViewDetails,
    ]
  )

  // Create table instance
  const table = useReactTable({
    data: guests,
    columns,
    state: {
      columnVisibility,
      columnOrder,
      sorting,
      rowSelection,
      columnSizing,
    },
    onRowSelectionChange: handleRowSelectionChange,
    onSortingChange: handleSortingChange,
    onColumnSizingChange: handleColumnSizingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: true,
    // Column resizing
    columnResizeMode: "onChange",
    enableColumnResizing: true,
  })

  // Virtual scrolling
  const { rows } = table.getRowModel()
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  const virtualRows = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()
  const maxContainerHeight = Math.min(
    rows.length * ROW_HEIGHT,
    MAX_VISIBLE_ROWS * ROW_HEIGHT
  )

  // Row click handler (only navigates if user can view details)
  const handleRowClick = useCallback(
    (row: Row<Guest>) => {
      if (canViewDetails) {
        router.push(getGuestDetailHref(row.original.id))
      }
    },
    [router, getGuestDetailHref, canViewDetails]
  )

  // Get columns in display order: select (sticky), then all other columns with actions after fullName
  const allVisibleColumns = table.getVisibleLeafColumns()
  const selectColumn = allVisibleColumns.find((col) => col.id === "select")
  const actionsColumn = allVisibleColumns.find((col) => col.id === "actions")

  // Build scrollable columns with actions positioned after fullName
  const visibleScrollableColumns = useMemo(() => {
    const cols = allVisibleColumns.filter((col) => col.id !== "select" && col.id !== "actions")
    const fullNameIndex = cols.findIndex((col) => col.id === "fullName")

    if (actionsColumn && fullNameIndex !== -1) {
      // Insert actions right after fullName
      const result = [...cols]
      result.splice(fullNameIndex + 1, 0, actionsColumn)
      return result
    }

    // Fallback: if no fullName, put actions at start
    if (actionsColumn) {
      return [actionsColumn, ...cols]
    }

    return cols
  }, [allVisibleColumns, actionsColumn])

  // Calculate total table width
  const totalScrollableWidth = visibleScrollableColumns.reduce((sum, col) => sum + col.getSize(), 0)
  const totalTableWidth = SELECT_COLUMN_WIDTH + totalScrollableWidth

  // Ensure table fills container or uses minimum width
  const tableWidth = Math.max(totalTableWidth, MIN_TABLE_WIDTH)

  return (
    <div className={cn(
      "rounded-md border bg-background flex flex-col",
      fillHeight && "h-full"
    )}>
      <div className={cn(
        "overflow-x-auto flex-1 flex flex-col",
        fillHeight && "min-h-0"
      )} ref={tableContainerRef}>
        <div style={{ minWidth: tableWidth, width: "100%" }} className={cn(
          "flex flex-col",
          fillHeight && "h-full"
        )}>
          {/* Header row */}
          <div className="flex items-center border-b bg-muted/30 sticky top-0 z-10 h-10 text-sm font-medium text-muted-foreground flex-shrink-0">
          {/* Sticky select column header */}
          {selectColumn && (
            <div
              className="p-2 flex-shrink-0 bg-muted/30 sticky left-0 z-20"
              style={{ width: SELECT_COLUMN_WIDTH }}
            >
              {flexRender(
                selectColumn.columnDef.header,
                table.getHeaderGroups()[0].headers.find((h) => h.id === "select")!.getContext()
              )}
            </div>
          )}

          {/* Scrollable columns header (includes actions after Name) */}
          {visibleScrollableColumns.map((column) => {
            const header = table.getHeaderGroups()[0].headers.find((h) => h.id === column.id)
            if (!header) return null
            const isActions = column.id === "actions"
            return (
              <div
                key={column.id}
                className={cn(
                  "relative p-2 flex-shrink-0",
                  !isActions && "border-r border-border/50"
                )}
                style={{ width: column.getSize() }}
              >
                {flexRender(column.columnDef.header, header.getContext())}
                {/* Resize handle - not for actions */}
                {!isActions && (
                  <ColumnResizeHandle
                    header={header}
                    isResizing={header.column.getIsResizing()}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Body with virtual scrolling */}
        <div
          ref={parentRef}
          className={cn(
            "overflow-y-auto",
            fillHeight && "flex-1"
          )}
          style={{
            maxHeight: fillHeight ? undefined : (maxContainerHeight > 0 ? maxContainerHeight : undefined),
          }}
        >
          <div style={{ height: totalSize, position: "relative" }}>
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index]
              const allCells = row.getVisibleCells()
              const selectCell = allCells.find((c) => c.column.id === "select")
              const actionsCell = allCells.find((c) => c.column.id === "actions")

              // Build scrollable cells with actions after fullName (same order as header)
              const otherCells = allCells.filter((c) => c.column.id !== "select" && c.column.id !== "actions")
              const fullNameCellIndex = otherCells.findIndex((c) => c.column.id === "fullName")
              let scrollableCells = otherCells
              if (actionsCell && fullNameCellIndex !== -1) {
                scrollableCells = [...otherCells]
                scrollableCells.splice(fullNameCellIndex + 1, 0, actionsCell)
              } else if (actionsCell) {
                scrollableCells = [actionsCell, ...otherCells]
              }

              return (
                <div
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={cn(
                    "flex items-center border-b hover:bg-muted/50 data-[state=selected]:bg-muted",
                    canViewDetails && "cursor-pointer"
                  )}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: totalTableWidth,
                    height: ROW_HEIGHT,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={canViewDetails ? () => handleRowClick(row) : undefined}
                >
                  {/* Sticky select cell */}
                  {selectCell && (
                    <div
                      className="p-2 flex-shrink-0 bg-background sticky left-0 z-10 data-[state=selected]:bg-muted"
                      data-state={row.getIsSelected() ? "selected" : undefined}
                      style={{ width: SELECT_COLUMN_WIDTH }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {flexRender(selectCell.column.columnDef.cell, selectCell.getContext())}
                    </div>
                  )}

                  {/* Scrollable cells (includes actions after Name) */}
                  {scrollableCells.map((cell) => {
                    const isActions = cell.column.id === "actions"
                    return (
                      <div
                        key={cell.id}
                        className={cn(
                          "p-2 flex-shrink-0",
                          !isActions && "truncate"
                        )}
                        style={{ width: cell.column.getSize() }}
                        onClick={isActions ? (e) => e.stopPropagation() : undefined}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

          {/* Empty state */}
          {rows.length === 0 && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              No guests found
            </div>
          )}
        </div>
      </div>

      {/* Footer row with guest count */}
      <div className="border-t px-4 py-2 text-sm text-muted-foreground bg-muted/20">
        {totalGuests !== undefined ? (
          <span>{totalGuests} guest{totalGuests !== 1 ? "s" : ""}</span>
        ) : (
          <span>{rows.length} guest{rows.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Image lightbox for viewing full-size profile photos */}
      <ImageLightbox
        open={!!lightboxImage}
        onOpenChange={(open) => !open && setLightboxImage(null)}
        imageSrc={lightboxImage?.src}
        guestName={lightboxImage?.name}
      />
    </div>
  )
}

