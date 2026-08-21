# Stage 45: Workspace Dashboard KPIs & Event Cover Images

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: Planned

## Objective

The workspace "Dashboard" page (`app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/dashboard/page.tsx`) currently renders nothing but the events list (`EventsClient`). This stage adds:

1. **KPI cards** at the top of the dashboard summarizing the workspace's events at a glance (total events, upcoming events, total guests invited, overall response rate).
2. **Cover images** on each event card in the events grid, so events are visually distinguishable in the list.

## Background

- The workspace already has a separate **Analytics** page (`.../analytics/page.tsx`) showing generic member/invitation counts (`AnalyticsGrid` — total members, pending invitations, active invitations). That page is a leftover from the underlying SaaS template ("The Boring Template") and is not event-domain-specific. It is **out of scope** for this stage and is left untouched.
- Stage 26 (`26-event-dashboard.md`) already introduced `DashboardStatTile`, a generic label/value/icon tile component used on the per-event dashboard. This stage reuses that component for workspace-level tiles rather than building a new one.
- Events currently have no image field. `EventBranding.logo` exists but is the RSVP-page brand logo, not a representative photo for the event, and shows on public guest-facing pages — reusing it for internal dashboard cards would leak an unrelated concern.
- Image uploads already have an established pattern: `components/global/image-upload.tsx` (`ImageUpload`) drives `/api/image-upload` for a presigned S3/local URL, then a tRPC mutation persists the resulting URL onto the owning record (see `workspaces.updateLogo` in `trpc/routers/workspaces.ts:294`). This stage follows the same pattern for events.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| KPI tile component | Reuse `DashboardStatTile` (Stage 26) | Already styled, loading-state aware, consistent with per-event dashboard |
| KPI metrics | Total events, upcoming events (startDate ≥ today), total guests invited, overall response rate | Matches metrics already computed per-event (Stage 26 stats endpoint) rolled up workspace-wide |
| Response rate definition | confirmed / (total − pending) if any responses exist, else "—" | Mirrors existing per-event stat logic; avoids divide-by-zero noise for brand-new workspaces |
| Cover image field | New `coverImage: text` column on `event` table | Distinct from `branding.logo` (public RSVP branding); this is an internal, admin-only visual |
| Cover image upload UX | New `EventCoverImageUpload` wrapping shared `ImageUpload` component | Reuses presign/upload plumbing; only the persistence mutation differs (`events.updateCoverImage`) |
| Cover image placement | Event Settings tab (`event-settings-tab.tsx`) + optional field on Create Event form | Keep creation flow simple (image optional at creation, editable after) |
| Fallback when no image | Existing icon-based placeholder background on `EventCard` | No image is a valid/expected state, not an error |
| Analytics page | Left untouched | Out of scope; a separate cleanup stage should decide whether to repurpose or remove it |

---

## Implementation Phases

| Phase | Scope | Files |
|-------|-------|-------|
| 45A | Schema: `coverImage` column on `event` | 1 migration + schema file |
| 45B | Backend: workspace KPI stats endpoint | 1 router file, 1 hook file |
| 45C | Backend: event cover image upload mutation | 1 router file |
| 45D | UI: Workspace KPI row on dashboard | 1–2 components |
| 45E | UI: Event card cover image | `event-card.tsx`, `events-list.tsx` (Event type) |
| 45F | UI: Cover image upload control in event settings | 1 component, `event-settings-tab.tsx` |
| 45G | i18n translations | `messages/en.json`, `messages/ar.json` |

---

## 45A: Schema — Event Cover Image

**Modify `server/db/schemas/event.ts`:**

```ts
coverImage: text("cover_image"), // Internal admin-facing photo shown on event cards/dashboard
```

Add alongside existing top-level columns (near `branding`). Generate + run migration:

```bash
npm run db:generate
npm run db:migrate
```

---

## 45B: Backend — Workspace KPI Stats

**Add to `trpc/routers/events.ts`:**

```ts
getWorkspaceStats: protectedProcedure
  .input(z.object({ workspaceSlug: z.string() }))
  .query(async ({ ctx, input }) => {
    // Same workspace lookup + membership check pattern as getMany (events.ts:64-85)

    const workspaceEvents = await db.query.events.findMany({
      where: eq(events.workspaceId, workspace.id),
      columns: { id: true, startDate: true },
    })

    const totalEvents = workspaceEvents.length
    const upcomingEvents = workspaceEvents.filter(
      (e) => e.startDate && e.startDate >= new Date()
    ).length

    const guestCounts = await db
      .select({
        status: guests.status,
        count: sql<number>`count(*)::int`,
      })
      .from(guests)
      .innerJoin(events, eq(guests.eventId, events.id))
      .where(eq(events.workspaceId, workspace.id))
      .groupBy(guests.status)

    const totalGuests = guestCounts.reduce((sum, r) => sum + r.count, 0)
    const confirmed = guestCounts.find((r) => r.status === "confirmed")?.count ?? 0
    const pending = guestCounts.find((r) => r.status === "pending")?.count ?? 0
    const responded = totalGuests - pending
    const responseRate = responded > 0 ? Math.round((confirmed / responded) * 100) : null

    return { totalEvents, upcomingEvents, totalGuests, responseRate }
  }),
```

**Add hook to `trpc/hooks/events-hooks.ts`:**

```ts
export const useWorkspaceStats = (workspaceSlug: string) =>
  trpc.events.getWorkspaceStats.useQuery({ workspaceSlug })
```

---

## 45C: Backend — Event Cover Image Mutation

**Add to `trpc/routers/events.ts`:**

```ts
updateCoverImage: protectedProcedure
  .input(z.object({ eventId: z.string().uuid(), coverImage: z.string().nullable() }))
  .mutation(async ({ ctx, input }) => {
    // Verify event exists + membership, same pattern as other event mutations
    await db
      .update(events)
      .set({ coverImage: input.coverImage, updatedAt: new Date() })
      .where(eq(events.id, input.eventId))
    return { success: true }
  }),
```

Reuses `getPreSignedUrl` / `uploadFileToS3` from `server/hooks/use-image-upload.ts` — no new upload endpoint needed. `/api/image-upload` already supports arbitrary callers; only the persistence mutation is event-specific.

---

## 45D: UI — Workspace KPI Row

**New `components/events/workspace-stat-row.tsx`:**

```tsx
"use client"
import { useWorkspaceStats } from "@/trpc/hooks/events-hooks"
import { DashboardStatTile } from "@/components/events/dashboard-stat-tile"
import { Calendar, CalendarClock, Users, TrendingUp } from "lucide-react"

export function WorkspaceStatRow({ slug }: { slug: string }) {
  const { data, isLoading } = useWorkspaceStats(slug)

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <DashboardStatTile label="Total Events" value={data?.totalEvents ?? 0} icon={Calendar} isLoading={isLoading} />
      <DashboardStatTile label="Upcoming Events" value={data?.upcomingEvents ?? 0} icon={CalendarClock} isLoading={isLoading} />
      <DashboardStatTile label="Total Guests Invited" value={data?.totalGuests ?? 0} icon={Users} isLoading={isLoading} />
      <DashboardStatTile
        label="Response Rate"
        value={data?.responseRate !== null ? `${data?.responseRate}%` : "—"}
        icon={TrendingUp}
        isLoading={isLoading}
      />
    </div>
  )
}
```

**Modify `components/events/events-client.tsx`:** render `<WorkspaceStatRow slug={slug} />` above `EventsHeader`.

**Modify `app/.../dashboard/page.tsx`:** prefetch `trpc.events.getWorkspaceStats.prefetch({ workspaceSlug: slug })` alongside the existing `getMany` prefetch.

---

## 45E: UI — Event Card Cover Image

**Modify `components/events/event-card.tsx`:**
- Add `coverImage: string | null` to the `Event` interface.
- Render a `next/image` cover (16:9, `object-cover`) above `CardHeader` when `coverImage` is set.
- When absent, keep current card layout unchanged (no placeholder image fetch, just no image block) — matches existing "no details added yet" tolerance for missing data.

**Modify `components/events/events-list.tsx`:** add `coverImage` to the local `Event` type (mirrors the `getMany` shape).

**Modify `trpc/routers/events.ts` `getMany`:** no column selection changes needed — `db.query.events.findMany` already returns all columns including the new `coverImage`.

---

## 45F: UI — Cover Image Upload in Event Settings

**New `components/events/event-cover-image-upload.tsx`:** thin wrapper around `components/global/image-upload.tsx`'s `ImageUpload`, calling `trpc.events.updateCoverImage.useMutation()` on change instead of the workspace-logo mutation branch (`ImageUpload`'s `type="logo"` path is workspace-specific — this event use case needs its own `onChange` handler rather than a new `type` variant, to avoid coupling unrelated domains inside the shared component).

**Modify `components/events/event-settings-tab.tsx`:** add a "Cover Image" field using the new wrapper, placed near existing event metadata fields.

---

## 45G: Translations

Add keys under `event.dashboard.*` (en/ar) for the four KPI labels, and `event.settings.coverImage.*` for the upload field label/help text, following the existing bilingual key structure in `messages/en.json` / `messages/ar.json`.

---

## Verification Checklist

### 45A: Schema
- [ ] Migration generated and applied; `coverImage` nullable, no data loss
- [ ] `npm run db:studio` shows new column on `event` table

### 45B: Workspace Stats
- [ ] `getWorkspaceStats` enforces the same membership check as `getMany`
- [ ] Response rate returns `null` (rendered as "—") when no guests have responded yet, not `NaN`/`Infinity`
- [ ] Counts match manual SQL spot-check against a seeded workspace

### 45C: Cover Image Mutation
- [ ] `updateCoverImage` rejects requests from non-members (same auth pattern as other event mutations)
- [ ] Setting `coverImage: null` clears an existing image

### 45D: KPI Row
- [ ] Tiles show skeleton state while loading, real values after
- [ ] Row renders correctly for a workspace with zero events (all tiles show 0 / "—", no crash)

### 45E: Event Card Image
- [ ] Cards with a cover image show it; cards without one render exactly as before (no broken-image icon, no layout shift)
- [ ] Image is lazy-loaded / uses `next/image` sizing, no CLS

### 45F: Upload Control
- [ ] Upload → preview → persists via `updateCoverImage` → visible immediately on the dashboard event card
- [ ] Remove clears the image and updates the card

### 45G: Translations
- [ ] All new UI strings resolve in both `en` and `ar`, RTL layout unaffected

---

## File Structure Summary

```
server/db/schemas/event.ts                         [MODIFIED] +coverImage column
trpc/routers/events.ts                              [MODIFIED] +getWorkspaceStats, +updateCoverImage
trpc/hooks/events-hooks.ts                           [MODIFIED] +useWorkspaceStats
components/events/workspace-stat-row.tsx             [NEW]
components/events/event-cover-image-upload.tsx       [NEW]
components/events/event-card.tsx                     [MODIFIED] +coverImage rendering
components/events/events-list.tsx                    [MODIFIED] +coverImage on Event type
components/events/events-client.tsx                  [MODIFIED] +WorkspaceStatRow
components/events/event-settings-tab.tsx              [MODIFIED] +cover image field
app/.../dashboard/page.tsx                            [MODIFIED] +getWorkspaceStats prefetch
messages/en.json, messages/ar.json                    [MODIFIED] +new keys
```

## Related Documents

- [26-event-dashboard.md](./26-event-dashboard.md) — origin of `DashboardStatTile`, reused here
- [09-branding-system.md](./09-branding-system.md) — `EventBranding.logo`, the RSVP-facing field this stage deliberately does not reuse
