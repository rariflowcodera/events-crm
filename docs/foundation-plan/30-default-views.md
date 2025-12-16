# Phase 30: Default View Feature for Guest List Views

## Status: COMPLETED

### Progress Summary
| Task | Status | Notes |
|------|--------|-------|
| Schema changes | Done | Added `isDefault` field + index |
| tRPC router updates | Done | Added 3 new procedures + updated mutations |
| Hook updates | Done | Added 3 new hooks |
| Component updates | Done | Load default view on mount |
| i18n | Skipped | Using English directly for now |
| Build verification | Done | TypeScript compiles |

---

## Overview

Add a **default view** feature so each event can have one view that loads automatically when the guests tab opens. Also convert "All Guests" from a pseudo-view to a real saveable system view.

## Requirements

1. **Per-event default view**: Each event has ONE default view that auto-loads on page open
2. **Make "All Guests" saveable**: Convert from `currentViewId = null` to a real system view that can be customized and saved
3. **Default indicator**: Show star icon next to default view in dropdown
4. **"Set as Default" action**: Menu option to set any view as default

---

## Implementation Steps

### Phase 1: Schema Changes

**File:** `server/db/schemas/guest-list-view.ts`

Add `isDefault` field:
```typescript
isDefault: boolean("is_default").default(false).notNull(),
```

Add index for efficient lookups:
```typescript
index("guest_list_view_default_idx").on(table.eventId, table.isDefault),
```

Run migration:
```bash
npm run db:generate && npm run db:migrate
```

---

### Phase 2: tRPC Router Updates

**File:** `trpc/routers/guest-list-views.ts`

Add 3 new procedures:

1. **`getOrCreateAllGuestsView`** - Get or auto-create the "All Guests" system view
   - Creates with `isSystem: true`, `isDefault: true` if missing
   - Uses `DEFAULT_VIEW_CONFIG` from `lib/guest-columns.ts`

2. **`getDefaultView`** - Get the default view for an event
   - Returns view where `isDefault: true`

3. **`setDefault`** - Set a view as default
   - Unsets previous default first (only ONE default per event)
   - Updates view with `isDefault: true`

Update existing mutations:
- **`create`**: Add `isDefault` to input, unset others if true
- **`update`**: Add `isDefault` to input, unset others if true
- **`delete`**: If deleting default, cascade to "All Guests" system view

---

### Phase 3: Hook Updates

**File:** `trpc/hooks/guest-list-views-hooks.ts`

Add new hooks:
```typescript
useDefaultGuestListView(eventId)      // Fetch default view
useAllGuestsView(eventId)             // Get/create "All Guests" system view
useSetDefaultGuestListView()          // Mutation to set default
```

---

### Phase 4: Component Updates

#### 4.1 EventGuestsTab
**File:** `components/events/event-guests-tab.tsx`

- Add `useDefaultGuestListView` and `useAllGuestsView` hooks
- On mount: Load default view config instead of hardcoded DEFAULT_VIEW_CONFIG
- Update `handleViewSelect`: Use "All Guests" system view instead of null
- Add `handleSetDefault` handler

#### 4.2 ViewSelector
**File:** `components/guests/view-manager/view-selector.tsx`

- Add `onSetDefault` prop
- Show star icon next to default view
- Add "Set as Default" menu option

#### 4.3 GuestsToolbar
**File:** `components/guests/guests-toolbar.tsx`

- Add `onSetDefault` prop
- Pass through to ViewSelector

---

### Phase 5: i18n

**Files:** `messages/en.json`, `messages/ar.json`

Add translations:
```json
"setAsDefault": "Set as Default",
"defaultView": "Default View"
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `server/db/schemas/guest-list-view.ts` | Add `isDefault` field + index |
| `trpc/routers/guest-list-views.ts` | Add 3 procedures, update create/update/delete |
| `trpc/hooks/guest-list-views-hooks.ts` | Add 3 new hooks |
| `components/events/event-guests-tab.tsx` | Load default view on mount |
| `components/guests/view-manager/view-selector.tsx` | Default indicator + menu |
| `components/guests/guests-toolbar.tsx` | Pass onSetDefault prop |
| `messages/en.json`, `messages/ar.json` | i18n strings |

---

## UI Changes

### ViewSelector Dropdown
```
┌────────────────────────────┐
│ All Guests            ⭐ ✓ │  ← Star = default, Check = selected
├────────────────────────────┤
│ 🔵 VIP Guests              │
│ 🟢 Confirmed               │
│ 🟠 Pending Follow-up       │
├────────────────────────────┤
│ 💾 Save Changes            │
│ ⭐ Set as Default          │  ← NEW
│ ➕ Save As New View        │
│ ⚙️ Manage Views            │
└────────────────────────────┘
```

---

## Flow: Page Load with Default View

```
1. User opens Guests Tab
2. useDefaultGuestListView(eventId) → returns default view
3. If no default exists:
   - useAllGuestsView(eventId) → creates "All Guests" system view
   - This becomes the default automatically
4. Apply default view's config (columns, filters, sorting)
5. Render table
```

---

## Edge Cases

- **Delete default view**: Cascade default to "All Guests" system view
- **Only one default**: Setting new default unsets previous
- **"All Guests" protected**: `isSystem: true` prevents deletion
