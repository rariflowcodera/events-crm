# Stage 2: Cleanup & Workspace→Organization Rename

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: ✅ COMPLETED

## Objective

Remove demo/boilerplate code from the original "Boring Template" to prepare the codebase for Events CRM development.

---

## Completion Summary

**Completed on**: November 29, 2025

### What Was Done

#### Phase A: File Deletions ✅

All demo/boilerplate code was successfully removed:

1. **Stripe/Payments** - Deleted billing components, webhook routes, stripe library, pricing pages
2. **Items CRUD** - Deleted item schema, routes, components, actions, hooks
3. **Notifications System** - Deleted notification schema, routes, components, in-app notifications
4. **Feedback System** - Deleted feedback forms, modals, routes, email templates
5. **Onboarding Flow** - Deleted onboarding pages, checklist components, user settings fields
6. **Keyboard Shortcuts** - Deleted shortcut library, keybinding hooks
7. **Playground** - Deleted dev demo pages

#### Phase B: Registry Updates & Build Fixes ✅

- Updated `trpc/routers/_app.ts` - removed deleted routers (items, notifications, feedbacks, subscriptions)
- Updated `server/db/schemas.ts` - removed deleted schema exports
- Updated `lib/routes.ts` - removed deleted route definitions
- Updated `lib/schemas.ts` - removed deleted Zod schemas
- Updated `types/types.ts` - removed deleted type definitions
- Fixed all import errors in dependent files
- Removed unused hooks and API client methods
- Simplified components that referenced deleted functionality

#### Phase C: Workspace→Organization Rename ⏭️ SKIPPED

**Decision**: Keep "Workspace" terminology as-is.

**Rationale**:
- The rename would touch 1200+ occurrences across 100+ files
- High risk of introducing bugs with minimal functional benefit
- "Workspace" is a reasonable term for the multi-tenant concept
- Can be revisited later if needed for branding/terminology consistency

### Final State

```bash
# Build passes successfully
npm run build ✅

# Current tRPC routers
- users
- workspaces (kept as-is)
- members
- invitations
```

### Files/Folders Deleted

| Category | Items Removed |
|----------|--------------|
| Stripe/Payments | `lib/stripe.ts`, `app/api/webhook/stripe/`, `components/billing/`, `components/pricing/`, `components/mail/receipt-mail.tsx`, settings/billing page |
| Items CRUD | `server/db/schemas/item.ts`, `trpc/routers/items.ts`, `trpc/hooks/items-hooks.ts`, `app/api/items/`, `components/item/`, create-item modal/form/button |
| Notifications | `server/db/schemas/notification.ts`, `trpc/routers/notifications.ts`, `components/notification/`, settings/notifications page |
| Feedback | `trpc/routers/feedbacks.ts`, `app/api/feedback/`, `components/modals/create-feedback-modal.tsx`, feedback button/form |
| Onboarding | `app/(web)/onboarding/`, onboarding-checklist components, `components/layout/onboarding-wrapper.tsx` |
| Shortcuts | `lib/shortcuts.ts`, `hooks/use-key-press.ts`, `components/global/keyboard-shortcut.tsx` |
| Playground | `app/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/playground/`, `components/playground/` |
| Subscriptions | `trpc/routers/subscriptions.ts`, `trpc/hooks/subscriptions-hooks.ts`, usage-banner component |

### Verification

- [x] All deleted files removed
- [x] No import errors for removed modules
- [x] No TypeScript errors
- [x] Build passes (`npm run build`)
- [x] Navigation works correctly
- [x] Settings pages accessible

---

## Original Plan (For Reference)

The sections below document the original plan. Sections 2.3-2.6 were **not implemented** due to the decision to keep "Workspace" terminology.

<details>
<summary>Click to expand original deletion plan (2.1-2.2)</summary>

### 2.1 Files and Folders to DELETE

#### Stripe/Payments (Not Needed)

| Type | Path |
|------|------|
| Lib | `lib/stripe.ts` |
| API Route | `app/api/webhook/stripe/route.ts` |
| API Route | `app/api/stripe/route.ts` (if exists) |
| Components | `components/billing/` (entire folder) |
| Components | `components/pricing/` (entire folder) |
| Email | `components/mail/receipt-mail.tsx` |
| App Routes | `app/(web)/(dashboard)/[slug]/settings/billing/` (entire folder) |
| App Routes | `app/(marketing)/pricing/` (entire folder, if exists) |

#### Items CRUD (Demo Code)

| Type | Path |
|------|------|
| Schema | `server/db/schemas/item.ts` |
| tRPC Router | `trpc/routers/items.ts` |
| tRPC Hooks | `trpc/hooks/items-hooks.ts` |
| API Route | `app/api/items/route.ts` |
| API Route | `app/api/items/[itemId]/route.ts` |
| Server Action | `server/actions/item-actions.ts` |
| Server Hook | `server/hooks/use-item-api.ts` |
| App Routes | `app/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/items/` (entire folder) |
| Components | `components/item/` (entire folder) |
| Modal | `components/modals/create-item-modal.tsx` |
| Form | `components/forms/create-item-form.tsx` |
| Button | `components/buttons/create-item-button.tsx` |
| Analytics | `components/analytics/analytics-items-grid.tsx` |
| Hook | `hooks/use-create-item-modal.ts` |

#### Notifications System

| Type | Path |
|------|------|
| Schema | `server/db/schemas/notification.ts` |
| tRPC Router | `trpc/routers/notifications.ts` |
| tRPC Hooks | `trpc/hooks/notifications-hooks.ts` |
| Server Action | `server/actions/notification-actions.ts` |
| Server Hook | `server/hooks/use-notification-api.ts` |
| App Route | `app/(web)/(dashboard)/[slug]/settings/notifications/page.tsx` |
| Components | `components/notification/` (entire folder) |
| Button | `components/buttons/notification-archive-all-button.tsx` |
| Form | `components/forms/edit-notifications-form.tsx` |

#### Feedback System

| Type | Path |
|------|------|
| tRPC Router | `trpc/routers/feedbacks.ts` |
| tRPC Hooks | `trpc/hooks/feedbacks-hooks.ts` |
| API Route | `app/api/feedback/route.ts` |
| Server Action | `server/actions/feedback-actions.ts` |
| Server Hook | `server/hooks/use-feedback-api.ts` |
| Modal | `components/modals/create-feedback-modal.tsx` |
| Form | `components/forms/create-feedback-form.tsx` |
| Button | `components/buttons/feedback-button.tsx` |
| Email | `components/mail/feedback-mail.tsx` |
| Hook | `hooks/use-create-feedback-modal.ts` |

#### Onboarding Flow

| Type | Path |
|------|------|
| App Routes | `app/(web)/onboarding/` (entire folder) |
| Component | `components/layout/onboarding-wrapper.tsx` |
| Component | `components/global/onboarding-checklist.tsx` |
| Component | `components/global/onboarding-checklist-item.tsx` |

#### Keyboard Shortcuts

| Type | Path |
|------|------|
| Lib | `lib/shortcuts.ts` |
| Hook | `hooks/use-key-press.ts` |
| Component | `components/global/keyboard-shortcut.tsx` |

#### Playground (Development Demo)

| Type | Path |
|------|------|
| App Routes | `app/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/playground/` (entire folder) |
| Component | `components/playground/playground-wrapper.tsx` |

### 2.2 Update Central Registries After Deletion

#### `trpc/routers/_app.ts`

Remove these router imports and registrations:

```typescript
// Remove imports:
import { itemsRouter } from "@/trpc/routers/items"
import { notificationsRouter } from "@/trpc/routers/notifications"
import { feedbacksRouter } from "@/trpc/routers/feedbacks"

// Remove from appRouter:
// items: itemsRouter,
// notifications: notificationsRouter,
// feedbacks: feedbacksRouter,
```

</details>

<details>
<summary>Click to expand original rename plan (2.3-2.6) - NOT IMPLEMENTED</summary>

### 2.3 Database Migration: Workspace → Organization

```sql
-- NOT IMPLEMENTED - Keeping workspace terminology
ALTER TABLE "workspace" RENAME TO "organization";
-- etc.
```

### 2.4 File Renames

| Current Path | New Path |
|-------------|----------|
| `server/db/schemas/workspace.ts` | `server/db/schemas/organization.ts` |
| ... | ... |

### 2.5 Global Search & Replace

| Search | Replace |
|--------|---------|
| `workspace` | `organization` |
| `Workspace` | `Organization` |
| ... | ... |

### 2.6 Update `_app.ts` Router Registry

```typescript
// NOT IMPLEMENTED - Keeping workspaces router name
organizations: organizationsRouter,
```

</details>

---

## Next Stage

→ [Stage 3: Domain Schema & i18n](./03-domain-schema-i18n.md)
