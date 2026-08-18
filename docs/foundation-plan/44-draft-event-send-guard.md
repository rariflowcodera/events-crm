# Stage 44: Draft Event Send Guard

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: Implemented

## Objective

Prevent the system from sending **invitation** emails to guests while an event is in `draft` status. Other email types (reminders, confirmations, updates, cancellations, etc.) are unaffected and must continue to send normally regardless of event status. Users must still be able to generate email/RSVP links (for manual sharing, review, etc.) while the event is in draft — only the invitation send pipeline is blocked.

---

## Background

`events.status` (`server/db/schemas/event.ts:153-162`) is an enum with `draft` as the default value for every new event:

```ts
export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "planning",
  "invitations_sent",
  "rsvp_open",
  "rsvp_closed",
  "in_progress",
  "completed",
  "cancelled",
])
```

Today there is no check anywhere — server or client — that stops a user from sending bulk invitations/emails to guests on an event that's still in draft. This was confirmed by code search: `trpc/routers/bulk-email.ts`'s three send mutations only verify the event exists, `server/workers/email-processor.ts` (the actual BullMQ send worker) has no event-status check, and no UI surface disables send actions based on status.

All three mutations (`sendBulk`, `sendToAll`, `sendBulkByCategory`) take an `emailType` input (`lib/schemas.ts:420-429`: `invitation | reminder | confirmation | declined_acknowledgment | maybe_acknowledgment | update | cancellation | custom`). The guard only applies when `emailType === "invitation"` — other email types (reminders, confirmations, updates, etc.) must keep sending regardless of event status, since those are typically sent after invitations have already gone out and blocking them on `draft` would be incorrect (and in practice the event will no longer be `draft` by then, but the check must not assume that).

Link/RSVP generation (`lib/rsvp-url.ts`, and the planned Stage 40 "Generate Email Link" feature) is architecturally separate from the send pipeline already — it's pure token/URL generation that never touches the mail queue — so it needs no change.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Blocked statuses | Only `draft` | User's requirement is specifically about draft events; all other statuses (`planning`, `invitations_sent`, `rsvp_open`, `rsvp_closed`, `in_progress`, `completed`, `cancelled`) remain sendable as today. |
| Enforcement layer | Server-side in tRPC mutations (primary) + worker-level check (defense-in-depth) | Server-side is the actual security boundary; the worker check guards against a job that was already queued when the event was later moved back to draft. |
| Which sends are blocked | Only `emailType === "invitation"` within `sendBulk`, `sendToAll`, `sendBulkByCategory` (`trpc/routers/bulk-email.ts`) | Explicit requirement — don't block general "Send Email" for other template types (reminder, confirmation, update, cancellation, custom, etc.), only invitations. |
| Link generation | Unrestricted | Explicit requirement — draft events can still generate links, just not auto-send. |
| Error surfaced to user | Clear message + UI-level prevention | User should not be able to click "Send" and get a raw server error as their first signal — the action should be disabled with an explanatory tooltip, matching the existing disabled-item pattern in `guest-actions-dropdown.tsx`. |
| Error code | `TRPCError({ code: "BAD_REQUEST" })` | Matches existing pattern for guard-rail validation errors elsewhere in the router (e.g. "Event not found" uses `NOT_FOUND`; this is a state-validation failure, not a missing resource). |

---

## Implementation Phases

| Phase | Scope | Files | Status |
|-------|-------|-------|--------|
| 44A | Server-side guard | `trpc/routers/bulk-email.ts` | Done |
| 44B | Worker defense-in-depth check | `server/workers/email-processor.ts` | Done |
| 44C | UI: disable send actions for draft events | `components/guests/guest-actions-dropdown.tsx`, `components/guests/guests-toolbar.tsx`, `components/events/event-guests-tab.tsx` | Done |
| 44D | UI: dialog-level messaging | `components/guests/bulk-send-email-dialog.tsx` | Done |
| 44E | Translations | `messages/en.json`, `messages/ar.json` | Done |

---

## 44A: Server-Side Guard

**Update `trpc/routers/bulk-email.ts`:**

In each of `sendBulk` (line 21), `sendToAll` (line 119), and `sendBulkByCategory` (line 198), extend the existing event-fetch query to also select `status`, and add a guard immediately after the "event not found" check — scoped to `emailType === "invitation"` only:

```ts
const event = await db.query.events.findFirst({
  where: eq(events.id, eventId),
  columns: { id: true, workspaceId: true, status: true },
})

if (!event) {
  throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
}

if (emailType === "invitation" && event.status === "draft") {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Cannot send invitations while the event is in draft status. Publish the event first, or generate a link to share manually.",
  })
}
```

Non-invitation email types (`reminder`, `confirmation`, `declined_acknowledgment`, `maybe_acknowledgment`, `update`, `cancellation`, `custom`) pass through unaffected, at any event status.

---

## 44B: Worker Defense-in-Depth Check

**Update `server/workers/email-processor.ts`:**

Before processing a queued bulk email job (in `processBulkJob`), when `job.data.emailType === "invitation"`, re-check `event.status` from the DB (not from the job payload, in case the event changed after enqueue) and fail the job gracefully (mark it `failed` with a clear reason) if the event has since been moved to `draft`. Non-invitation jobs skip this check entirely. This only matters for the edge case where an invitation job is queued, then the event is manually reverted to draft before the worker picks it up.

---

## 44C: UI — Disable Send Actions for Draft Events

**Update `components/guests/guest-actions-dropdown.tsx`:**

Add an `eventStatus` prop. Disable only the "Send Invitation" menu item when `eventStatus === "draft"`, with tooltip: "Event is in draft — publish it first to send invitations." Leave "Send Email" (non-invitation types), "Generate Email Link", "Get Form Link", and "VAPP Link" unaffected.

**Update `components/guests/guests-toolbar.tsx`:**

Pass `eventStatus` through to `GuestActionsDropdown`.

---

## 44D: UI — Dialog-Level Messaging

**Update the bulk send email dialog(s):**

As a second line of defense (e.g. if the dialog can be reached another way), when `emailType === "invitation"` and the event is in draft, show an inline warning banner and disable the "Send" button, mirroring the dropdown-level guard. The dialog already receives `emailType` as a prop (`components/guests/bulk-send-email-dialog.tsx:28`), so the check only needs to gate on that plus `eventStatus`. For any other `emailType`, the dialog behaves exactly as it does today regardless of event status.

---

## 44E: Translations

**Update `messages/en.json`:**

```json
"guestActions": {
  ...
  "draftEventCannotSendInvitation": "Event is in draft — publish it first to send invitations"
}
```

**Update `messages/ar.json`:**

Add Arabic translation for the above key.

---

## Verification Checklist

### 44A: Server-Side Guard
- [ ] `sendBulk` throws `BAD_REQUEST` when `emailType === "invitation"` and event status is `draft`
- [ ] `sendToAll` throws `BAD_REQUEST` when `emailType === "invitation"` and event status is `draft`
- [ ] `sendBulkByCategory` throws `BAD_REQUEST` when `emailType === "invitation"` and event status is `draft`
- [ ] All three mutations still succeed for `emailType === "invitation"` on every non-draft status
- [ ] All three mutations still succeed for every non-invitation `emailType`, including when event status is `draft`

### 44B: Worker Defense-in-Depth
- [ ] Invitation job queued while event is non-draft, then event reverted to draft before processing → job fails gracefully with clear reason, no emails sent
- [ ] Non-invitation job queued/processed while event is `draft` → sends normally, unaffected by the check

### 44C: UI Disable
- [ ] "Send Invitation" disabled with tooltip when event is draft
- [ ] "Send Email" (non-invitation types), "Generate Email Link", "Get Form Link", "VAPP Link" remain enabled when event is draft

### 44D: Dialog Messaging
- [ ] Warning banner shown, Send button disabled if invitation dialog reached while event is draft
- [ ] Dialog for non-invitation email types is unaffected by event status

### 44E: Translations
- [ ] English translation complete
- [ ] Arabic translation complete

---

## File Structure Summary

**Modified files:**

```
trpc/routers/bulk-email.ts
server/workers/email-processor.ts
components/guests/guest-actions-dropdown.tsx
components/guests/guests-toolbar.tsx
components/guests/bulk-send-email-dialog.tsx (or equivalent)
messages/en.json
messages/ar.json
```

---

## Related Documents

- [Stage 40: Public Email Links & Guest Actions Dropdown](./40-public-email-links.md)
- [Stage 07: Bulk Email Sending](./07-bulk-email-sending.md)
- [Stage 43: Bulk Status Updates](./43-bulk-status-updates.md)
