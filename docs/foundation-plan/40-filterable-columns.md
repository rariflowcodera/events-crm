# 40 - Filterable Column Headers

## Overview

Add filter icons to column headers in `GuestsDataTable` that open appropriate filter popovers. This will scale automatically to all 27 filterable columns without manual toolbar configuration.

## Requirements

- Column header filters **coexist** with existing toolbar filters (both sync to same `viewConfig.filters`)
- Filters on custom views are **temporary** (session-only, no save functionality)
- Filter state is shared: changing a column filter updates toolbar display and vice versa

## Current State

- `FilterableHeader` component only handles sorting (shows sort arrows)
- Filter components exist: `TextFilter`, `SelectFilter`, `CountryFilter`
- `GUEST_COLUMNS` defines `filterable: boolean` per column
- Filters are stored in `viewConfig.filters` and passed to `onViewConfigChange`
- Custom views only have search, no column filtering

## Implementation

### Step 1: Define Filter Type Mapping

Add a `filterType` property to column definitions to determine which filter component to use.

**File:** `lib/guest-columns.ts`

```typescript
export type ColumnFilterType = "text" | "select" | "country" | "boolean"

export interface GuestColumnDefinition {
  // ... existing props
  filterType?: ColumnFilterType
  filterKey?: string // Maps to viewConfig.filters key (e.g., "status" -> "status")
}
```

**Filter type assignments:**
- `text`: fullName, firstName, lastName, email, entity, position, department, internalNotes
- `select`: status, category, gender, dietaryRequirements, accessibilityNeeds, tags, lastEmailTemplateName
- `country`: country
- `boolean`: hasCompanion, attended

### Step 2: Create Combined Column Header Component

Create a new `ColumnHeaderWithFilter` component that combines sorting + filtering.

**File:** `components/guests/column-filters/column-header-with-filter.tsx`

```typescript
interface ColumnHeaderWithFilterProps<T> {
  column: Column<T>
  title: string
  filterType?: ColumnFilterType
  filterKey: string
  filterValue: string | string[] | boolean | undefined
  onFilterChange: (key: string, value: any) => void
  filterOptions?: { value: string; label: string }[]
}
```

Features:
- Shows sort icon (clicking header cycles sort)
- Shows filter icon next to sort (if filterable)
- Filter icon highlights when filter is active
- Opens appropriate filter popover based on `filterType`

### Step 3: Add Filter Options Context

Pass filter options (categories, countries, statuses) to the data table.

**File:** `components/guests/guests-data-table.tsx`

Add new props:
```typescript
interface GuestsDataTableProps {
  // ... existing props
  filterOptions?: {
    categories?: { value: string; label: string; color?: string }[]
    countries?: { value: string; label: string }[]
    lastEmailTemplateNames?: { value: string; label: string }[]
  }
}
```

### Step 4: Update Column Definitions to Use New Header

Modify column definitions in `GuestsDataTable` to use `ColumnHeaderWithFilter`.

Example:
```typescript
{
  id: "status",
  accessorKey: "status",
  header: ({ column }) => (
    <ColumnHeaderWithFilter
      column={column}
      title="Status"
      filterType="select"
      filterKey="status"
      filterValue={viewConfig.filters?.status}
      onFilterChange={handleColumnFilterChange}
      filterOptions={STATUS_OPTIONS}
    />
  ),
  // ...
}
```

### Step 5: Add Filter Change Handler

Add handler to update `viewConfig.filters` when column filter changes.

```typescript
const handleColumnFilterChange = useCallback((key: string, value: any) => {
  onViewConfigChange?.({
    ...viewConfig,
    filters: {
      ...viewConfig.filters,
      [key]: value === "" || (Array.isArray(value) && value.length === 0)
        ? undefined
        : value,
    },
  })
}, [viewConfig, onViewConfigChange])
```

### Step 6: Update Custom View Page

Pass filter options to `GuestsDataTable` in the custom view page.

**File:** `app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/events/[eventSlug]/(panel)/guests/view/[viewId]/client.tsx`

- Fetch available categories from event
- Compute available countries from guest data
- Pass these as `filterOptions` to `GuestsDataTable`

### Step 7: Update Main Guest Table

Ensure `EventGuestsTab` also uses the column header filters (they'll work alongside the toolbar filters).

## Files to Modify

1. **lib/guest-columns.ts** - Add `filterType` and `filterKey` to column definitions
2. **components/guests/column-filters/column-header-with-filter.tsx** - New component (create)
3. **components/guests/column-filters/index.ts** - Export new component
4. **components/guests/guests-data-table.tsx** - Update column headers to use new component, add filter handler
5. **app/.../view/[viewId]/client.tsx** - Pass filter options

## Filter Options Sources

| Filter | Options Source |
|--------|---------------|
| status | Static list from schema |
| category | Event's guest categories |
| country | Distinct countries from guests |
| gender | Static: male, female, unspecified |
| hasCompanion | Boolean: Yes/No |
| attended | Boolean: Yes/No |
| lastEmailTemplateName | Distinct from guests data |
| dietaryRequirements | Distinct from guests data |
| accessibilityNeeds | Distinct from guests data |
| tags | Distinct from guests data |

## UI Design

Column header layout:
```
[Sort Icon] Column Name [Filter Icon]
```

- Sort icon: Cycles through asc/desc/unsorted on click
- Filter icon: Opens popover with appropriate filter type
- Filter icon highlights (primary color) when filter is active
- Shows badge count for multi-select filters

## Implementation Order

1. Add `filterType` and `filterKey` to `GUEST_COLUMNS` definitions
2. Create `ColumnHeaderWithFilter` component
3. Update `GuestsDataTable` to:
   - Accept `filterOptions` prop
   - Add `handleColumnFilterChange` callback
   - Update column definitions to use new header component
4. Update custom view page to pass filter options
5. Test that column filters sync with toolbar filters on main guest table

## Notes

- Toolbar filters remain unchanged; they'll auto-sync via shared `viewConfig.filters`
- If column filters work well, toolbar can be deprecated in a future iteration
