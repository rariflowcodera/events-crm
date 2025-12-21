# 34: Event Staff Role & Attendance Permission

## Status: In Progress

## Overview

Add a new "Event Staff" role with limited permissions for on-site check-in operations. This role is designed for staff who need to mark guest attendance but shouldn't have full guest management capabilities.

Also introduces a new `MARK_ATTENDANCE` permission to provide granular control over who can mark attendance.

## User Requirements

- New role: Event Staff for on-site operations
- Minimal permissions: view events/guests/RSVPs + mark attendance
- Cannot edit guests, send emails, or manage event settings
- Available in invite form and member role management
- Production deployment via idempotent seed

---

## Phase 1: Role & Permission Types

### File: `types/types.ts`

Add `EVENT_STAFF` to `RoleTypes`:

```typescript
export const RoleTypes = {
  OWNER: "owner",
  ADMIN: "admin",
  MANAGER: "manager",
  EVENT_STAFF: "event_staff",  // NEW
  MEMBER: "member",
} as const
```

### File: `lib/permissions.ts`

Add `MARK_ATTENDANCE` and `VIEW_GUEST_DETAILS` constants:

```typescript
// Guest management
VIEW_GUEST_DETAILS: "view:guest_details",

// Attendance
MARK_ATTENDANCE: "mark:attendance",
```

---

## Phase 2: Backend Permission Configuration

### File: `server/queries/permissions.ts`

**Add permission constants:**
```typescript
// Guest management
VIEW_GUEST_DETAILS: "view:guest_details",

// Attendance
MARK_ATTENDANCE: "mark:attendance",
```

**Add to `defaultPermissions` array:**
```typescript
// Guest management
{ name: PERMISSIONS.VIEW_GUEST_DETAILS, description: "Can view individual guest profiles" },

// Attendance
{ name: PERMISSIONS.MARK_ATTENDANCE, description: "Can mark guest attendance" },
```

**Add Event Staff role to `defaultRoles` array (after manager, before member):**
```typescript
{
  name: "event_staff",
  description: "Event staff with attendance marking access",
  permissions: [
    "mark:attendance",
    "view:event",
    "view:guests",
    // NOTE: NO "view:guest_details" - Event Staff can see the list but cannot open individual profiles
    "view:rsvps",
  ],
},
```

**Add `mark:attendance` and `view:guest_details` to admin, manager, and member roles:**
- Owner already has `"*"` (all permissions)
- Add `"mark:attendance"` and `"view:guest_details"` to admin permissions array
- Add `"mark:attendance"` and `"view:guest_details"` to manager permissions array
- Add `"view:guest_details"` to member permissions array (Members can view details but not mark attendance)

---

## Phase 3: Update Attendance Mutations

### File: `trpc/routers/guests.ts`

Update `markAttendance` and `bulkMarkAttendance` mutations:

Change:
```typescript
permissionName: PERMISSIONS.MANAGE_GUESTS,
```

To:
```typescript
permissionName: PERMISSIONS.MARK_ATTENDANCE,
```

---

## Phase 4: Update UI Components

### File: `components/forms/create-invite-form.tsx`

**Add Event Staff to role selector:**
```tsx
<SelectContent>
  <SelectItem value="member">Member</SelectItem>
  <SelectItem value="event_staff">Event Staff</SelectItem>
  <SelectItem value="manager">Manager</SelectItem>
  <SelectItem value="admin">Admin</SelectItem>
</SelectContent>
```

**Update tooltip content to include Event Staff description.**

### File: `components/members/member-actions.tsx`

**Update type signature:**
```typescript
const handleUpdateMember = (newRole: "member" | "event_staff" | "manager" | "admin" | "owner") => {
```

**Add role check:**
```typescript
const isEventStaff = role === "event_staff"
```

**Add dropdown item:**
```tsx
<DropdownMenuItem
  disabled={isEventStaff || isUpdatingMember}
  onClick={() => handleUpdateMember("event_staff")}
>
  Event Staff
  {isEventStaff && <Icons.check className="ml-auto size-4" />}
</DropdownMenuItem>
```

---

## Phase 5: i18n

### File: `messages/en.json`

```json
{
  "roles": {
    "event_staff": "Event Staff",
    "event_staff_description": "Can mark attendance and view event/guest information"
  }
}
```

### File: `messages/ar.json`

```json
{
  "roles": {
    "event_staff": "طاقم الفعالية",
    "event_staff_description": "يمكنه تسجيل الحضور وعرض معلومات الفعالية والضيوف"
  }
}
```

---

## Permission Matrix

| Permission | Owner | Admin | Manager | Event Staff | Member |
|------------|-------|-------|---------|-------------|--------|
| **Attendance** |
| Mark attendance | Yes | Yes | Yes | Yes | No |
| **Events** |
| View events | Yes | Yes | Yes | Yes | Yes |
| **Guests** |
| View guest list | Yes | Yes | Yes | Yes | Yes |
| **View guest details** | Yes | Yes | Yes | **No** | Yes |
| Manage guests | Yes | Yes | Yes | No | No |
| **RSVPs** |
| View RSVPs | Yes | Yes | Yes | Yes | Yes |
| Manage RSVPs | Yes | Yes | Yes | No | No |

### Guest Details Restriction

Event Staff can see the guest list and mark attendance, but cannot:
- Click on guest rows to view individual profiles
- Access the guest detail page directly via URL
- See sensitive guest information beyond what's visible in the table
- Access the row actions menu (ellipsis/3-dots button) for sending RSVP links or other guest operations

This ensures Event Staff focus only on attendance operations without accessing private guest data.

---

## Production Deployment

The `initializeRBAC()` function is **idempotent** - it uses `onConflictDoUpdate`:

```bash
npm run db:seed
```

This will:
- Insert new `mark:attendance` permission
- Insert new `view:guest_details` permission
- Insert new `event_staff` role
- Update role-permission mappings
- Safe to run multiple times

---

## Files Summary

| File | Changes |
|------|---------|
| `types/types.ts` | Add `EVENT_STAFF` to `RoleTypes` |
| `lib/permissions.ts` | Add `MARK_ATTENDANCE` and `VIEW_GUEST_DETAILS` constants |
| `server/queries/permissions.ts` | Add permission constants, defaults, and role mappings |
| `trpc/routers/guests.ts` | Use `MARK_ATTENDANCE` in attendance mutations; Use `VIEW_GUEST_DETAILS` in `getOne` |
| `components/guests/guests-data-table.tsx` | Add `canViewDetails` prop to disable row click and hide actions menu |
| `components/events/event-guests-tab.tsx` | Pass `canViewDetails` prop based on permission |
| `app/.../guests/view/[viewId]/client.tsx` | Pass `canViewDetails` prop; Hide back button |
| `app/.../guests/[guestId]/client.tsx` | Add permission guard for direct URL access |
| `components/forms/create-invite-form.tsx` | Add Event Staff option |
| `components/members/member-actions.tsx` | Add Event Staff option |
| `messages/en.json` | Add i18n strings |
| `messages/ar.json` | Add Arabic translations |
| `content/documentation/admin-guide/roles-permissions.mdoc` | Update documentation |

---

## Implementation Order

1. Types & constants (types.ts, lib/permissions.ts)
2. Backend configuration (server/queries/permissions.ts)
3. Mutation updates (trpc/routers/guests.ts)
4. UI components (invite form, member actions)
5. i18n strings
6. Documentation update
7. Test with `npm run db:seed`
