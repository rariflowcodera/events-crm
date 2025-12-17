# 28: Guest Attendance Feature

## Status: Complete

## Overview

Add guest attendance functionality for on-the-day event operations. Staff can quickly mark guests as attended via a toggle in the guest table, with tracking of when and by whom. When attendance is marked, the guest status is automatically updated.

## User Requirements

- Track exact attendance timestamp
- Track which staff member marked attendance
- Mark attendance only (no unattend as a separate status)
- **Auto-status**: When marking attendance, guest status automatically changes to "attended"
- **Undo behavior**: When undoing attendance, status reverts to "confirmed"
- Toggle available for: confirmed, maybe, reminded, viewed, invited
- Large toggle button in table for quick operation
- Create default "Attendance" view for on-the-day operations

---

## Phase 1: Schema Changes

### File: `server/db/schemas/guest.ts`

Add fields after line 105 (activity tracking section):

```typescript
// Attendance tracking
attendedAt: timestamp("attended_at", { mode: "date" }),
attendedBy: text("attended_by").references(() => users.id, {
  onDelete: "set null",
}),
```

Add import for users table and relation:
```typescript
import { users } from "./user"

// In guestsRelations:
attendedByUser: one(users, {
  fields: [guests.attendedBy],
  references: [users.id],
}),
```

Add index for attendance queries:
```typescript
index("guest_attended_idx").on(table.eventId, table.attendedAt),
```

### Migration

Run `pnpm run db:generate` then `pnpm run db:migrate`

---

## Phase 2: Column Definitions

### File: `lib/guest-columns.ts`

Add to `GuestColumnId` type:
```typescript
| "attended"      // Toggle column
| "attendedAt"    // Timestamp
| "attendedBy"    // Staff name
```

Add to `GUEST_COLUMNS` array (after activity group):
```typescript
// Attendance
{
  id: "attended",
  label: "Attended",
  labelAr: "حضر",
  defaultVisible: false,
  defaultWidth: 90,
  sortable: true,
  filterable: true,
  group: "attendance",
},
{
  id: "attendedAt",
  label: "Attended At",
  labelAr: "وقت الحضور",
  defaultVisible: false,
  defaultWidth: 140,
  sortable: true,
  filterable: false,
  group: "attendance",
},
{
  id: "attendedBy",
  label: "Logged By",
  labelAr: "سجّل بواسطة",
  defaultVisible: false,
  defaultWidth: 140,
  sortable: false,
  filterable: false,
  group: "attendance",
},
```

Add group label to `COLUMN_GROUP_LABELS`:
```typescript
attendance: { en: "Attendance", ar: "الحضور" },
```

---

## Phase 3: tRPC Backend

### File: `trpc/routers/guests.ts`

**Add `markAttendance` mutation with auto-status:**
```typescript
markAttendance: protectedProcedure
  .input(z.object({
    guestId: z.string().uuid(),
    attended: z.boolean(),
  }))
  .mutation(async ({ ctx, input }) => {
    const guest = await db.query.guests.findFirst({
      where: eq(guests.id, input.guestId),
      with: { event: true },
    })

    if (!guest) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Guest not found" })
    }

    const canManage = await hasPermission({
      userId: ctx.user.id,
      workspaceId: guest.event.workspaceId,
      permissionName: PERMISSIONS.MANAGE_GUESTS,
    })

    if (!canManage) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to mark attendance",
      })
    }

    const allowedStatuses = ["confirmed", "maybe", "reminded", "viewed", "invited"]
    if (!allowedStatuses.includes(guest.status)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot mark attendance for guest with status "${guest.status}"`,
      })
    }

    const [updated] = await db
      .update(guests)
      .set({
        attendedAt: input.attended ? new Date() : null,
        attendedBy: input.attended ? ctx.user.id : null,
        status: input.attended ? "attended" : "confirmed",  // AUTO-STATUS UPDATE
        updatedAt: new Date(),
      })
      .where(eq(guests.id, input.guestId))
      .returning()

    return updated
  }),
```

**Add `bulkMarkAttendance` mutation:**
```typescript
bulkMarkAttendance: protectedProcedure
  .input(z.object({
    eventId: z.string().uuid(),
    guestIds: z.array(z.string().uuid()).min(1).max(100),
    attended: z.boolean(),
  }))
  .mutation(async ({ ctx, input }) => {
    const event = await db.query.events.findFirst({
      where: eq(events.id, input.eventId),
    })

    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
    }

    const canManage = await hasPermission({
      userId: ctx.user.id,
      workspaceId: event.workspaceId,
      permissionName: PERMISSIONS.MANAGE_GUESTS,
    })

    if (!canManage) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to mark attendance",
      })
    }

    const allowedStatuses = ["confirmed", "maybe", "reminded", "viewed", "invited"]

    const updated = await db
      .update(guests)
      .set({
        attendedAt: input.attended ? new Date() : null,
        attendedBy: input.attended ? ctx.user.id : null,
        status: input.attended ? "attended" : "confirmed",  // AUTO-STATUS UPDATE
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(guests.eventId, input.eventId),
          inArray(guests.id, input.guestIds),
          inArray(guests.status, allowedStatuses)
        )
      )
      .returning({ id: guests.id })

    return { updatedCount: updated.length }
  }),
```

**Update `getStats`** to include attendance counts:
```typescript
// Add to the return object:
const attendanceStats = await db
  .select({
    attended: sql<number>`count(*) FILTER (WHERE ${guests.attendedAt} IS NOT NULL)::int`,
    notAttended: sql<number>`count(*) FILTER (WHERE ${guests.attendedAt} IS NULL AND ${guests.status} IN ('confirmed', 'maybe', 'reminded', 'viewed', 'invited'))::int`,
  })
  .from(guests)
  .where(eq(guests.eventId, input.eventId))

return {
  ...existingStats,
  attendance: attendanceStats[0],
}
```

**Update `getMany`** to support sorting by attendance columns in the `getOrderBy` switch.

### File: `trpc/hooks/guests-hooks.ts`

```typescript
export const useMarkAttendance = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guests.markAttendance.useMutation({
    onSuccess: (data) => {
      const message = data.attendedAt
        ? "Guest attendance marked successfully"
        : "Attendance undone"
      toast.success(message)
      utils.guests.getOne.invalidate({ guestId: data.id })
      utils.guests.getMany.invalidate({ eventId: data.eventId })
      utils.guests.getStats.invalidate({ eventId: data.eventId })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useBulkMarkAttendance = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { updatedCount: number }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guests.bulkMarkAttendance.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.updatedCount} guest(s) attendance marked`)
      utils.guests.getMany.invalidate()
      utils.guests.getStats.invalidate()
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}
```

---

## Phase 4: Toggle Component

### New File: `components/guests/attendance-toggle.tsx`

```typescript
"use client"

import { useState } from "react"
import { Check, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useMarkAttendance } from "@/trpc/hooks/guests-hooks"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

interface AttendanceToggleProps {
  guestId: string
  isAttended: boolean
  status: GuestStatus
  guestName?: string
  size?: "sm" | "lg"
}

const ALLOWED_STATUSES: GuestStatus[] = [
  "confirmed",
  "maybe",
  "reminded",
  "viewed",
  "invited",
]

export function AttendanceToggle({
  guestId,
  isAttended,
  status,
  guestName,
  size = "sm",
}: AttendanceToggleProps) {
  const [optimisticAttended, setOptimisticAttended] = useState(isAttended)
  const { mutate, isPending } = useMarkAttendance({
    onError: () => {
      setOptimisticAttended(isAttended)
    },
  })

  const canMarkAttendance = ALLOWED_STATUSES.includes(status)

  if (!canMarkAttendance) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center">
            <span className="text-muted-foreground text-xs">-</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          Cannot mark attendance: {status}
        </TooltipContent>
      </Tooltip>
    )
  }

  const handleToggle = () => {
    const newValue = !optimisticAttended
    setOptimisticAttended(newValue)
    mutate({ guestId, attended: newValue })
  }

  const buttonSize = size === "lg" ? "h-12 w-12" : "h-8 w-8"
  const iconSize = size === "lg" ? "h-6 w-6" : "h-4 w-4"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={optimisticAttended ? "default" : "outline"}
          size="icon"
          className={cn(
            buttonSize,
            optimisticAttended && "bg-green-600 hover:bg-green-700",
            "transition-all"
          )}
          onClick={(e) => {
            e.stopPropagation()
            handleToggle()
          }}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className={cn(iconSize, "animate-spin")} />
          ) : optimisticAttended ? (
            <Check className={iconSize} />
          ) : (
            <X className={cn(iconSize, "text-muted-foreground")} />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {optimisticAttended
          ? `${guestName || "Guest"} attended. Click to undo.`
          : `Mark ${guestName || "guest"} as attended`
        }
      </TooltipContent>
    </Tooltip>
  )
}
```

---

## Phase 5: Table Integration

### File: `components/guests/guests-data-table.tsx`

Add column definitions:

```typescript
{
  id: "attended",
  accessorFn: (row) => !!row.attendedAt,
  header: ({ column }) => (
    <FilterableHeader column={column} title="Attended" />
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
    return date ? format(date, "MMM d, h:mm a") : "-"
  },
  size: getColumnWidth("attendedAt"),
},
{
  id: "attendedBy",
  accessorFn: (row) => row.attendedByUser?.name || row.attendedByUser?.email,
  header: "Logged By",
  cell: ({ getValue }) => (getValue() as string) || "-",
  size: getColumnWidth("attendedBy"),
},
```

---

## Phase 6: Default View

Create a system "Attendance" view when events are created.

### View Configuration:
```typescript
{
  name: "Attendance",
  description: "On-site attendance view for event day operations",
  color: "orange",  // "On-site" semantic meaning
  isPinned: true,
  isSystem: true,
  visibleToRoles: ["owner", "admin", "manager", "member"],
  config: {
    columns: [
      { id: "select", visible: true, width: 48 },
      { id: "attended", visible: true, width: 90 },  // First for quick access
      { id: "fullName", visible: true, width: 180 },
      { id: "category", visible: true, width: 100 },
      { id: "status", visible: true, width: 110 },
      { id: "entity", visible: true, width: 150 },
      { id: "attendedAt", visible: true, width: 140 },
      { id: "actions", visible: true, width: 50 },
      // All other columns hidden
    ],
    filters: {
      status: ["confirmed", "maybe", "reminded", "viewed", "invited"],
    },
    sorting: [{ column: "fullName", direction: "asc" }],
  },
}
```

### Implementation:
Add to event creation mutation in `trpc/routers/events.ts` to create this view automatically.

---

## Phase 7: i18n

### File: `messages/en.json`

```json
{
  "attendance": {
    "title": "Attendance",
    "attended": "Attended",
    "notAttended": "Not Attended",
    "markAttendance": "Mark attendance",
    "undoAttendance": "Undo attendance",
    "attendedAt": "Attended at",
    "attendedBy": "Logged By",
    "bulkMarkAttendance": "Mark attendance for selected",
    "bulkUndoAttendance": "Undo attendance for selected"
  }
}
```

### File: `messages/ar.json`

```json
{
  "attendance": {
    "title": "الحضور",
    "attended": "حضر",
    "notAttended": "لم يحضر",
    "markAttendance": "تسجيل الحضور",
    "undoAttendance": "إلغاء الحضور",
    "attendedAt": "وقت الحضور",
    "attendedBy": "سجّل بواسطة",
    "bulkMarkAttendance": "تسجيل حضور المحددين",
    "bulkUndoAttendance": "إلغاء حضور المحددين"
  }
}
```

---

## Files Summary

| File | Changes |
|------|---------|
| `server/db/schemas/guest.ts` | Add attendedAt, attendedBy fields + relation + index |
| `lib/guest-columns.ts` | Add 3 column definitions + attendance group |
| `trpc/routers/guests.ts` | Add markAttendance, bulkMarkAttendance mutations with auto-status; update getStats |
| `trpc/hooks/guests-hooks.ts` | Add useMarkAttendance, useBulkMarkAttendance |
| `components/guests/attendance-toggle.tsx` | **NEW** - Toggle component |
| `components/guests/guests-data-table.tsx` | Add column renderers |
| `messages/en.json` | Add translations |
| `messages/ar.json` | Add Arabic translations |
| `trpc/routers/events.ts` | Create default Attendance view on event create |

---

## Implementation Order

1. Schema + migration
2. tRPC mutations + hooks
3. Column definitions
4. AttendanceToggle component
5. Table column renderers
6. Default view creation
7. i18n strings
8. Test end-to-end

---

## Auto-Status Behavior

The attendance feature automatically updates the guest status:

| Action | Status Change |
|--------|---------------|
| Mark attendance (toggle ON) | Status becomes `"attended"` |
| Undo attendance (toggle OFF) | Status reverts to `"confirmed"` |

This ensures the status column always reflects the attendance state without requiring manual status updates.

---

## Edge Cases

- **Undoing attendance**: Sets attendedAt and attendedBy to null, reverts status to "confirmed"
- **Event date restrictions**: Not enforced in MVP (staff may need pre/post attendance capability)
- **Permission**: Uses existing MANAGE_GUESTS permission
- **Offline support**: Out of scope for initial implementation
- **Previous status preservation**: Not implemented - undo always sets to "confirmed" for simplicity

---

## Migration Notes

If upgrading from the original "check-in" implementation:

| Old Name | New Name |
|----------|----------|
| `checked_in_at` (DB column) | `attended_at` |
| `checked_in_by` (DB column) | `attended_by` |
| `checkedIn` (column ID) | `attended` |
| `checkedInAt` (column ID) | `attendedAt` |
| `checkedInBy` (column ID) | `attendedBy` |
| `checkIn` (mutation) | `markAttendance` |
| `bulkCheckIn` (mutation) | `bulkMarkAttendance` |
| `useCheckInGuest` (hook) | `useMarkAttendance` |
| `useBulkCheckInGuests` (hook) | `useBulkMarkAttendance` |
| `CheckInToggle` (component) | `AttendanceToggle` |
| `check-in-toggle.tsx` (file) | `attendance-toggle.tsx` |
| `checkin` (column group) | `attendance` |
| "Check-in" (default view) | "Attendance" |

Note: Existing custom views with old column IDs will need to be manually updated by users to use the new column IDs.
