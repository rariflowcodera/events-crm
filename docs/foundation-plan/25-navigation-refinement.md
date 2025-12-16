# Stage 25: Navigation Refinement - Context-Aware Sidebar

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: Complete

## Objective

Refactor the sidebar navigation to be context-aware when viewing events. Move event tabs from horizontal top navigation to the left sidebar for better mobile experience and more content real estate. Add event switcher dropdown, role-based menu visibility, and configurable navigation settings per workspace.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Event navigation location | Sidebar (not top tabs) | Better mobile UX, more content space |
| Sidebar content when in event | Both event + workspace items | Event items at top, workspace items below separator |
| Navigation config approach | Full flexibility | Toggle each menu item per role in workspace settings |
| Event switcher display | Name + status badge | Quick identification of event state |
| Member default visibility | Overview, Guests, Reports | Core viewing sections for stakeholders |

---

## Current State

### Sidebar Navigation (`components/navigation/app-sidebar.tsx`)
- Shows: Dashboard, Events, Analytics, Docs, Settings
- Has role-based filtering via `nav-main-filtered.tsx` (hides Analytics for members)
- Uses `usePermissions()` hook for role checking

### Event Tabs (`components/events/event-tabs.tsx`)
- 8 tabs: Overview, Guests, Categories, Forms, Branding, Emails, Reports, Settings
- URL-based state (`?tab=<value>`)
- Already has permission checks per tab action

### Permissions System
- 4 roles: Owner, Admin, Manager, Member
- `usePermissions(slug)` hook with `can()`, `isRole()` helpers
- Permission constants in `lib/permissions.ts`

---

## Target State

### When Viewing an Event (`/:slug/events/:eventSlug`)

```
+----------------------------------+
| [Event Switcher Dropdown    v]   |  <- Shows current event, click to switch
+----------------------------------+
| Overview                         |
| Guests                           |
| Categories                       |
| Forms                            |
| Branding                         |
| Email Templates                  |
| Reports                          |
| Settings                         |
+----------------------------------+
| ─────────────────────────────── |  <- Separator
| Dashboard                        |
| Settings                         |
| User Guide                       |
+----------------------------------+
```

### When NOT Viewing an Event (`/:slug/dashboard`, etc.)

```
+----------------------------------+
| [Workspace Switcher         v]   |
+----------------------------------+
| Dashboard                        |
| Settings                         |
| User Guide                       |
+----------------------------------+
```

### Navigation Changes
- **Remove**: Events link (replaced by event switcher)
- **Hide**: Analytics (entirely removed from nav)
- **Keep**: Dashboard
- **Move**: User Guide below Settings

---

## Implementation Plan

### Phase 1: Database Schema

**File: `server/db/schemas/workspace.ts`**

Add new type and field for storing navigation visibility settings:

```typescript
// ============================================================================
// Workspace Navigation Settings Type
// ============================================================================

export type NavigationSettings = {
  eventNav?: {
    overview?: string[]      // Roles that can see this item
    guests?: string[]
    categories?: string[]
    forms?: string[]
    branding?: string[]
    emails?: string[]
    reports?: string[]
    settings?: string[]
  }
  workspaceNav?: {
    dashboard?: string[]
    docs?: string[]
    settings?: string[]
  }
}

// Add to workspaces table:
navigationSettings: json("navigation_settings").$type<NavigationSettings>(),
```

**Default Visibility:**

| Item | Owner | Admin | Manager | Member |
|------|-------|-------|---------|--------|
| Overview | Yes | Yes | Yes | Yes |
| Guests | Yes | Yes | Yes | Yes |
| Categories | Yes | Yes | Yes | No |
| Forms | Yes | Yes | Yes | No |
| Branding | Yes | Yes | Yes | No |
| Emails | Yes | Yes | Yes | No |
| Reports | Yes | Yes | Yes | Yes |
| Settings | Yes | Yes | No | No |

---

### Phase 2: Event Context Detection

**New File: `hooks/use-event-context.ts`**

Hook to detect if user is viewing an event based on URL pathname:

```typescript
"use client"

import { usePathname } from "next/navigation"

export function useEventContext() {
  const pathname = usePathname()

  // Pattern: /[locale]/[slug]/events/[eventSlug]
  const segments = pathname.split("/")
  const eventsIndex = segments.indexOf("events")

  // Check if we're in event context (not create page)
  const isEventContext = eventsIndex !== -1 &&
    segments[eventsIndex + 1] &&
    !["create"].includes(segments[eventsIndex + 1])

  const eventSlug = isEventContext ? segments[eventsIndex + 1] : null
  const workspaceSlug = segments[2] // After locale

  return {
    isEventContext,
    eventSlug,
    workspaceSlug,
  }
}
```

---

### Phase 3: Event Switcher Component

**New File: `components/navigation/event-switcher.tsx`**

Dropdown component to switch between events:

```typescript
"use client"

import { trpc } from "@/trpc/client"
import { useTranslations } from "next-intl"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Icons } from "@/components/global/icons"

interface EventSwitcherProps {
  workspaceSlug: string
  currentEventSlug: string
}

export function EventSwitcher({ workspaceSlug, currentEventSlug }: EventSwitcherProps) {
  const t = useTranslations()
  const { data: events } = trpc.events.getMany.useQuery({ workspaceSlug })

  // Sort by startDate DESC (upcoming first)
  const sortedEvents = events?.sort((a, b) => {
    if (!a.startDate) return 1
    if (!b.startDate) return -1
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  })

  const currentEvent = events?.find(e => e.slug === currentEventSlug)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton className="w-full">
          <Icons.calendar className="size-4" />
          <span className="flex-1 truncate">{currentEvent?.name ?? t("nav.selectEvent")}</span>
          <Icons.chevronsUpDown className="ml-auto size-4 opacity-50" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        {sortedEvents?.map(event => (
          <DropdownMenuItem key={event.id} asChild>
            <Link
              href={`/${workspaceSlug}/events/${event.slug}`}
              className="flex items-center justify-between"
            >
              <span className="truncate">{event.name}</span>
              <Badge variant={getStatusVariant(event.status)} className="ml-2">
                {event.status}
              </Badge>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function getStatusVariant(status: string) {
  switch (status) {
    case "draft": return "secondary"
    case "planning": return "outline"
    case "rsvp_open": return "default"
    case "completed": return "success"
    case "cancelled": return "destructive"
    default: return "secondary"
  }
}
```

---

### Phase 4: Event Navigation Component

**New File: `components/navigation/nav-event.tsx`**

Event-specific navigation with role-based filtering:

```typescript
"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { usePermissions } from "@/hooks/use-permissions"
import { trpc } from "@/trpc/client"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { Icons } from "@/components/global/icons"

const eventNavItems = [
  { key: "overview", tab: null, icon: "dashboard", labelKey: "nav.overview" },
  { key: "guests", tab: "guests", icon: "users", labelKey: "guest.guests" },
  { key: "categories", tab: "categories", icon: "layers", labelKey: "guest.categories" },
  { key: "forms", tab: "forms", icon: "formInput", labelKey: "forms.title" },
  { key: "branding", tab: "branding", icon: "brush", labelKey: "branding.title" },
  { key: "emails", tab: "emails", icon: "mail", labelKey: "email.templates" },
  { key: "reports", tab: "reports", icon: "chart", labelKey: "rsvpReports.reports" },
  { key: "settings", tab: "settings", icon: "settings", labelKey: "common.settings" },
] as const

const defaultVisibility: Record<string, string[]> = {
  overview: ["owner", "admin", "manager", "member"],
  guests: ["owner", "admin", "manager", "member"],
  categories: ["owner", "admin", "manager"],
  forms: ["owner", "admin", "manager"],
  branding: ["owner", "admin", "manager"],
  emails: ["owner", "admin", "manager"],
  reports: ["owner", "admin", "manager", "member"],
  settings: ["owner", "admin"],
}

interface NavEventProps {
  workspaceSlug: string
  eventSlug: string
}

export function NavEvent({ workspaceSlug, eventSlug }: NavEventProps) {
  const t = useTranslations()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab") ?? "overview"
  const { role } = usePermissions(workspaceSlug)

  // Get navigation settings from workspace
  const { data: workspace } = trpc.workspaces.getOne.useQuery({ slug: workspaceSlug })
  const navSettings = workspace?.navigationSettings?.eventNav

  // Filter items based on role visibility
  const visibleItems = eventNavItems.filter(item => {
    const allowedRoles = navSettings?.[item.key] ?? defaultVisibility[item.key]
    return allowedRoles.includes(role)
  })

  const basePath = `/${workspaceSlug}/events/${eventSlug}`

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t("nav.eventManagement")}</SidebarGroupLabel>
      <SidebarMenu>
        {visibleItems.map(item => {
          const Icon = Icons[item.icon]
          const href = item.tab ? `${basePath}?tab=${item.tab}` : basePath
          const isActive = item.tab ? currentTab === item.tab : currentTab === "overview"

          return (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton isActive={isActive} asChild>
                <Link href={href}>
                  <Icon className="size-4" />
                  <span>{t(item.labelKey)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
```

---

### Phase 5: Sidebar Restructuring

**File: `components/navigation/app-sidebar.tsx`**

Transform to context-aware sidebar:

```typescript
import { HydrateClient, trpc } from "@/trpc/server"
import { RouteConfigType, ROUTES } from "@/lib/routes"
import { useEventContext } from "@/hooks/use-event-context"
import { EventSwitcher } from "@/components/navigation/event-switcher"
import { NavEvent } from "@/components/navigation/nav-event"
// ... other imports

// Workspace-level routes (shown when NOT in event context OR below separator)
const workspaceRoutes: RouteConfigType[] = [
  ROUTES.dashboard,
]

// Misc routes (always at bottom)
const miscRoutes: RouteConfigType[] = [
  {
    name: "settings",
    path: "/settings/workspace",
    metadata: { title: "Settings" },
    metadataExtra: { name: "Settings", icon: "settings" },
  },
  ROUTES.docs, // User Guide moved below Settings
]

export function AppSidebar({ slug, ...props }: AppSidebarProps) {
  const { isEventContext, eventSlug } = useEventContext()

  void trpc.workspaces.getSwitcher.prefetch({ slug })
  if (isEventContext) {
    void trpc.events.getMany.prefetch({ workspaceSlug: slug })
  }

  return (
    <Sidebar collapsible="icon" {...props} className="overflow-hidden border-transparent">
      <SidebarHeader>
        {isEventContext && eventSlug ? (
          <HydrateClient>
            <EventSwitcher workspaceSlug={slug} currentEventSlug={eventSlug} />
          </HydrateClient>
        ) : (
          <HydrateClient>
            <WorkspaceSwitcher slug={slug} />
          </HydrateClient>
        )}
        <Search />
      </SidebarHeader>

      <SidebarContent className="gap-0 bg-transparent">
        {isEventContext && eventSlug ? (
          <>
            {/* Event navigation */}
            <HydrateClient>
              <NavEvent workspaceSlug={slug} eventSlug={eventSlug} />
            </HydrateClient>

            {/* Separator */}
            <Separator className="my-2" />

            {/* Workspace navigation */}
            <NavMainFiltered routes={workspaceRoutes} slug={slug} label="Workspace" />
          </>
        ) : (
          <NavMainFiltered routes={workspaceRoutes} slug={slug} label="Main" />
        )}

        <NavMain routes={miscRoutes} slug={slug} className="mt-auto" label="Misc" />
      </SidebarContent>

      <SidebarFooter>
        {/* ... existing footer */}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
```

---

### Phase 6: Event Content Component

**File: `components/events/event-tabs.tsx`**

Transform from tabs UI to content-only renderer (rename to `event-content.tsx`):

```typescript
"use client"

import { useSearchParams } from "next/navigation"
import { EventOverviewTab } from "@/components/events/event-overview-tab"
import { EventGuestsTab } from "@/components/events/event-guests-tab"
import { EventCategoriesTab } from "@/components/events/event-categories-tab"
import { EventEmailsTab } from "@/components/email-templates/event-emails-tab"
import { EventReportsTab } from "@/components/events/event-reports-tab"
import { EventSettingsTab } from "@/components/events/event-settings-tab"
import { EventFormsTab } from "@/components/events/event-forms-tab"
import { EventBrandingTab } from "@/components/events/event-branding-tab"

interface EventContentProps {
  event: Event
  workspaceSlug: string
}

type TabValue = "overview" | "guests" | "categories" | "forms" | "branding" | "emails" | "reports" | "settings"

export function EventContent({ event, workspaceSlug }: EventContentProps) {
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get("tab") as TabValue) ?? "overview"

  switch (activeTab) {
    case "overview":
      return <EventOverviewTab event={event} workspaceSlug={workspaceSlug} />
    case "guests":
      return <EventGuestsTab event={event} workspaceSlug={workspaceSlug} />
    case "categories":
      return <EventCategoriesTab event={event} workspaceSlug={workspaceSlug} />
    case "forms":
      return <EventFormsTab event={event} workspaceSlug={workspaceSlug} />
    case "branding":
      return <EventBrandingTab event={event} workspaceSlug={workspaceSlug} />
    case "emails":
      return <EventEmailsTab event={event} workspaceSlug={workspaceSlug} />
    case "reports":
      return <EventReportsTab event={event} workspaceSlug={workspaceSlug} />
    case "settings":
      return <EventSettingsTab event={event} workspaceSlug={workspaceSlug} />
    default:
      return <EventOverviewTab event={event} workspaceSlug={workspaceSlug} />
  }
}
```

---

### Phase 7: tRPC Endpoints

**File: `trpc/routers/workspaces.ts`**

Add procedures for navigation settings:

```typescript
// Get navigation settings
getNavigationSettings: protectedProcedure
  .input(z.object({ slug: z.string() }))
  .query(async ({ ctx, input }) => {
    const workspace = await ctx.db.query.workspaces.findFirst({
      where: eq(workspaces.slug, input.slug),
      columns: { navigationSettings: true },
    })
    return workspace?.navigationSettings ?? null
  }),

// Update navigation settings
updateNavigationSettings: protectedProcedure
  .input(z.object({
    workspaceId: z.string().uuid(),
    settings: navigationSettingsSchema, // Define Zod schema
  }))
  .mutation(async ({ ctx, input }) => {
    // Check MANAGE_WORKSPACE permission
    await requirePermission(ctx, input.workspaceId, PERMISSIONS.MANAGE_WORKSPACE)

    await ctx.db
      .update(workspaces)
      .set({ navigationSettings: input.settings, updatedAt: new Date() })
      .where(eq(workspaces.id, input.workspaceId))

    return { success: true }
  }),
```

---

### Phase 8: Navigation Settings UI

**New Route: `app/[locale]/(web)/(dashboard)/[slug]/settings/navigation/page.tsx`**

**New Component: `components/workspace/workspace-navigation-settings.tsx`**

Matrix table UI:
- Rows: Navigation items (Overview, Guests, Categories, etc.)
- Columns: Roles (Owner, Admin, Manager, Member)
- Cells: Checkboxes (Owner column always checked/disabled)

Add "Navigation" to settings sidebar routes in `app/[locale]/(web)/(dashboard)/[slug]/settings/layout.tsx`:

```typescript
const workspaceSettingsRoutes = [
  ROUTES["settings-workspace"],
  ROUTES["settings-members"],
  ROUTES["settings-branding"],
  ROUTES["settings-navigation"], // New
]
```

---

### Phase 9: i18n Updates

**Files: `messages/en.json`, `messages/ar.json`**

```json
{
  "nav": {
    "overview": "Overview",
    "switchEvent": "Switch Event",
    "selectEvent": "Select Event",
    "eventManagement": "Event Management",
    "backToWorkspace": "Back to Workspace"
  },
  "settings": {
    "navigation": "Navigation",
    "navigationDescription": "Configure which menu items each role can see",
    "eventNavigation": "Event Navigation",
    "workspaceNavigation": "Workspace Navigation"
  }
}
```

---

## Files Summary

### Modified Files

| File | Changes |
|------|---------|
| `server/db/schemas/workspace.ts` | Add `NavigationSettings` type and field |
| `components/navigation/app-sidebar.tsx` | Context-aware rendering, remove Events/Analytics |
| `components/events/event-tabs.tsx` | Remove tabs UI, keep content rendering (rename to `event-content.tsx`) |
| `components/events/event-detail-client.tsx` | Use `EventContent` instead of `EventTabs` |
| `trpc/routers/workspaces.ts` | Add navigation settings endpoints |
| `app/.../settings/layout.tsx` | Add navigation route to settings sidebar |
| `lib/routes.ts` | Add `settings-navigation` route |
| `messages/en.json` | Add navigation translations |
| `messages/ar.json` | Add navigation translations (Arabic) |

### New Files

| File | Purpose |
|------|---------|
| `hooks/use-event-context.ts` | Detect event context from URL |
| `components/navigation/event-switcher.tsx` | Event dropdown switcher |
| `components/navigation/nav-event.tsx` | Event navigation items with role filtering |
| `components/workspace/workspace-navigation-settings.tsx` | Settings UI component |
| `app/.../settings/navigation/page.tsx` | Navigation settings page |
| `server/db/migrations/XXXX_navigation_settings.sql` | Database migration |

---

## Migration Notes

- Existing `?tab=X` URLs continue to work (backwards compatible)
- No breaking changes to event detail routes
- Default navigation settings preserve current behavior for existing workspaces
- Analytics route still works via direct URL access (just hidden from nav)

---

## Mobile Considerations

The sidebar approach is inherently better for mobile:
- Sidebar collapses to icons only
- Touch targets are larger than horizontal tabs
- Vertical scrolling is more natural on mobile
- Swipe gestures work with sidebar

Ensure:
- Event switcher dropdown is touch-friendly (min 44px touch targets)
- Event nav items have sufficient padding
- Collapsible sidebar behavior preserved

---

## Verification Checklist

After completing Stage 25:

### Event Context Detection
- [x] Sidebar detects when viewing an event
- [x] Event switcher appears in event context
- [x] Workspace switcher appears in non-event context

### Event Switcher
- [x] Shows all workspace events sorted by start date
- [x] Displays event name + status badge
- [x] Current event is highlighted
- [x] Clicking event navigates to its Overview tab

### Event Navigation
- [x] All 8 event nav items show for Owner/Admin
- [x] Manager sees all except Settings
- [x] Member sees only Overview, Guests, Reports
- [x] Active tab is highlighted in sidebar
- [x] URL updates with `?tab=X` parameter

### Navigation Settings
- [x] Settings page accessible from workspace settings
- [x] Matrix shows all items x all roles
- [x] Owner column always checked/disabled
- [x] Changes save correctly
- [x] Changes reflect immediately in sidebar

### Backwards Compatibility
- [x] Direct URLs like `/:slug/events/:eventSlug?tab=guests` still work
- [x] Browser back/forward works correctly
- [x] Deep links to specific tabs work

### Mobile
- [x] Sidebar collapses correctly
- [x] Event switcher works on touch devices
- [x] Navigation items are touch-friendly

---

## Implementation Summary

### Completed Implementation

**Date Completed**: December 2024

#### Phase 1: Database Schema
- Added `NavigationSettings` type to `server/db/schemas/workspace.ts`
- Added `navigationSettings` JSON field to workspaces table
- Generated migration `0011_dazzling_black_bird.sql`

#### Phase 2: Event Context Detection
- Created `hooks/use-event-context.ts`
- Detects event context from URL pathname
- Returns `isEventContext`, `eventSlug`, `workspaceSlug`

#### Phase 3: Event Switcher Component
- Created `components/navigation/event-switcher.tsx`
- Dropdown shows all events sorted by start date (upcoming first)
- Displays event name + status badge with color coding
- Current event highlighted, "View All Events" link at bottom

#### Phase 4: Event Navigation Component
- Created `components/navigation/nav-event.tsx`
- 8 navigation items matching former tabs
- Role-based visibility filtering from workspace settings
- Falls back to sensible defaults if not configured

#### Phase 5: Sidebar Restructuring
- Converted `components/navigation/app-sidebar.tsx` to client component
- Created `components/navigation/app-sidebar-content.tsx` for conditional rendering
- Shows event switcher + event nav when in event context
- Shows workspace switcher when not in event context
- Dashboard, Settings, User Guide always shown below separator
- Removed Events and Analytics from navigation

#### Phase 6: Event Content Component
- Transformed `components/events/event-tabs.tsx`
- Removed TabsList and TabsTrigger UI
- Now renders content based on `?tab=X` URL parameter
- Navigation handled by sidebar instead

#### Phase 7: tRPC Endpoints
- Added `workspaces.getNavigationSettings` query
- Added `workspaces.updateNavigationSettings` mutation
- Permission check for MANAGE_WORKSPACE on updates

#### Phase 8: Navigation Settings UI
- Added `settings-navigation` route to `lib/routes.ts`
- Created `app/.../settings/navigation/page.tsx`
- Created `components/workspace/workspace-navigation-settings-client.tsx`
- Matrix table with checkboxes for each item × role combination
- Owner always has access (disabled checkboxes)
- Reset to defaults and save buttons

#### Phase 9: i18n Updates
- Added `nav` section to `messages/en.json` and `messages/ar.json`
- Translations: overview, switchEvent, selectEvent, eventManagement, viewAllEvents, backToWorkspace

### Files Created

| File | Purpose |
|------|---------|
| `hooks/use-event-context.ts` | Detect event context from URL |
| `components/navigation/event-switcher.tsx` | Event dropdown switcher |
| `components/navigation/nav-event.tsx` | Event navigation items with role filtering |
| `components/navigation/app-sidebar-content.tsx` | Conditional sidebar content rendering |
| `components/workspace/workspace-navigation-settings-client.tsx` | Settings UI component |
| `app/[locale]/(web)/(dashboard)/[slug]/settings/navigation/page.tsx` | Navigation settings page |
| `server/db/migrations/0011_dazzling_black_bird.sql` | Database migration |

### Files Modified

| File | Changes |
|------|---------|
| `server/db/schemas/workspace.ts` | Added `NavigationSettings` type and field |
| `components/navigation/app-sidebar.tsx` | Converted to client component, context-aware rendering |
| `components/events/event-tabs.tsx` | Removed tabs UI, content-only renderer |
| `components/global/icons.tsx` | Added `layoutGrid` icon |
| `trpc/routers/workspaces.ts` | Added navigation settings endpoints |
| `app/.../settings/layout.tsx` | Added navigation route to settings sidebar |
| `lib/routes.ts` | Added `settings-navigation` route |
| `messages/en.json` | Added nav translations |
| `messages/ar.json` | Added nav translations (Arabic)
