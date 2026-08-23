# Stage 46: Workspace Guest Directory

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: Planned

## Objective

Add a workspace-level "Guest Directory" that shows every guest across every event in the workspace in one place, and lets a user add a guest they find there into another event's guest list — without going through the existing manual "Add Guest" form or the Excel bulk-upload flow.

## Background

- Guests today (`server/db/schemas/guest.ts:36-159`) are strictly per-event: `guest.eventId` is `NOT NULL`, cascade-deleted with the event, and email de-duplication (`trpc/routers/guests.ts:338-351`, in `create`) only checks within a single event. There is **no** workspace-level "person"/contact identity table.
- `trpc/routers/events.ts:100-150` (`getWorkspaceStats`, Stage 45) is the existing precedent for a workspace-scoped procedure: resolve `workspace` by slug, check `workspaceMembers` membership, then join across all events in that workspace. This stage follows the same shape.
- The existing per-event guest list (`components/guests/guests-data-table.tsx`, `guests-toolbar.tsx`, and the view/column-config system in `lib/guest-columns.ts`) is heavily coupled to a single event (categories, saved views, VAPP, per-event bulk actions). Reusing it as-is for a cross-event view would require threading "which event" through nearly every cell. This stage builds a **new, simpler, purpose-built table** for the directory instead of retrofitting the event-scoped one.
- `hasPermission({ userId, workspaceId, permissionName })` (`server/queries/permissions.ts`) already accepts a `workspaceId` directly (not just via an event), so the existing `VIEW_GUESTS` / `MANAGE_GUESTS` permissions can be reused unchanged for workspace-level checks — no new permission needed.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Cross-event identity | **No schema change.** Aggregate existing per-event `guest` rows, grouped client/query-side by lowercased email (guests without an email are listed individually, ungrouped) | Guests are fully siloed per event by design (own RSVP token/category/status per event). Introducing a real workspace-level contact table is a much bigger migration than this stage needs — grouping by email gives "one row per person" without touching the schema. |
| Directory query | New `guests.getWorkspaceGuests` procedure, modeled on `events.getWorkspaceStats` (workspace lookup by slug + membership check, then join `guest` → `event` on `event.workspaceId`) | Matches existing workspace-scoped query pattern (Stage 45); avoids N+1 by fetching all event-scoped guest rows in one query and grouping in application code. |
| "Add to event" action | New `guests.addToEvent` mutation: given a source `guestId` + `targetEventId` + `categoryId`, copies the source guest's personal/contact fields into a brand-new `guest` row owned by the target event | Reuses `create`'s validation (category belongs to event, per-event email dedup, RSVP token/short-code/VAPP-serial generation) rather than inventing a new guest-creation path. The source guest record is untouched — this is a copy, not a move, consistent with guests being per-event. |
| Fields copied on "Add to event" | Name fields, contact fields (email/phone/whatsapp), professional fields (position/entity/department), country, gender, salutation/title, profile image | RSVP-token, status, category, tags, internal notes, and event-specific fields (serial number, attendance, email-activity timestamps) are **not** copied — they're re-derived or chosen fresh for the target event. |
| Grouping key edge case | Guests with no email are never grouped together (each is its own directory row) | Grouping nameless/emailless guests by name would produce false-positive merges; email is the only reasonably reliable identity signal available today. |
| Directory page location | New route `/[slug]/guests` (workspace-level, sibling of `/[slug]/dashboard`) | Matches existing workspace-level routing convention (`dashboard/`, `analytics/` under `(sidebar)/(breadcrumbs)/`), distinct from the per-event `/[slug]/events/[eventSlug]/guests`. |
| Table implementation | New lightweight component (`components/guests/workspace-guests-table.tsx`), not a reuse/extension of `GuestsDataTable` | See Background — the existing table assumes a single event's categories/views; a directory row instead spans N events, which doesn't fit that model. |
| Permissions | Reuse `PERMISSIONS.VIEW_GUESTS` (page/query) and `PERMISSIONS.MANAGE_GUESTS` (add-to-event mutation), checked with the workspace's own id | No new permission needed; these are already role-scoped per workspace, not per event. |

## Implementation Phases

| Phase | Scope | Files |
|-------|-------|-------|
| 46A | Backend: `guests.getWorkspaceGuests` query procedure | `trpc/routers/guests.ts` |
| 46B | Backend: `guests.addToEvent` mutation | `trpc/routers/guests.ts` |
| 46C | Hooks | `trpc/hooks/guests-hooks.ts` |
| 46D | UI: directory page + table | new page + client + table components |
| 46E | UI: "Add to event" modal | new component |
| 46F | Navigation: sidebar link | `lib/routes.ts`, `components/navigation/app-sidebar-content.tsx` |

---

## 46A: `guests.getWorkspaceGuests`

```ts
getWorkspaceGuests: protectedProcedure
  .input(z.object({
    workspaceSlug: z.string(),
    search: z.string().optional(),
    limit: z.number().min(1).max(200).default(50),
    offset: z.number().min(0).default(0),
  }))
  .query(async ({ ctx, input }) => {
    // resolve workspace by slug, check workspaceMembers membership (see events.getWorkspaceStats)
    // check hasPermission(VIEW_GUESTS, workspace.id)
    // select guest.* + event {id, name, slug, status} for all events in workspace,
    //   optional ILIKE search across firstName/lastName/email/entity
    // group in application code by lower(email) (fallback: guest.id when email is null)
    //   into { key, firstName, lastName, email, phone, country, profileImage, participations: [{ guestId, eventId, eventName, eventSlug, eventStatus, status, categoryName }] }
    // paginate over the grouped directory entries (not raw guest rows), return { entries, total, hasMore }
  })
```

## 46B: `guests.addToEvent`

```ts
addToEvent: protectedProcedure
  .input(z.object({
    sourceGuestId: z.string().uuid(),
    targetEventId: z.string().uuid(),
    categoryId: z.string().uuid(),
  }))
  .mutation(async ({ ctx, input }) => {
    // load source guest + its event (for workspaceId)
    // load target event, verify same workspaceId as source guest's event
    // hasPermission(MANAGE_GUESTS, targetEvent.workspaceId)
    // verify categoryId belongs to targetEventId
    // dedup check: existing guest in targetEventId with same lower(email) -> CONFLICT
    // generate rsvpToken/rsvpShortCode/serialNumber exactly as `create` does
    // insert new guest row in targetEventId copying: firstName, lastName, preferredName,
    //   displayNameAr, title, salutation, salutationAr, gender, country, position, entity,
    //   department, email, phone, whatsapp, profileImage
    // return new guest
  })
```

## 46C: Hooks (`trpc/hooks/guests-hooks.ts`)

- `useWorkspaceGuests({ workspaceSlug, search, limit, offset })` — wraps `getWorkspaceGuests`.
- `useAddGuestToEvent()` — wraps `addToEvent`; invalidate `guests.getWorkspaceGuests` and the target event's `guests.getMany`/`getStats` on success.

## 46D: Directory page + table

- `app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/guests/page.tsx` — server component, prefetches `guests.getWorkspaceGuests`, renders `<WorkspaceGuestsClient slug={slug} />`.
- `components/guests/workspace-guests-client.tsx` — search input, loading/empty states, renders `WorkspaceGuestsTable`.
- `components/guests/workspace-guests-table.tsx` — one row per directory entry: name, email, phone, country, an "Events" cell listing badges (event name + status per participation), and an "Add to Event" row action.

## 46E: "Add to event" modal

- `components/guests/add-guest-to-event-modal.tsx` — given a directory entry: select a target event (workspace's events, excluding ones the person is already in), select a category (loaded from the target event once chosen), confirm → `useAddGuestToEvent`. Success toast + link to the guest in the target event.

## 46F: Navigation

- Add a `guests` entry to `ROUTES` in `lib/routes.ts` (path `/:slug/guests`, icon `users`) and its `RouteParams["guests"] = { slug: string }`.
- Add `ROUTES.guests` to `workspaceRoutes` in `components/navigation/app-sidebar-content.tsx`.

---

## Verification Checklist

- [ ] 46A: `getWorkspaceGuests` returns grouped entries across multiple events, respects membership/permission checks, search filters correctly
- [ ] 46B: `addToEvent` blocks cross-workspace targets, blocks duplicate email in target event, generates a fresh RSVP token/short code/VAPP serial, does not mutate the source guest
- [ ] 46C: hooks invalidate the right query keys after add-to-event
- [ ] 46D: `/[slug]/guests` renders, search works, pagination works
- [ ] 46E: modal only lists events the person isn't already in; category list updates when target event changes
- [ ] 46F: sidebar shows "Guests" workspace-level link; active-state highlighting works

## File Structure Summary

```
trpc/routers/guests.ts                                  [MODIFIED] + getWorkspaceGuests, addToEvent
trpc/hooks/guests-hooks.ts                               [MODIFIED] + useWorkspaceGuests, useAddGuestToEvent
lib/routes.ts                                            [MODIFIED] + guests workspace route
components/navigation/app-sidebar-content.tsx            [MODIFIED] + Guests nav link
components/guests/workspace-guests-client.tsx            [NEW] directory page client
components/guests/workspace-guests-table.tsx             [NEW] directory table
components/guests/add-guest-to-event-modal.tsx           [NEW] add-to-event modal
app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/guests/page.tsx  [NEW] directory route
```

## Related Documents

- [45-workspace-dashboard-kpis.md](./45-workspace-dashboard-kpis.md) — workspace-scoped query pattern this stage follows
- [04-routers-rsvp.md](./04-routers-rsvp.md) — original guests router design
