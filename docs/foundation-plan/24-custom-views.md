# 24: Configurable Guest List Views

## Status: ✅ COMPLETED

## Overview
Implement a configurable views system for the guest list table that allows:
- Organization-shared saved views (admins create, everyone uses)
- TanStack Table integration with column visibility, ordering, and sizing
- Role-based visibility for views (admins select which roles see each view)
- Pinned views in sidebar submenu with colored category dots
- Dedicated full-page view routes with shareable URLs

## User Decisions
- **View Scope**: Organization-shared (anyone can see/use, admins can create/edit)
- **Table Library**: TanStack Table (migrate from custom virtual table)
- **Sidebar Pins**: Role-filtered views in "Views" submenu under Event Management
- **View Colors**: Colored dots with semantic meaning (operational, management, on-site)
- **Full Page View**: Dedicated route `/events/[eventSlug]/guests/view/[viewId]`

---

## Phase 1: Database Schema ✅

### New File: `server/db/schemas/guest-list-view.ts`
```typescript
// Core table: guest_list_view
// Fields: id, eventId, name, description, config (JSON),
//         visibleToRoles (JSON array), color, isPinned, pinOrder,
//         isSystem, createdBy, updatedBy, timestamps
// Indexes: eventId, (eventId + isPinned + pinOrder)
```

**View Color Options:**
```typescript
export const VIEW_COLORS = {
  gray: { label: "Default", dot: "bg-gray-400" },
  blue: { label: "Operational", dot: "bg-blue-500" },
  green: { label: "Management", dot: "bg-green-500" },
  orange: { label: "On-site", dot: "bg-orange-500" },
  purple: { label: "VIP", dot: "bg-purple-500" },
  red: { label: "Priority", dot: "bg-red-500" },
} as const

export type ViewColor = keyof typeof VIEW_COLORS
```

**Config JSON Structure:**
```typescript
type GuestListViewConfig = {
  columns: { id: string; visible: boolean; width?: number }[]
  filters: { status?: string[]; categoryIds?: string[]; countries?: string[]; search?: string }
  sorting: { column: string; direction: 'asc' | 'desc' }[]
}
```

**Additional Fields:**
```typescript
// Role visibility - which roles can see this view in their sidebar
visibleToRoles: json("visible_to_roles").$type<string[]>().default(["owner", "admin", "manager", "member"]),

// Color for visual categorization
color: text("color").$type<ViewColor>().default("gray"),
```

### Files to Modify:
- `server/db/schemas.ts` - Export new schema

### Commands:
```bash
pnpm run db:generate
pnpm run db:migrate
```

---

## Phase 2: tRPC API Layer ✅

### New File: `trpc/routers/guest-list-views.ts`
**Procedures:**
- `getMany` - List all views for an event
- `getPinned` - Get pinned views for sidebar
- `getOne` - Get single view by ID
- `create` - Create new view (admin only)
- `update` - Update view config/name/pin status
- `delete` - Delete view (except system views)
- `reorderPinned` - Reorder pinned views

**Permission checks:**
- `VIEW_GUESTS` for read operations
- `MANAGE_EVENT` for write operations

### New File: `trpc/hooks/guest-list-views-hooks.ts`
- `useGuestListViews(eventId)`
- `usePinnedGuestListViews(eventId)`
- `useGuestListView(viewId)`
- `useCreateGuestListView()`
- `useUpdateGuestListView()`
- `useDeleteGuestListView()`

### Files to Modify:
- `trpc/routers/_app.ts` - Register new router

---

## Phase 3: Column Definitions ✅

### New File: `lib/guest-columns.ts`
Define all available guest columns with metadata:
```typescript
type GuestColumnDefinition = {
  id: GuestColumnId
  label: string
  labelAr?: string
  defaultVisible: boolean
  defaultWidth: number
  sortable: boolean
  filterable: boolean
  fixed?: 'left' | 'right'  // checkbox, actions
}
```

**Available Columns (20+):**
- Fixed: `select` (checkbox), `actions`
- Default visible: `fullName`, `email`, `entity`, `country`, `category`, `status`, `emails`
- Hidden by default: `phone`, `whatsapp`, `position`, `department`, `title`, `preferredName`, `dietaryRequirements`, `accessibilityNeeds`, `hasCompanion`, `tags`, `internalNotes`, `rsvpRespondedAt`, `lastEmailSentAt`, `lastEmailOpenedAt`, `createdAt`

**Default View Config:** Export `DEFAULT_VIEW_CONFIG` constant

---

## Phase 4: TanStack Table Component ✅

### New File: `components/guests/guests-data-table.tsx`
Replace custom table with TanStack Table while keeping virtual scrolling:
- Use `useReactTable` with `getCoreRowModel`, `getSortedRowModel`
- Integrate `@tanstack/react-virtual` for performance
- Accept `viewConfig` prop to control visibility/order/sorting
- Support column resize via TanStack Table column sizing
- Maintain existing selection, click-to-detail behavior

### Files to Modify:
- `components/guests/index.ts` - Export new component

### Keep Existing:
- `guests-table.tsx` - Keep skeleton, deprecate main component

---

## Phase 5: View Management UI ✅

### New Directory: `components/guests/view-manager/`

**Files:**
1. `index.ts` - Barrel exports
2. `view-selector.tsx` - Dropdown to switch between views
3. `column-picker.tsx` - Toggle column visibility + drag-to-reorder
4. `save-view-dialog.tsx` - Save current config as new view
5. `view-manager-dialog.tsx` - Full CRUD for views (rename, pin, delete)
6. `view-color-picker.tsx` - Select view color/category
7. `view-role-selector.tsx` - Select which roles can see the view

**Save View Dialog Fields:**
```
┌─────────────────────────────────────────────┐
│ Save View                                   │
├─────────────────────────────────────────────┤
│ Name: [________________________]            │
│                                             │
│ Color:                                      │
│ ○ Gray (Default)    ● Blue (Operational)   │
│ ○ Green (Management) ○ Orange (On-site)    │
│ ○ Purple (VIP)       ○ Red (Priority)      │
│                                             │
│ Visible to:                                 │
│ ☑ Owner  ☑ Admin  ☑ Manager  ☐ Member     │
│                                             │
│ ☑ Pin to sidebar                           │
│                                             │
│              [Cancel]  [Save View]          │
└─────────────────────────────────────────────┘
```

**View Color Picker Component:**
```typescript
interface ViewColorPickerProps {
  value: ViewColor
  onChange: (color: ViewColor) => void
}

export function ViewColorPicker({ value, onChange }: ViewColorPickerProps) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-2 gap-2">
      {Object.entries(VIEW_COLORS).map(([key, { label, dot }]) => (
        <div key={key} className="flex items-center gap-2">
          <RadioGroupItem value={key} id={key} />
          <Label htmlFor={key} className="flex items-center gap-2">
            <span className={`size-3 rounded-full ${dot}`} />
            {label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  )
}
```

**View Role Selector Component:**
```typescript
const ROLES = ["owner", "admin", "manager", "member"] as const

interface ViewRoleSelectorProps {
  value: string[]
  onChange: (roles: string[]) => void
}

export function ViewRoleSelector({ value, onChange }: ViewRoleSelectorProps) {
  return (
    <div className="flex flex-wrap gap-4">
      {ROLES.map(role => (
        <div key={role} className="flex items-center gap-2">
          <Checkbox
            id={role}
            checked={value.includes(role)}
            disabled={role === "owner"} // Owner always has access
            onCheckedChange={(checked) => {
              if (checked) {
                onChange([...value, role])
              } else {
                onChange(value.filter(r => r !== role))
              }
            }}
          />
          <Label htmlFor={role} className="capitalize">{role}</Label>
        </div>
      ))}
    </div>
  )
}
```

**Dependencies to Add:**
```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Phase 6: Integrate into Guests Tab ✅

### Files to Modify:
- `components/events/event-guests-tab.tsx`
  - Add `view` query param support via `useSearchParams`
  - Load view config from `useGuestListView(viewIdFromUrl)`
  - Add view selector and column picker to toolbar
  - Replace `GuestsTable` with `GuestsDataTable`
  - Add save view button when config differs from saved

- `components/guests/guests-toolbar.tsx`
  - Add ViewSelector dropdown
  - Add ColumnPicker button
  - Add SaveView button (shows when unsaved changes)

---

## Phase 7: Sidebar Integration (Stage 25 Compatible) ✅

Integrates with the Stage 25 context-aware navigation system. Views appear as a submenu under the Event Management section.

### Target Sidebar Structure:
```
Event Management
├── Overview
├── Guests
├── Views                    ← New collapsible submenu
│   ├── ● All Confirmed      (green dot - Management)
│   ├── ● VIP Arrivals       (purple dot - VIP)
│   ├── ● On-site Check-in   (orange dot - On-site)
│   └── + Manage Views       (link to view manager)
├── Categories
├── Forms
...
```

### New File: `components/navigation/nav-event-views.tsx`
```typescript
"use client"

import Link from "next/link"
import { usePermissions } from "@/hooks/use-permissions"
import { usePinnedGuestListViews } from "@/trpc/hooks/guest-list-views-hooks"
import { VIEW_COLORS } from "@/lib/guest-columns"
import {
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface NavEventViewsProps {
  workspaceSlug: string
  eventSlug: string
  eventId: string
}

export function NavEventViews({ workspaceSlug, eventSlug, eventId }: NavEventViewsProps) {
  const { role } = usePermissions(workspaceSlug)
  const { data: views } = usePinnedGuestListViews(eventId)

  // Filter views based on user's role
  const visibleViews = views?.filter(view =>
    view.visibleToRoles.includes(role)
  )

  if (!visibleViews?.length) return null

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger asChild>
        <SidebarMenuButton>
          <Icons.filter className="size-4" />
          <span>Views</span>
          <Icons.chevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
        </SidebarMenuButton>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {visibleViews.map(view => (
            <SidebarMenuSubItem key={view.id}>
              <SidebarMenuSubButton asChild>
                <Link href={`/${workspaceSlug}/events/${eventSlug}?tab=guests&view=${view.id}`}>
                  {/* Colored dot */}
                  <span className={`size-2 rounded-full ${VIEW_COLORS[view.color].dot}`} />
                  <span className="truncate">{view.name}</span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}
```

### Files to Modify:
- `components/navigation/nav-event.tsx`
  - Add "Views" as a collapsible menu item after "Guests"
  - Import and render `NavEventViews` as submenu content
  - Only show if user has VIEW_GUESTS permission

---

## Phase 8: Full-Page View Route ✅

### New Files:
```
app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/events/[eventSlug]/(panel)/guests/view/[viewId]/
├── page.tsx       - Server component with prefetching
└── client.tsx     - Client component with full-page table
```

**Features:**
- Back link to guests tab
- View name as page title
- Full viewport table (no event tabs header)
- Same table component with view config applied
- Edit/manage view actions for admins

---

## Phase 9: i18n Support ✅

### Files to Modify:
- `messages/en.json` - Add view management strings
- `messages/ar.json` - Add Arabic translations

**Keys to Add:**
```json
{
  "views": {
    "allGuests": "All Guests",
    "savedViews": "Saved Views",
    "saveView": "Save View",
    "manageViews": "Manage Views",
    "columns": "Columns",
    "createView": "Create View",
    "viewName": "View Name",
    "pinToSidebar": "Pin to Sidebar",
    "visibleTo": "Visible to",
    "color": "Color",
    "colors": {
      "gray": "Default",
      "blue": "Operational",
      "green": "Management",
      "orange": "On-site",
      "purple": "VIP",
      "red": "Priority"
    }
  }
}
```

---

## Implementation Order (All Completed ✅)

1. ✅ **Schema + Migration** - `guest-list-view.ts`, generate/migrate
2. ✅ **tRPC Router + Hooks** - `guest-list-views.ts`, hooks file
3. ✅ **Column Definitions** - `lib/guest-columns.ts`
4. ✅ **Install dnd-kit** - `pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
5. ✅ **TanStack Table Component** - `guests-data-table.tsx`
6. ✅ **View Manager Components** - `view-selector.tsx`, `column-picker.tsx`, `save-view-dialog.tsx`
7. ✅ **Integrate into Guests Tab** - Update `event-guests-tab.tsx` and toolbar
8. ✅ **Sidebar Integration** - `nav-event-views.tsx`, update `nav-event.tsx`
9. ✅ **Full-Page Route** - Create route files
10. ✅ **i18n** - Add translation strings

---

## Critical Files Summary

### New Files (13):
- `server/db/schemas/guest-list-view.ts`
- `trpc/routers/guest-list-views.ts`
- `trpc/hooks/guest-list-views-hooks.ts`
- `lib/guest-columns.ts` (includes VIEW_COLORS)
- `components/guests/guests-data-table.tsx`
- `components/guests/view-manager/index.ts`
- `components/guests/view-manager/view-selector.tsx`
- `components/guests/view-manager/column-picker.tsx`
- `components/guests/view-manager/save-view-dialog.tsx`
- `components/guests/view-manager/view-color-picker.tsx`
- `components/guests/view-manager/view-role-selector.tsx`
- `components/navigation/nav-event-views.tsx`
- `app/.../guests/view/[viewId]/page.tsx` + `client.tsx`

### Modified Files (8):
- `server/db/schemas.ts`
- `trpc/routers/_app.ts`
- `components/events/event-guests-tab.tsx`
- `components/guests/guests-toolbar.tsx`
- `components/navigation/nav-event.tsx` (add Views submenu)
- `components/navigation/app-sidebar-content.tsx`
- `messages/en.json`
- `messages/ar.json`

### Dependencies to Add:
- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`

---

## Implementation Summary

### Completed Files:

**New Files Created (14):**
1. `server/db/schemas/guest-list-view.ts` - Database schema with VIEW_COLORS constant
2. `server/db/migrations/0012_mean_thor_girl.sql` - Migration file
3. `trpc/routers/guest-list-views.ts` - Full CRUD tRPC router
4. `trpc/hooks/guest-list-views-hooks.ts` - Query and mutation hooks
5. `lib/guest-columns.ts` - 27 column definitions with metadata
6. `components/guests/guests-data-table.tsx` - TanStack Table with virtual scrolling
7. `components/guests/view-manager/index.ts` - Barrel exports
8. `components/guests/view-manager/view-selector.tsx` - View dropdown with colored dots
9. `components/guests/view-manager/column-picker.tsx` - Drag-and-drop column manager
10. `components/guests/view-manager/save-view-dialog.tsx` - Save view form
11. `components/guests/view-manager/view-color-picker.tsx` - Color selection radio group
12. `components/guests/view-manager/view-role-selector.tsx` - Role visibility checkboxes
13. `components/navigation/nav-event-views.tsx` - Sidebar views submenu
14. `app/.../guests/view/[viewId]/page.tsx` + `client.tsx` - Full-page view route

**Modified Files:**
- `server/db/schemas.ts` - Export guest-list-view schema
- `trpc/routers/_app.ts` - Register guestListViewsRouter
- `components/navigation/nav-event.tsx` - Add NavEventViews component
- `messages/en.json` - Added views translations
- `messages/ar.json` - Added Arabic views translations

**Dependencies Added:**
- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`

### Key Features Implemented:
- Organization-shared views (admins create, everyone uses)
- Role-based visibility (owner, admin, manager, member)
- 6 semantic color categories (Default, Operational, Management, On-site, VIP, Priority)
- Pinned views in sidebar with colored dots
- Column visibility, ordering, and drag-and-drop reordering
- Full-page dedicated routes with shareable URLs
- Full Arabic/English i18n support
- Automatic column schema migration (new columns added to existing views)

---

## Phase 10: Column Schema Migration ✅

When new columns are added to `GUEST_COLUMNS` (e.g., `profileImage`), existing saved views don't automatically receive these columns. To solve this, a synchronization utility ensures view configs always have all current columns.

### Helper Function: `syncViewConfigColumns`

**Location:** `lib/guest-columns.ts`

```typescript
/**
 * Ensures a view config has all columns from GUEST_COLUMNS.
 * - Adds missing columns (new columns added to schema)
 * - Preserves existing column visibility/width settings
 * - Removes columns that no longer exist in GUEST_COLUMNS
 */
export function syncViewConfigColumns(
  config: GuestListViewConfig
): GuestListViewConfig {
  // ... implementation
}
```

**Behavior:**
- New columns are inserted at their correct position based on `GUEST_COLUMNS` order
- New columns use their `defaultVisible` and `defaultWidth` from the column definition
- Existing column settings (visibility, width) are preserved
- Columns removed from `GUEST_COLUMNS` are filtered out

### Usage in `event-guests-tab.tsx`

The function is called whenever a view config is loaded:

```typescript
import { syncViewConfigColumns } from "@/lib/guest-columns"

// When loading default view
const syncedConfig = syncViewConfigColumns(defaultView.config as GuestListViewConfig)
setViewConfig(syncedConfig)

// When selecting a view
const syncedConfig = syncViewConfigColumns(selectedView.config as GuestListViewConfig)
setViewConfig(syncedConfig)
```

### Benefits
- **Zero migration needed**: New columns automatically appear in all views
- **Preserves user customization**: Existing column order and visibility unchanged
- **Backwards compatible**: Old view configs work seamlessly
- **Forward compatible**: New columns added to schema are immediately available

---

## Phase 11: View Management UI ✅

Added UI for managing views - editing, renaming, changing permissions, and deleting views.

### New Files Created (3):

1. **`components/guests/view-manager/edit-view-dialog.tsx`**
   - Edit form for a single view
   - Fields: name, color, visibleToRoles, isPinned
   - Reuses ViewColorPicker and ViewRoleSelector components
   - Delete button with confirmation (opens DeleteViewDialog)
   - Uses `useUpdateGuestListView` hook

2. **`components/guests/view-manager/delete-view-dialog.tsx`**
   - AlertDialog confirmation for deleting a view
   - Uses `useDeleteGuestListView` hook
   - Shows view name in confirmation message

3. **`components/guests/view-manager/manage-views-dialog.tsx`**
   - Modal with table of all views
   - Columns: Color dot, Name, Visible To (role badges), Pinned, Actions
   - Actions per row: Edit (opens EditViewDialog), Delete (opens DeleteViewDialog)
   - Empty state when no custom views
   - System views shown separately with "System" badge

### Files Modified:

1. **`components/guests/view-manager/index.ts`**
   - Added exports for EditViewDialog, DeleteViewDialog, ManageViewsDialog

2. **`components/guests/guests-toolbar.tsx`**
   - Added edit button (gear icon) next to ViewSelector
   - Only visible when custom view is selected and user has MANAGE_EVENT permission
   - Passes `onManageViews` callback to ViewSelector

3. **`components/events/event-guests-tab.tsx`**
   - Added state for showEditViewDialog and showManageViewsDialog
   - Added handleEditView, handleManageViews, handleViewDeleted handlers
   - Renders EditViewDialog and ManageViewsDialog
   - Handles edge case: resets to "All Guests" when current view is deleted

4. **`components/navigation/nav-event-views.tsx`**
   - Added "Manage Views" link at bottom of views section
   - Only visible to owners/admins (MANAGE_EVENT permission)
   - Opens ManageViewsDialog

5. **`messages/en.json` & `messages/ar.json`**
   - Added translation keys: editView, editViewDescription, deleteView, deleteViewConfirm, updating, deleting, manageViewsTitle, manageViewsDescription, noCustomViews, noCustomViewsDescription, systemView, actions, pinned

### Access Points:

1. **Toolbar Edit Button**: Gear icon next to ViewSelector when viewing a custom view
2. **ViewSelector Dropdown**: "Manage Views" option in dropdown menu
3. **Sidebar**: "Manage Views" link under the Views section

### Permission Control:
- All management UI requires `MANAGE_EVENT` permission (owner, admin)
- System views cannot be deleted
- Edit button only appears for non-system views
