# Stage 5: Admin Dashboard UI for Events & Guests

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: Complete

## Objective

Build the admin dashboard UI for managing events and guests, aligned with Phase 1 requirements from the CRM Tech Brief. This includes event CRUD, guest management with virtual scrolling, Excel import, and RSVP tracking.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Event Detail Layout | Tabbed interface | Fewer clicks, all context in one place |
| Guest Table | Virtual scrolling | Load all guests, smooth UX for 500+ guests |
| Excel Import | Include in MVP | Critical for testing with real data |
| Modal Pattern | Sheet (slide-in) | Matches existing workspace modals |
| State Management | URL state (nuqs) | Shareable/bookmarkable filter URLs |

---

## Implementation Stages

Work is organized into 4 sub-phases for incremental delivery:

| Phase | Scope | Files |
|-------|-------|-------|
| 5A | Events List + Create Event | ~12 files |
| 5B | Event Detail with Tabs | ~10 files |
| 5C | Guests Table + CRUD | ~15 files |
| 5D | Excel Import + Categories | ~12 files |

---

## 5A: Events List & Create Event

### Route Configuration

**Update `lib/routes.ts`:**

```typescript
// Add to RouteName type
| "events"
| "event-detail"

// Add to ROUTES object
events: {
  name: "events",
  path: "/:slug/events",
  metadata: {
    title: documentTitle("Events"),
    description: "Manage your events",
  },
  metadataExtra: {
    name: "Events",
    icon: "calendar",
  },
},
"event-detail": {
  name: "event-detail",
  path: "/:slug/events/:eventSlug",
  metadata: {
    title: documentTitle("Event"),
  },
},

// Add to RouteParams
events: { slug: string }
"event-detail": { slug: string; eventSlug: string }
```

### Sidebar Navigation

**Update `components/navigation/app-sidebar.tsx`:**

Add Events to `dashboardRoutes` array between Dashboard and Analytics.

### Files to Create

```
app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/events/
├── page.tsx                          # Events list page
└── loading.tsx                       # Skeleton loader

components/events/
├── events-client.tsx                 # Client wrapper with Suspense/ErrorBoundary
├── events-list.tsx                   # Grid of event cards
├── event-card.tsx                    # Single event card with RSVP progress
├── events-list-skeleton.tsx          # Loading skeleton
├── event-status-badge.tsx            # Status badge component
└── create-event-button.tsx           # Button that opens modal

components/forms/
└── create-event-form.tsx             # Event creation form

components/modals/
└── create-event-modal.tsx            # Sheet-based create modal

hooks/
└── use-create-event-modal.ts         # nuqs-based modal state

lib/schemas/
└── event-schemas.ts                  # Zod schemas for event forms
```

### Events List Page

**`app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/events/page.tsx`:**

```typescript
import { Metadata } from "next"
import { HydrateClient, trpc } from "@/trpc/server"
import { ROUTES } from "@/lib/routes"
import { SectionWrapper } from "@/components/layout/section-wrapper"
import { EventsClient } from "@/components/events/events-client"

export const metadata: Metadata = ROUTES.events.metadata
export const dynamic = "force-dynamic"

type EventsPageProps = {
  params: Promise<{ slug: string }>
}

export default async function EventsPage({ params }: EventsPageProps) {
  const { slug } = await params
  void trpc.events.getMany.prefetch({ workspaceSlug: slug })

  return (
    <HydrateClient>
      <SectionWrapper>
        <EventsClient slug={slug} />
      </SectionWrapper>
    </HydrateClient>
  )
}
```

### Event Card Design

```
+------------------------------------------+
| EVENT NAME                    [● Active] |
| Dec 15, 2024 | Riyadh Convention Center  |
+------------------------------------------+
| RSVP Progress                            |
| ████████████████░░░░░░░  72% (145/200)   |
| Confirmed: 120 | Pending: 45 | Declined: 35|
+------------------------------------------+
| [View Details →]                         |
+------------------------------------------+
```

### Event Form Fields

- `name` (required) - Auto-generates slug
- `description` (optional)
- `eventType` (optional) - e.g., Conference, Gala, Summit
- `venue` / `venueAddress` (optional)
- `startDate` / `endDate` (optional)
- `rsvpDeadline` (optional)
- `maxGuests` (optional)

### tRPC Endpoints Used

- `events.getMany({ workspaceSlug })` - List events
- `events.create({ ... })` - Create event
- `guests.getStats({ eventId })` - For RSVP progress on cards

---

## 5B: Event Detail with Tabs

### Files to Create

```
app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/events/[eventSlug]/
├── page.tsx                          # Event detail page
└── loading.tsx                       # Skeleton loader

components/events/
├── event-detail-client.tsx           # Client wrapper
├── event-header.tsx                  # Event title, dates, actions
├── event-tabs.tsx                    # Tab navigation component
├── event-overview-tab.tsx            # Overview/stats tab content
├── event-guests-tab.tsx              # Guests tab (placeholder initially)
├── event-categories-tab.tsx          # Categories tab (placeholder)
├── event-settings-tab.tsx            # Settings tab content
└── rsvp-stats-cards.tsx              # Stats cards for overview
```

### Tab Structure

```typescript
const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "guests", label: "Guests", icon: Users, count: guestCount },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "settings", label: "Settings", icon: Settings },
]
```

### Event Header Design

```
+----------------------------------------------------------+
| [← Events]                                                |
| Annual Gala 2024                           [Edit] [...]   |
| Dec 15, 2024 • Riyadh Convention Center • 200 guests     |
+----------------------------------------------------------+
| [Overview] [Guests (200)] [Categories] [Settings]         |
+----------------------------------------------------------+
```

### Overview Tab Content

```
+---------------------------+---------------------------+
| RSVP RESPONSE RATE        | QUICK ACTIONS             |
| ██████████░░ 72%          | [Send Reminders]          |
| 145 of 200 guests         | [Export Guest List]       |
|                           | [Copy RSVP Template]      |
+---------------------------+---------------------------+
| BY STATUS                 | BY CATEGORY               |
| ● Confirmed: 120          | AAA: 45/50 (90%)          |
| ○ Pending: 45             | A: 60/80 (75%)            |
| ◐ Maybe: 15               | B: 40/70 (57%)            |
| ✕ Declined: 20            |                           |
+---------------------------+---------------------------+
```

### Settings Tab Fields

- Event details (name, dates, venue)
- RSVP settings (deadline, allow plus-one, max plus-ones)
- Branding (logo, colors) - simplified for MVP
- Status management (draft → active → completed)
- Delete event (with confirmation)

### tRPC Endpoints Used

- `events.getBySlug({ workspaceSlug, eventSlug })` - Event details
- `events.update({ eventId, ... })` - Update settings
- `events.delete({ eventId })` - Delete event
- `guests.getStats({ eventId })` - Statistics
- `guestCategories.getMany({ eventId })` - Category breakdown

---

## 5C: Guests Table with CRUD

### Files to Create

```
components/guests/
├── guests-client.tsx                 # Client wrapper
├── guests-table.tsx                  # Virtual scrolling table
├── guests-columns.tsx                # Column definitions
├── guests-toolbar.tsx                # Search, filters, bulk actions
├── guests-filters.tsx                # Status/category filter dropdowns
├── guest-row-actions.tsx             # Row action dropdown
├── guest-detail-sheet.tsx            # View/edit guest sheet
├── guest-status-badge.tsx            # Status badge with colors
├── guest-category-badge.tsx          # Category badge with color
├── guests-bulk-actions.tsx           # Bulk action toolbar
└── guests-table-skeleton.tsx         # Loading skeleton

components/forms/
└── guest-form.tsx                    # Create/edit guest form

components/modals/
└── add-guest-modal.tsx               # Sheet-based add guest

hooks/
├── use-add-guest-modal.ts            # Modal state
├── use-guests-filter.ts              # URL-synced filter state
└── use-guest-selection.ts            # Row selection state

lib/schemas/
└── guest-schemas.ts                  # Zod schemas for guest forms
```

### Virtual Scrolling Implementation

Use `@tanstack/react-virtual` for virtualized rendering:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

// Load ALL guests upfront (with loading state)
const { data: allGuests } = trpc.guests.getMany.useQuery({
  eventId,
  limit: 10000, // High limit to get all
})

// Apply client-side filtering
const filteredGuests = useMemo(() => {
  return allGuests?.guests.filter(guest => {
    if (statusFilter && guest.status !== statusFilter) return false
    if (categoryFilter && guest.categoryId !== categoryFilter) return false
    if (searchTerm && !matchesSearch(guest, searchTerm)) return false
    return true
  })
}, [allGuests, statusFilter, categoryFilter, searchTerm])

// Virtualize the rows
const virtualizer = useVirtualizer({
  count: filteredGuests?.length ?? 0,
  getScrollElement: () => tableContainerRef.current,
  estimateSize: () => 52, // Row height
  overscan: 10,
})
```

### Guests Table Design

```
+------------------------------------------------------------------+
| GUESTS (200)                              [+ Add Guest] [Import] |
+------------------------------------------------------------------+
| Search: [________________] | Status: [All ▼] | Category: [All ▼] |
+------------------------------------------------------------------+
| [☐] Selected: 0           | When selected: [Status ▼] [Delete]  |
+------------------------------------------------------------------+
| ☐ | NAME           | EMAIL            | CATEGORY | STATUS | ... |
| ☐ | Ahmed Al-Rashid| ahmed@gov.sa     | AAA      | ● Conf | ⋮  |
| ☐ | Sarah Johnson  | sarah@aramco.com | A        | ○ Pend | ⋮  |
| ☐ | Mike Chen      | mike@tech.com    | B        | ◐ Maybe| ⋮  |
+------------------------------------------------------------------+
| Showing 200 guests (filtered from 200)                           |
+------------------------------------------------------------------+
```

### Guest Form Fields

**Required:**
- `firstName`, `lastName`
- `categoryId` (dropdown)

**Optional:**
- `email`, `phone`
- `title` (Mr., Mrs., Dr., etc.)
- `position`, `entity`
- `dietaryRequirements`, `accessibilityNeeds`
- `internalNotes`

### Row Actions Menu

- View Details (opens sheet)
- Edit Guest
- Copy RSVP Link
- Regenerate RSVP Token
- Change Category →
- Change Status →
- Delete

### Bulk Actions

When rows selected:
- Change Status (dropdown with all statuses)
- Change Category (dropdown with categories)
- Delete Selected (with confirmation)

### Guest Detail Sheet

Slide-in sheet showing:
- Full guest info (editable)
- RSVP status with history
- Personalized RSVP link (copyable)
- Email history (if any)
- Activity timeline

### tRPC Endpoints Used

- `guests.getMany({ eventId, limit: 10000 })` - All guests
- `guests.create({ ... })` - Add guest
- `guests.update({ guestId, ... })` - Edit guest
- `guests.delete({ guestId })` - Delete guest
- `guests.bulkDelete({ eventId, guestIds })` - Bulk delete
- `guests.bulkUpdateStatus({ eventId, guestIds, status })` - Bulk status
- `guests.bulkUpdateCategory({ eventId, guestIds, categoryId })` - Bulk category
- `guests.regenerateRsvpToken({ guestId })` - New RSVP token
- `guestCategories.getMany({ eventId })` - For filter dropdown

---

## 5D: Excel Import & Categories

### Files to Create

```
components/guests/
├── import-guests-modal.tsx           # Full-screen import wizard
├── import-step-upload.tsx            # Step 1: File upload
├── import-step-mapping.tsx           # Step 2: Column mapping
├── import-step-category.tsx          # Step 3: Default category
├── import-step-preview.tsx           # Step 4: Preview data
├── import-step-progress.tsx          # Step 5: Import progress
└── import-column-mapper.tsx          # Column mapping UI

components/categories/
├── categories-client.tsx             # Client wrapper
├── categories-list.tsx               # Draggable category list
├── category-card.tsx                 # Single category with services
├── category-form.tsx                 # Create/edit category form
├── service-allocations-form.tsx      # Service config section
└── category-delete-dialog.tsx        # Confirm delete (checks guests)

lib/
└── excel-parser.ts                   # Excel parsing utilities
```

### Excel Import Wizard

**Step 1: Upload File**
- Drag & drop or file picker
- Accept .xlsx, .xls, .csv
- Show file name and size
- **Download Template button** - Generates Excel template with:
  - Headers: First Name, Last Name, Email, Phone, Position, Organization/Entity, Department, Category
  - Sample rows pre-populated with one row per category (showing category codes)
  - Column widths set for readability

**Step 2: Map Columns**
```
Excel Column          →    Guest Field
-------------------------------------------
[Column A: Name    ▼] →    First Name
[Column B: Surname ▼] →    Last Name
[Column C: Email   ▼] →    Email (Required)
[Column D: Company ▼] →    Entity
[Column E: Title   ▼] →    Position
[Column F: Cat     ▼] →    Category
[-- Skip --        ▼] →    Phone
```

- Auto-detection for column headers (firstName, lastName, email, category, etc.)
- Category column maps by code (case-insensitive, e.g., "AAA", "A", "B")

**Step 3: Select Default Category**
- Choose default category for guests without a category value
- If category column is mapped, per-row category codes are used when valid
- Invalid category codes skip the row with warning

**Step 4: Preview**
- Show first 5 rows with Name, Email, Entity, Category columns
- Show total count

**Step 5: Import**
- Progress bar
- Real-time count (50 of 200 imported)
- Error summary at end showing skipped rows:
  - Missing/invalid email count
  - Invalid category count
  - Missing name count

### Import tRPC Router (New)

Need to create `trpc/routers/guest-import.ts`:

```typescript
export const guestImportRouter = createTRPCRouter({
  // Process imported data in batches
  importBatch: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      guests: z.array(createGuestSchema).max(100),
      categoryId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Insert batch of guests
      // Return success count and errors
    }),
})
```

### Categories Tab Content

```
+----------------------------------------------------------+
| GUEST CATEGORIES                    [+ Add Category]      |
+----------------------------------------------------------+
| ⣿ AAA - VIP (Drag handle)                    [Edit] [⋮]  |
|   Hotel: 5-star Suite | Flight: Business Class           |
|   Transport: Private car | 45 guests                     |
+----------------------------------------------------------+
| ⣿ A - Premium                                [Edit] [⋮]  |
|   Hotel: 4-star Deluxe | Flight: Economy                 |
|   Transport: Shuttle | 80 guests                         |
+----------------------------------------------------------+
| ⣿ B - Standard                               [Edit] [⋮]  |
|   Hotel: 3-star Standard | Flight: Not included          |
|   Transport: Self-arrange | 75 guests                    |
+----------------------------------------------------------+
```

### Category Form Fields

**Basic:**
- `name` (required)
- `code` (required, max 10 chars, e.g., "AAA", "VIP")
- `description`
- `color` (color picker)

**Service Allocations:**
- `hotelStars` (1-5 dropdown)
- `roomType` (text: Suite, Deluxe, Standard)
- `flightClass` (Business, Economy, First)
- `flightIncluded` (boolean)
- `transportType` (text: Private, Shuttle, Self)
- `airportPickup` (boolean)

### Category Reordering

Use `@dnd-kit/core` for drag-and-drop:

```typescript
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

// On drag end, call reorder mutation
const handleDragEnd = (event) => {
  const newOrder = arrayMove(categories, oldIndex, newIndex)
  reorderMutation.mutate({
    eventId,
    categoryIds: newOrder.map(c => c.id),
  })
}
```

### tRPC Endpoints Used

- `guestCategories.getMany({ eventId })` - List categories
- `guestCategories.create({ ... })` - Add category
- `guestCategories.update({ categoryId, ... })` - Edit category
- `guestCategories.delete({ categoryId })` - Delete (fails if guests assigned)
- `guestCategories.reorder({ eventId, categoryIds })` - Reorder

---

## i18n Additions

Add to `messages/en.json` and `messages/ar.json`:

```json
{
  "events": {
    "title": "Events",
    "create": "Create Event",
    "empty": "No events yet",
    "emptyDescription": "Create your first event to get started",
    "fields": {
      "name": "Event Name",
      "description": "Description",
      "venue": "Venue",
      "startDate": "Start Date",
      "endDate": "End Date",
      "rsvpDeadline": "RSVP Deadline"
    },
    "status": {
      "draft": "Draft",
      "planning": "Planning",
      "rsvp_open": "RSVP Open",
      "completed": "Completed"
    }
  },
  "guests": {
    "title": "Guests",
    "add": "Add Guest",
    "import": "Import",
    "search": "Search guests...",
    "filters": {
      "status": "Status",
      "category": "Category",
      "all": "All"
    },
    "status": {
      "pending": "Pending",
      "invited": "Invited",
      "confirmed": "Confirmed",
      "declined": "Declined",
      "maybe": "Maybe"
    },
    "bulkActions": {
      "selected": "{count} selected",
      "changeStatus": "Change Status",
      "changeCategory": "Change Category",
      "delete": "Delete"
    }
  },
  "categories": {
    "title": "Guest Categories",
    "add": "Add Category",
    "services": "Service Allocations"
  },
  "import": {
    "title": "Import Guests",
    "upload": "Upload File",
    "mapping": "Map Columns",
    "category": "Select Category",
    "preview": "Preview",
    "importing": "Importing..."
  }
}
```

---

## Dependencies to Add

```bash
pnpm add @tanstack/react-virtual   # Virtual scrolling
pnpm add @dnd-kit/core @dnd-kit/sortable  # Drag and drop
pnpm add xlsx                      # Excel parsing
```

---

## Verification Checklist

After completing Stage 5:

### 5A: Events List
- [x] Events route appears in sidebar
- [x] Events list loads with RSVP progress
- [x] Create event modal works
- [x] New event redirects to detail page

### 5B: Event Detail
- [x] Tab navigation works
- [x] Overview shows correct stats
- [x] Settings tab can update event
- [ ] Delete event works with confirmation (not implemented - future enhancement)

### 5C: Guests Table
- [x] Virtual scrolling smooth with 500+ rows
- [x] Search filters client-side
- [x] Status/category filters work
- [x] Add guest creates with RSVP token
- [x] Edit guest in sheet works
- [x] Bulk actions work (delete implemented, status/category via hooks ready)
- [x] Copy RSVP link works

### 5D: Import & Categories
- [x] Excel upload parses correctly
- [x] Column mapping UI works
- [x] Import creates guests with tokens
- [x] Categories CRUD works
- [x] Download template with sample data (category codes pre-filled)
- [x] Category column support in import (per-row category assignment)
- [x] Email required validation on import
- [ ] Drag-reorder UI (endpoint exists, UI not implemented - future enhancement)
- [x] Cannot delete category with guests

---

## Critical Files Reference

Files to reference for patterns:

| Pattern | File |
|---------|------|
| Table component | `components/members/members-table.tsx` |
| Column definitions | `components/members/members-columns.tsx` |
| Client wrapper | `components/members/members-client.tsx` |
| Sheet modal | `components/modals/create-workspace-modal.tsx` |
| Modal hook | `hooks/use-create-workspace-modal.ts` |
| Form component | `components/forms/create-invite-form.tsx` |
| tRPC hooks | `trpc/hooks/events-hooks.ts`, `trpc/hooks/guests-hooks.ts` |
| Route config | `lib/routes.ts` |
| Sidebar nav | `components/navigation/app-sidebar.tsx` |

---

## Post-Implementation Notes

After Stage 5, the foundation is complete for Phase 1 requirements:

- [x] Multi-event support with different branding
- [x] Import guest list from Excel
- [x] Guest profiles with all info
- [x] Category-based service allocation (via categories)
- [x] Personalized RSVP link generation (auto on guest create)
- [x] Data collection (RSVP responses exist)
- [x] Basic reporting (stats on overview)

**Not included in Stage 5 (future stages):**
- Email template builder UI
- Bulk email sending
- Advanced analytics/charts
- RSVP form builder (custom fields)
- Branding preview
- Delete event confirmation modal
- Category drag-reorder UI

## Implementation Summary

### Phase 5A - Events List (Complete)
- Added events route to `lib/routes.ts`
- Added Events to sidebar navigation
- Created events list page with grid layout
- Created event cards with RSVP progress bars
- Created event status badges
- Implemented create event modal with nuqs URL state

### Phase 5B - Event Detail (Complete)
- Created event detail page with dynamic route `[eventSlug]`
- Implemented tabbed interface (Overview, Guests, Categories, Settings)
- Overview tab shows RSVP stats with progress bar and status breakdown
- Settings tab with full event configuration form
- Event header with breadcrumbs

### Phase 5C - Guests Table (Complete)
- Implemented virtual scrolling with `@tanstack/react-virtual`
- Guest table with checkbox selection
- Status and category badges
- Client-side search and filtering
- Add guest modal with form
- Guest detail sheet with inline editing
- Bulk delete functionality
- Copy RSVP link and regenerate token

### Phase 5D - Import & Categories (Complete)
- Excel import wizard with:
  - File upload (xlsx, xls, csv)
  - Auto-detect column mapping
  - Column mapping UI
  - Default category selection
  - Preview before import
  - Progress indicator
- Category management:
  - Add/Edit/Delete categories
  - Color picker with presets
  - Description field
  - Dropdown actions menu
