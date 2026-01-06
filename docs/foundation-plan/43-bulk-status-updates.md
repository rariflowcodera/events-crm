# Stage 43: Bulk Status Updates

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: In Progress

## Objective

Add an "Update Status" action to the guest actions dropdown that opens a dialog allowing bulk status updates for selected guests.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Bulk Support | Yes | Works with any number of selected guests |
| Permission | MANAGE_GUESTS | Consistent with other guest management operations |
| Position in Menu | After "Send Email" | Logical grouping with bulk operations |
| Icon | RefreshCw | Represents status change/update |

---

## Existing Infrastructure

The backend already supports bulk status updates:

- **tRPC Mutation**: `trpc.guests.bulkUpdateStatus` (`trpc/routers/guests.ts:757-800`)
- **React Hook**: `useBulkUpdateGuestStatus` (`trpc/hooks/guests-hooks.ts:151`)
- **Permission**: `PERMISSIONS.MANAGE_GUESTS`

---

## Implementation Phases

| Phase | Scope | Files | Status |
|-------|-------|-------|--------|
| 43A | Update Status Dialog | 1 file | Pending |
| 43B | Actions Dropdown Integration | 2 files | Pending |
| 43C | Event Guests Tab Integration | 1 file | Pending |
| 43D | Translations | 2 files | Pending |

---

## 43A: Update Status Dialog

**Create `components/guests/update-status-dialog.tsx`:**

```typescript
interface UpdateStatusDialogProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  guestIds: string[]
  onSuccess?: () => void
}
```

Dialog features:
- Status dropdown with all 11 status options
- Confirmation text: "Update status for {count} guest(s)"
- Cancel and Update buttons
- Loading state during mutation
- Uses `useBulkUpdateGuestStatus` hook

---

## 43B: Actions Dropdown Integration

**Update `components/guests/guest-actions-dropdown.tsx`:**

1. Add `"update_status"` to `BulkAction` type
2. Add `canManageGuests` prop to interface
3. Import `RefreshCw` icon from lucide-react
4. Add menu item after "Send Email":
   - Icon: RefreshCw
   - Label: "Update Status"
   - Works with any selection count (bulk-enabled)
   - Permission: `canManageGuests`

**Update `components/guests/guests-toolbar.tsx`:**

Pass `canManageGuests` to GuestActionsDropdown component.

---

## 43C: Event Guests Tab Integration

**Update `components/events/event-guests-tab.tsx`:**

1. Import `UpdateStatusDialog`
2. Add state: `isUpdateStatusDialogOpen`
3. Add case in `handleBulkAction` for `"update_status"`
4. Mount `<UpdateStatusDialog />` component

---

## 43D: Translations

**Update `messages/en.json`:**

```json
"guestActions": {
  ...
  "updateStatus": "Update Status",
  "selectNewStatus": "Select new status",
  "updateStatusDescription": "Update status for {count} guest(s)",
  "noManagePermission": "You don't have permission to manage guests"
}
```

**Update `messages/ar.json`:**

Add Arabic translations for the above keys.

---

## Status Options

The dropdown displays these statuses (from `guestStatusEnum`):

| Status | Display |
|--------|---------|
| pending | Pending |
| invited | Invited |
| reminded | Reminded |
| viewed | Viewed |
| confirmed | Confirmed |
| declined | Declined |
| maybe | Maybe |
| waitlisted | Waitlisted |
| cancelled | Cancelled |
| attended | Attended |
| no_show | No Show |

---

## Verification Checklist

### 43A: Update Status Dialog
- [ ] Dialog opens when action triggered
- [ ] Status dropdown shows all 11 options
- [ ] Confirmation shows correct guest count
- [ ] Update button calls mutation
- [ ] Loading state during update
- [ ] Dialog closes on success
- [ ] Error handling works

### 43B: Actions Dropdown Integration
- [ ] "Update Status" menu item visible
- [ ] Icon displays correctly
- [ ] Disabled when no MANAGE_GUESTS permission
- [ ] Tooltip shows when disabled

### 43C: Event Guests Tab Integration
- [ ] Dialog state managed correctly
- [ ] Action triggers dialog open
- [ ] Success clears selection

### 43D: Translations
- [ ] English translations complete
- [ ] Arabic translations complete

---

## File Structure Summary

**New files:**

```
components/guests/
└── update-status-dialog.tsx
```

**Modified files:**

```
components/guests/guest-actions-dropdown.tsx
components/guests/guests-toolbar.tsx
components/events/event-guests-tab.tsx
messages/en.json
messages/ar.json
```

---

## Related Documents

- [Stage 40: Public Email Links & Guest Actions Dropdown](./40-public-email-links.md)
- [Stage 04: tRPC Routers & RSVP](./04-routers-rsvp.md)
