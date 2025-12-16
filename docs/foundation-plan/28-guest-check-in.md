# 28: Guest Check-in Feature

## Status: Complete

## Overview

Add guest check-in functionality for on-the-day event operations. Staff can quickly mark guests as checked-in via a toggle in the guest table, with tracking of when and by whom.

## User Requirements

- Track exact check-in timestamp
- Track which staff member performed the check-in
- Check-in only (no check-out)
- Keep status separate from check-in (RSVP status unchanged)
- Toggle available for: confirmed, maybe, reminded, viewed, invited
- Large toggle button in table for quick operation
- Create default "Check-in" view for on-the-day operations

---

## Phase 1: Schema Changes

### File: `server/db/schemas/guest.ts`

Add fields after line 105 (activity tracking section):

```typescript
// Check-in tracking
checkedInAt: timestamp("checked_in_at", { mode: "date" }),
checkedInBy: text("checked_in_by").references(() => users.id, {
  onDelete: "set null",
}),
```

Add import for users table and relation:
```typescript
import { users } from "./user"

// In guestsRelations:
checkedInByUser: one(users, {
  fields: [guests.checkedInBy],
  references: [users.id],
}),
```

Add index for check-in queries:
```typescript
index("guest_checked_in_idx").on(table.eventId, table.checkedInAt),
```

### Migration

Run `pnpm run db:generate` then `pnpm run db:migrate`

---

## Phase 2: Column Definitions

### File: `lib/guest-columns.ts`

Add to `GuestColumnId` type:
```typescript
| "checkedIn"      // Toggle column
| "checkedInAt"    // Timestamp
| "checkedInBy"    // Staff name
```

Add to `GUEST_COLUMNS` array (after activity group):
```typescript
// Check-in
{
  id: "checkedIn",
  label: "Check-in",
  labelAr: "تسجيل الحضور",
  defaultVisible: false,
  defaultWidth: 90,
  sortable: true,
  filterable: true,
  group: "checkin",
},
{
  id: "checkedInAt",
  label: "Checked In At",
  labelAr: "وقت التسجيل",
  defaultVisible: false,
  defaultWidth: 140,
  sortable: true,
  filterable: false,
  group: "checkin",
},
{
  id: "checkedInBy",
  label: "Checked In By",
  labelAr: "تم التسجيل بواسطة",
  defaultVisible: false,
  defaultWidth: 140,
  sortable: false,
  filterable: false,
  group: "checkin",
},
```

Add group label to `COLUMN_GROUP_LABELS`:
```typescript
checkin: { en: "Check-in", ar: "تسجيل الحضور" },
```

---

## Phase 3: tRPC Backend

### File: `trpc/routers/guests.ts`

**Add `checkIn` mutation:**
```typescript
checkIn: protectedProcedure
  .input(z.object({
    guestId: z.string().uuid(),
    checkIn: z.boolean(),
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
        message: "You do not have permission to check in guests",
      })
    }

    const allowedStatuses = ["confirmed", "maybe", "reminded", "viewed", "invited"]
    if (!allowedStatuses.includes(guest.status)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot check in guest with status "${guest.status}"`,
      })
    }

    const [updated] = await db
      .update(guests)
      .set({
        checkedInAt: input.checkIn ? new Date() : null,
        checkedInBy: input.checkIn ? ctx.user.id : null,
        updatedAt: new Date(),
      })
      .where(eq(guests.id, input.guestId))
      .returning()

    return updated
  }),
```

**Add `bulkCheckIn` mutation:**
```typescript
bulkCheckIn: protectedProcedure
  .input(z.object({
    eventId: z.string().uuid(),
    guestIds: z.array(z.string().uuid()).min(1).max(100),
    checkIn: z.boolean(),
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
        message: "You do not have permission to check in guests",
      })
    }

    const allowedStatuses = ["confirmed", "maybe", "reminded", "viewed", "invited"]

    const updated = await db
      .update(guests)
      .set({
        checkedInAt: input.checkIn ? new Date() : null,
        checkedInBy: input.checkIn ? ctx.user.id : null,
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

**Update `getStats`** to include check-in counts:
```typescript
// Add to the return object:
const checkInStats = await db
  .select({
    checkedIn: sql<number>`count(*) FILTER (WHERE ${guests.checkedInAt} IS NOT NULL)::int`,
    notCheckedIn: sql<number>`count(*) FILTER (WHERE ${guests.checkedInAt} IS NULL AND ${guests.status} IN ('confirmed', 'maybe', 'reminded', 'viewed', 'invited'))::int`,
  })
  .from(guests)
  .where(eq(guests.eventId, input.eventId))

return {
  ...existingStats,
  checkIn: checkInStats[0],
}
```

**Update `getMany`** to support sorting by check-in columns in the `getOrderBy` switch.

### File: `trpc/hooks/guests-hooks.ts`

```typescript
export const useCheckInGuest = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guests.checkIn.useMutation({
    onSuccess: (data) => {
      const message = data.checkedInAt
        ? "Guest checked in successfully"
        : "Check-in undone"
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

export const useBulkCheckInGuests = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { updatedCount: number }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guests.bulkCheckIn.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.updatedCount} guest(s) checked in`)
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

### New File: `components/guests/check-in-toggle.tsx`

```typescript
"use client"

import { useState } from "react"
import { Check, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useCheckInGuest } from "@/trpc/hooks/guests-hooks"
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

interface CheckInToggleProps {
  guestId: string
  isCheckedIn: boolean
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

export function CheckInToggle({
  guestId,
  isCheckedIn,
  status,
  guestName,
  size = "sm",
}: CheckInToggleProps) {
  const [optimisticCheckedIn, setOptimisticCheckedIn] = useState(isCheckedIn)
  const { mutate, isPending } = useCheckInGuest({
    onError: () => {
      setOptimisticCheckedIn(isCheckedIn)
    },
  })

  const canCheckIn = ALLOWED_STATUSES.includes(status)

  if (!canCheckIn) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center">
            <span className="text-muted-foreground text-xs">-</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          Cannot check in: {status}
        </TooltipContent>
      </Tooltip>
    )
  }

  const handleToggle = () => {
    const newValue = !optimisticCheckedIn
    setOptimisticCheckedIn(newValue)
    mutate({ guestId, checkIn: newValue })
  }

  const buttonSize = size === "lg" ? "h-12 w-12" : "h-8 w-8"
  const iconSize = size === "lg" ? "h-6 w-6" : "h-4 w-4"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={optimisticCheckedIn ? "default" : "outline"}
          size="icon"
          className={cn(
            buttonSize,
            optimisticCheckedIn && "bg-green-600 hover:bg-green-700",
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
          ) : optimisticCheckedIn ? (
            <Check className={iconSize} />
          ) : (
            <X className={cn(iconSize, "text-muted-foreground")} />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {optimisticCheckedIn
          ? `${guestName || "Guest"} is checked in. Click to undo.`
          : `Check in ${guestName || "guest"}`
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
  id: "checkedIn",
  accessorFn: (row) => !!row.checkedInAt,
  header: ({ column }) => (
    <FilterableHeader column={column} title="Check-in" />
  ),
  cell: ({ row }) => (
    <div onClick={(e) => e.stopPropagation()}>
      <CheckInToggle
        guestId={row.original.id}
        isCheckedIn={!!row.original.checkedInAt}
        status={row.original.status}
        guestName={`${row.original.firstName} ${row.original.lastName}`}
      />
    </div>
  ),
  size: getColumnWidth("checkedIn"),
},
{
  id: "checkedInAt",
  accessorKey: "checkedInAt",
  header: ({ column }) => (
    <FilterableHeader column={column} title="Checked In At" />
  ),
  cell: ({ getValue }) => {
    const date = getValue() as Date | null
    return date ? format(date, "MMM d, h:mm a") : "-"
  },
  size: getColumnWidth("checkedInAt"),
},
{
  id: "checkedInBy",
  accessorFn: (row) => row.checkedInByUser?.name || row.checkedInByUser?.email,
  header: "Checked In By",
  cell: ({ getValue }) => (getValue() as string) || "-",
  size: getColumnWidth("checkedInBy"),
},
```

---

## Phase 6: Default View

Create a system "Check-in" view when events are created.

### View Configuration:
```typescript
{
  name: "Check-in",
  description: "On-site check-in view for event day operations",
  color: "orange",  // "On-site" semantic meaning
  isPinned: true,
  isSystem: true,
  visibleToRoles: ["owner", "admin", "manager", "member"],
  config: {
    columns: [
      { id: "select", visible: true, width: 48 },
      { id: "checkedIn", visible: true, width: 90 },  // First for quick access
      { id: "fullName", visible: true, width: 180 },
      { id: "category", visible: true, width: 100 },
      { id: "status", visible: true, width: 110 },
      { id: "entity", visible: true, width: 150 },
      { id: "checkedInAt", visible: true, width: 140 },
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
  "guests": {
    "checkIn": {
      "title": "Check-in",
      "checkedIn": "Checked In",
      "notCheckedIn": "Not Checked In",
      "checkInGuest": "Check in guest",
      "undoCheckIn": "Undo check-in",
      "checkedInAt": "Checked in at",
      "checkedInBy": "Checked in by",
      "bulkCheckIn": "Check in selected",
      "bulkUndoCheckIn": "Undo check-in for selected"
    }
  }
}
```

### File: `messages/ar.json`

```json
{
  "guests": {
    "checkIn": {
      "title": "تسجيل الحضور",
      "checkedIn": "تم التسجيل",
      "notCheckedIn": "لم يتم التسجيل",
      "checkInGuest": "تسجيل حضور الضيف",
      "undoCheckIn": "إلغاء التسجيل",
      "checkedInAt": "وقت التسجيل",
      "checkedInBy": "تم التسجيل بواسطة",
      "bulkCheckIn": "تسجيل حضور المحددين",
      "bulkUndoCheckIn": "إلغاء تسجيل المحددين"
    }
  }
}
```

---

## Files Summary

| File | Changes |
|------|---------|
| `server/db/schemas/guest.ts` | Add checkedInAt, checkedInBy fields + relation + index |
| `lib/guest-columns.ts` | Add 3 column definitions + checkin group |
| `trpc/routers/guests.ts` | Add checkIn, bulkCheckIn mutations; update getStats |
| `trpc/hooks/guests-hooks.ts` | Add useCheckInGuest, useBulkCheckInGuests |
| `components/guests/check-in-toggle.tsx` | **NEW** - Toggle component |
| `components/guests/guests-data-table.tsx` | Add column renderers |
| `messages/en.json` | Add translations |
| `messages/ar.json` | Add Arabic translations |
| `trpc/routers/events.ts` | Create default Check-in view on event create |

---

## Implementation Order

1. Schema + migration
2. tRPC mutations + hooks
3. Column definitions
4. CheckInToggle component
5. Table column renderers
6. Default view creation
7. i18n strings
8. Test end-to-end

---

## Edge Cases

- **Undoing check-in**: Sets checkedInAt and checkedInBy to null
- **Event date restrictions**: Not enforced in MVP (staff may need pre/post check capability)
- **Permission**: Uses existing MANAGE_GUESTS permission
- **Offline support**: Out of scope for initial implementation
