# Phase 29: Proper Data Grid UI with View Management

## Status: COMPLETED

### Progress Summary
| Task | Status | Notes |
|------|--------|-------|
| Full-width canvas layout | ✅ Done | Removed SectionWrapper constraint for guests tab |
| Full-height layout | ✅ Done | Grid fills entire viewport height with footer at bottom |
| Horizontal scroll layout | ✅ Done | Table now scrolls horizontally with sticky select/actions columns |
| Column resizing | ✅ Done | TanStack Table column resizing with drag handles |
| ViewSelector updates | ✅ Done | Added unsaved changes indicator, save option in dropdown |
| Command bar redesign | ✅ Done | ViewSelector integrated, cleaner layout |
| View state management | ✅ Done | EventGuestsTab manages view selection and saving |
| Footer row | ✅ Done | Shows total guest count at bottom of table |
| Build verification | ✅ Done | TypeScript compiles, build succeeds |

### Files Modified
- `app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/events/[eventSlug]/page.tsx` - Full-width mode for guests tab
- `app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/layout.tsx` - Full-height flex layout
- `components/events/event-detail-client.tsx` - fullWidth prop for edge-to-edge layout
- `components/events/event-tabs.tsx` - fullHeight prop passthrough
- `components/events/event-guests-tab.tsx` - fullHeight support, flex layout
- `components/guests/guests-data-table.tsx` - fillHeight prop, column resizing, footer row
- `components/guests/guests-toolbar.tsx` - ViewSelector integration, new props
- `components/guests/view-manager/view-selector.tsx` - Save changes option, unsaved indicator

### Key Changes
1. **Full-width/Full-height Layout**:
   - Page detects guests tab and passes `fullWidth={true}` to EventDetailClient
   - EventDetailClient renders without SectionWrapper when fullWidth
   - Layout uses flex column with overflow-auto for full-height
   - GuestsDataTable accepts `fillHeight` prop to fill available space
2. **GuestsDataTable**:
   - Column resizing enabled with `columnResizeMode: 'onChange'` and `enableColumnResizing: true`
   - `ColumnResizeHandle` component for drag-to-resize columns
   - Column widths persisted to viewConfig
   - Full-width canvas with `minWidth: 1200px`
   - Border between column headers for visual separation
   - Footer row showing total guest count
3. **ViewSelector**: Shows yellow dot when changes are unsaved. "Save Changes" option saves to current view.
4. **GuestsToolbar**: ViewSelector on left, Filters + Columns next, guest count after separator.
5. **EventGuestsTab**: Tracks `currentViewId` and `savedViewConfig`, computes `hasUnsavedChanges`, handles view switching and saving.

---

## Goal
Transform the guests table into a proper full-width data grid like Notion, with:
1. Full canvas width with horizontal scroll
2. Clean command bar at top
3. View dropdown to switch between saved views
4. "Save" button to update current view
5. "Save As" button to create new views

---

## Part 1: Full-Width Data Grid Layout

### Problem
Current table is constrained by:
- `SectionWrapper` with `max-w-7xl` (1280px max)
- Table wrapped in `rounded-md border` without horizontal overflow
- No sticky column support

### Solution

#### 1.1 Update EventGuestsTab Layout
`components/events/event-guests-tab.tsx`:
- Remove spacing constraints on table container
- Allow table to expand to full width

#### 1.2 Update GuestsDataTable for Horizontal Scroll
`components/guests/guests-data-table.tsx`:
- Add horizontal scroll container
- Make select column and actions column sticky (left/right)
- Ensure header row stays aligned with body during scroll

```tsx
// New wrapper structure:
<div className="rounded-md border">
  {/* Fixed header */}
  <div className="overflow-x-auto">
    <div style={{ minWidth: totalColumnWidth }}>
      {/* Header row */}
      {/* Virtual body with horizontal scroll sync */}
    </div>
  </div>
</div>
```

---

## Part 2: Command Bar Redesign

### New Command Bar Layout
```
+---------------------------------------------------------------------+
| [All Guests v] | [Filters (3)] | [Columns] | [Save] [Save As v]     |
| --------------   ------------     --------   -----------------      |
| View selector    Filter toggle    Column     View save actions      |
|                                   picker                             |
|                                                                      |
|                         [Export] [Import] [+ Add Guest]              |
+---------------------------------------------------------------------+
```

### 2.1 Integrate ViewSelector into Toolbar
`components/guests/guests-toolbar.tsx`:
- Add ViewSelector dropdown on the left (switches between views)
- ViewSelector shows: current view name, saved views list, "Create New View"

### 2.2 Add View Save Controls
New props for GuestsToolbar:
```tsx
interface GuestsToolbarProps {
  // Existing props...

  // New view management props
  currentViewId?: string          // ID of currently active view (null = default)
  currentViewName?: string        // Name to display in selector
  hasUnsavedChanges?: boolean     // Show indicator when config differs from saved
  onViewSelect?: (viewId: string | null) => void
  onSaveView?: () => void         // Update current view
  onSaveAsView?: () => void       // Open save-as dialog
}
```

### 2.3 Update Save/Save As Logic
- **Save**: Updates the currently selected view with current config
- **Save As**: Opens dialog to create new view (existing SaveViewDialog)
- **Default view**: When no view selected, "Save" creates a new view (becomes Save As)

---

## Part 3: View Switching Logic

### 3.1 Update EventGuestsTab State
`components/events/event-guests-tab.tsx`:
- Add `currentViewId` state (null = default/unsaved)
- Add `savedViewConfig` to track original view config
- Compute `hasUnsavedChanges` by comparing current vs saved config

```tsx
const [currentViewId, setCurrentViewId] = useState<string | null>(null)
const [savedViewConfig, setSavedViewConfig] = useState<GuestListViewConfig | null>(null)

const hasUnsavedChanges = useMemo(() => {
  if (!savedViewConfig) return false
  return JSON.stringify(viewConfig) !== JSON.stringify(savedViewConfig)
}, [viewConfig, savedViewConfig])
```

### 3.2 View Selection Handler
When user selects a view:
1. Fetch view config from API (or use cached)
2. Update `viewConfig` state with view's config
3. Update `currentViewId` and `savedViewConfig`

### 3.3 Save Current View
Add tRPC mutation to update existing view:
```tsx
// In trpc/routers/guest-list-views.ts - already exists
update: protectedProcedure
  .input(z.object({
    viewId: z.string(),
    config: GuestListViewConfigSchema,
    // Optional: name, color, etc.
  }))
  .mutation(...)
```

---

## Part 4: ViewSelector Component Updates

### 4.1 Update ViewSelector
`components/guests/view-manager/view-selector.tsx`:
- Show "All Guests" as default option
- Show saved views with color dots
- Add divider
- Add "Save Current View" (disabled if no changes)
- Add "Create New View"
- Add "Manage Views" link

### 4.2 ViewSelector Props
```tsx
interface ViewSelectorProps {
  eventId: string
  currentViewId: string | null
  currentViewName: string
  hasUnsavedChanges: boolean
  onViewSelect: (viewId: string | null) => void
  onSaveView: () => void
  onCreateView: () => void
}
```

---

## Implementation Steps

### Step 1: GuestsDataTable Layout Fix
- Add horizontal scroll container
- Calculate total width from column widths
- Ensure header/body scroll together

### Step 2: ViewSelector Integration
- Update ViewSelector component with new props
- Integrate into GuestsToolbar (left side)

### Step 3: Save/Save As Buttons
- Add Save button (enabled when hasUnsavedChanges)
- Keep Save As button (opens SaveViewDialog)
- Update button visibility logic

### Step 4: EventGuestsTab View State
- Add currentViewId state
- Add view selection handler
- Add save view handler (calls update mutation)
- Wire up hasUnsavedChanges

### Step 5: tRPC Update Mutation
- Already exists in guest-list-views router
- Hook `useUpdateGuestListView` already available

---

## Files to Modify

1. `components/guests/guests-data-table.tsx` - Horizontal scroll layout
2. `components/guests/guests-toolbar.tsx` - Add ViewSelector + Save buttons
3. `components/guests/view-manager/view-selector.tsx` - Enhanced view dropdown
4. `components/events/event-guests-tab.tsx` - View state management
5. `trpc/routers/guest-list-views.ts` - Already has update mutation
6. `trpc/hooks/guest-list-views-hooks.ts` - Already has update hook

---

## UI Mockup (Final State)

```
+--------------------------------------------------------------------------+
| [All Guests v]  [Filters (2)]  [Columns]    [Save] [Save As v]           |
|                                              [Export] [+ Add]            |
+--------------------------------------------------------------------------+
| When Filters expanded:                                                   |
| [Search...] [Status v] [Category v] [Country v] [Clear]                  |
+--------------------------------------------------------------------------+
| <- Horizontal scroll ->                                                  |
| [ ] | Name    | Email   | Entity | Country | Category | Status | ...    |
| [ ] | Aaron   | aaron@  | Acme   | USA     | VIP      | OK     | ...    |
| [ ] | Beth    | beth@   | Beta   | UK      | General  | --     | ...    |
+--------------------------------------------------------------------------+
| 215 guests                                                               |
+--------------------------------------------------------------------------+
```
