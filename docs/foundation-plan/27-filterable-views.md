# 27: Unified Guest Table with Server-Side Filtering and Column Filters

## Status: IMPLEMENTED

## Related Documents
- [24: Configurable Guest List Views](./24-custom-views.md) - Original views implementation (COMPLETED)

## Overview

Refactor the guests tab to use `GuestsDataTable` (TanStack Table) with:
- Server-side filtering for performance
- Column header filters (Excel-style) instead of toolbar dropdowns
- Unified approach between main guests tab and full-page view
- Filters saved as part of view configuration

## User Decisions

- **Filtering**: Server-side (API returns filtered results)
- **Filter UI**: Column header filters (each column has filter dropdown)

---

## Phase 1: Server-Side Filtering API

### Modify: `trpc/routers/guests.ts`

Update `getMany` procedure to accept filter parameters:

```typescript
getMany: protectedProcedure
  .input(z.object({
    eventId: z.string().uuid(),
    filters: z.object({
      status: z.array(z.string()).optional(),
      categoryIds: z.array(z.string()).optional(),
      countries: z.array(z.string()).optional(),
      search: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }).optional(),
    sorting: z.array(z.object({
      column: z.string(),
      direction: z.enum(["asc", "desc"]),
    })).optional(),
  }))
```

Build WHERE conditions from filter parameters in the query.

---

## Phase 2: Column Header Filter Components

### New Directory: `components/guests/column-filters/`

**Files:**
1. `index.ts` - Barrel exports
2. `text-filter.tsx` - For name, email, entity columns (text search)
3. `select-filter.tsx` - For status, category columns (multi-select dropdown)
4. `country-filter.tsx` - Specialized country picker
5. `date-filter.tsx` - For createdAt, rsvpRespondedAt (date range)

**Column Filter Component Pattern:**
```tsx
interface ColumnFilterProps<T> {
  column: Column<T>
  value: any
  onChange: (value: any) => void
}

export function SelectFilter<T>({ column, value, onChange }: ColumnFilterProps<T>) {
  // Dropdown with multi-select options
  // Shows filter icon in column header
  // Popover with checkbox list
}
```

---

## Phase 3: Integrate Filters into GuestsDataTable

### Modify: `components/guests/guests-data-table.tsx`

1. **Add filter state tracking**
   - Track active filters per column
   - Debounce filter changes for text inputs

2. **Add column header filter UI**
   - Each filterable column gets a filter icon
   - Click opens appropriate filter component
   - Active filters shown with indicator

3. **Props changes:**
   ```typescript
   interface GuestsDataTableProps {
     guests: Guest[]
     // ... existing props
     filters?: GuestListViewFilterConfig
     onFiltersChange?: (filters: GuestListViewFilterConfig) => void
   }
   ```

4. **Column definition updates:**
   - Add `filterFn` to each filterable column
   - Add `Filter` component to column header

---

## Phase 4: Refactor EventGuestsTab

### Modify: `components/events/event-guests-tab.tsx`

1. **Replace GuestsTable with GuestsDataTable**
2. **Remove client-side filtering logic** (useMemo filteredGuests)
3. **Pass filters to API call:**
   ```typescript
   const { data } = useGuests({
     eventId: event.id,
     filters: viewConfig.filters,
     sorting: viewConfig.sorting,
   })
   ```
4. **Remove toolbar filter dropdowns** (moved to column headers)
5. **Keep toolbar actions:** Export, Import, Add Guest, Columns, Save View

---

## Phase 5: Refactor Full-Page View

### Modify: `app/.../guests/view/[viewId]/client.tsx`

1. **Apply view filters to API call:**
   ```typescript
   const { data: guestsData } = trpc.guests.getMany.useQuery({
     eventId: event?.id ?? "",
     filters: view.config.filters,
     sorting: view.config.sorting,
   })
   ```

2. **Wire up filter changes to update view config**

---

## Phase 6: Update Save View to Include Filters

### Modify: `components/guests/view-manager/save-view-dialog.tsx`

The dialog already accepts full `config: GuestListViewConfig` which includes filters.
Ensure current filter state is passed when saving.

---

## Implementation Order

1. **API changes** - Add filter support to `guests.getMany`
2. **Column filter components** - Create filter UI components
3. **GuestsDataTable filters** - Integrate filters into table headers
4. **EventGuestsTab refactor** - Switch to GuestsDataTable + server-side filters
5. **Full-page view refactor** - Apply view filters to API call
6. **Testing** - Verify filters work, views save correctly

---

## Critical Files

### New Files:
- `components/guests/column-filters/index.ts`
- `components/guests/column-filters/text-filter.tsx`
- `components/guests/column-filters/select-filter.tsx`
- `components/guests/column-filters/country-filter.tsx`
- `components/guests/column-filters/date-filter.tsx`

### Modified Files:
- `trpc/routers/guests.ts` - Add filter params to getMany
- `components/guests/guests-data-table.tsx` - Add column header filters
- `components/events/event-guests-tab.tsx` - Replace table, use server-side filters
- `app/.../guests/view/[viewId]/client.tsx` - Apply view filters to API
- `components/guests/guests-toolbar.tsx` - Remove filter dropdowns (keep actions)

---

## UI Changes

### Before (Current):
```
┌──────────────────────────────────────────────────────┐
│ [Search...] [Status▼] [Category▼] [Country▼]         │
│                                                      │
│ ☐ Name          Email         Category  Status       │
│ ☐ John Doe      john@...      VIP       Confirmed   │
│ ☐ Jane Smith    jane@...      General   Pending     │
└──────────────────────────────────────────────────────┘
```

### After (New):
```
┌──────────────────────────────────────────────────────┐
│ [Columns] [Save View] [Export] [Import] [Add Guest]  │
│                                                      │
│ ☐ Name ▼       Email ▼      Category ▼  Status ▼    │
│    └─Filter     └─Filter      └─Filter   └─Filter    │
│ ☐ John Doe     john@...      VIP        Confirmed   │
│ ☐ Jane Smith   jane@...      General    Pending     │
└──────────────────────────────────────────────────────┘
```

Each column header has a filter dropdown (▼) that opens the appropriate filter UI.
