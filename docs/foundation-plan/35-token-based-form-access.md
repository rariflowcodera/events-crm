# Stage 35: Token-Based Form Access + Email Integration

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: In Progress

## Objective

Add token-based access mode for custom forms, allowing unique guest links (like RSVP). This enables:
1. Guest-specific form tokens (for surveys, feedback forms, etc.)
2. Guest list UI to retrieve form links
3. Email template "Insert Form Link" button for structured emails

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Token storage | Separate `guest_form_tokens` table | Flexible, allows multiple forms per guest |
| Token generation | On-demand | No upfront work, tokens created when needed |
| Token mode setting | Per-form `accessType` field | Each form can choose its access pattern |
| Email integration | Token mode only | Email lookup doesn't make sense in email context |
| URL pattern | `/forms/t/[token]` | Distinguishes from shortCode pattern |

---

## Architecture

### Access Mode Comparison

| Aspect | Email Mode (existing) | Token Mode (new) |
|--------|----------------------|------------------|
| URL Pattern | `/forms/[shortCode]` | `/forms/t/[token]` |
| Guest Identification | Email lookup step | Token directly maps to guest |
| Sharing | QR code, generic link | Per-guest unique links |
| Use Case | Walk-in forms, general access | Surveys, targeted forms via email |
| Email Integration | Not applicable | Full support via `{{formLink.ID}}` |

### Data Model

```
EventForm (existing)
├── accessType: "email" | "token"  // Already exists, now used
└── ...

GuestFormTokens (new)
├── id (uuid)
├── guestId (fk → guests)
├── formId (fk → event_forms)
├── token (unique)
├── expiresAt (optional)
└── createdAt
```

---

## Implementation Phases

### Phase 35A: Database Schema

**File**: `server/db/schemas/guest-form-token.ts` (NEW)

```typescript
import { relations } from "drizzle-orm"
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { guests } from "./guest"
import { eventForms } from "./event-form"

export const guestFormTokens = pgTable(
  "guest_form_token",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    guestId: text("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),

    formId: text("form_id")
      .notNull()
      .references(() => eventForms.id, { onDelete: "cascade" }),

    token: text("token").notNull().unique(),

    expiresAt: timestamp("expires_at", { mode: "date" }),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("guest_form_token_guest_idx").on(table.guestId),
    index("guest_form_token_form_idx").on(table.formId),
    index("guest_form_token_token_idx").on(table.token),
    uniqueIndex("guest_form_token_guest_form_idx").on(table.guestId, table.formId),
  ]
)

export const guestFormTokensRelations = relations(guestFormTokens, ({ one }) => ({
  guest: one(guests, {
    fields: [guestFormTokens.guestId],
    references: [guests.id],
  }),
  form: one(eventForms, {
    fields: [guestFormTokens.formId],
    references: [eventForms.id],
  }),
}))
```

**Run**: `pnpm db:push` to apply schema

---

### Phase 35B: tRPC Endpoints

**File**: `trpc/routers/event-forms.ts`

Add procedures:

```typescript
// Get or create token for a guest+form pair
getGuestFormToken: protectedProcedure
  .input(z.object({
    formId: z.string().uuid(),
    guestId: z.string().uuid(),
  }))
  .mutation(async ({ ctx, input }) => {
    // 1. Verify form exists and is token-mode
    // 2. Look for existing token
    // 3. Create if not exists
    // 4. Return token + full URL
  })

// Get token-mode forms for an event (for dialog dropdown)
getTokenModeForms: protectedProcedure
  .input(z.object({ eventId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    // Return forms where accessType = 'token'
  })
```

**File**: `trpc/routers/public-forms.ts`

Add procedure:

```typescript
// Get form + guest by token (public access)
getByToken: publicProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ input }) => {
    // 1. Look up guest_form_token
    // 2. Return form config + guest info
    // 3. Check expiration, form published status
  })
```

---

### Phase 35C: Public Token Route

**Files**:
- `app/[locale]/forms/t/[token]/page.tsx` (NEW)
- `app/[locale]/forms/t/[token]/client.tsx` (NEW)

**Flow**:
1. Look up `guestFormTokens` by token
2. Validate token not expired
3. Load form config + guest data
4. Skip email step - directly show form (like RSVP pattern)
5. Render same `FormStep` component but with guest pre-identified

---

### Phase 35D: Form Settings UI

**File**: `app/[locale]/(web)/(dashboard)/[slug]/.../forms/[formSlug]/client.tsx`

Add `accessType` toggle to `FormSettingsPanel`:
- **Email Mode** (default): Shared link, guest enters email
- **Token Mode**: Unique link per guest, no email step

**File**: `components/forms/form-links-panel.tsx`

Conditionally render based on `form.accessType`:
- **Email mode**: Show shortCode link + QR code (existing)
- **Token mode**: Show info message directing to guest list

---

### Phase 35E: Guest List Integration

**File**: `components/guests/guests-toolbar.tsx`

Add "Forms" button when exactly 1 guest selected:

```tsx
{selectedCount === 1 && (
  <Button variant="ghost" size="sm" onClick={() => onBulkAction("get_form_link")}>
    <FileText className="mr-1 h-4 w-4" />
    Forms
  </Button>
)}
```

**File**: `components/guests/get-form-link-dialog.tsx` (NEW)

Dialog UI:
1. Select dropdown showing token-mode forms for this event
2. "Generate Link" button
3. Display generated URL with copy button
4. Show guest name for context

**File**: `components/events/event-guests-tab.tsx`

Add handler for `"get_form_link"` action.

---

### Phase 35F: Email Template Integration

**File**: `components/email-templates/form-link-inserter.tsx` (NEW)

Following DocumentInserter pattern with two-panel popover:
1. **Panel 1**: Select from token-mode forms
2. **Panel 2**: Configure link text (optional custom text)

**Output Patterns**:
- `{{formLink.FORM_ID}}` → Link with form name as text
- `{{formLink.FORM_ID|Custom Text}}` → Link with custom text
- `{{formUrl.FORM_ID}}` → URL only (no anchor tag)

**File**: `components/email-templates/structured-content-editor.tsx`

Add FormLinkInserter alongside existing inserters (Map, Document, Variable).

**File**: `lib/email/render-structured.ts`

Add `processFormLinkVariables()` function:

```typescript
function processFormLinkVariables(
  html: string,
  forms: EventForm[],
  guest: Guest,
  event: Event
): string {
  // For each form placeholder in the content:
  // 1. Find or generate token for this guest+form
  // 2. Build URL: /forms/t/{token}
  // 3. Replace patterns with appropriate output
}
```

**File**: `lib/queue/email-job.ts`

Pass forms to renderer and ensure tokens are created during email rendering.

---

### Phase 35G: Translations

**Files**: `messages/en.json`, `messages/ar.json`

Add keys for:
- Access type labels and descriptions
- Get form link dialog text
- Email inserter labels

---

## Files Summary

### New Files

| File | Purpose |
|------|---------|
| `server/db/schemas/guest-form-token.ts` | Token table schema |
| `app/[locale]/forms/t/[token]/page.tsx` | Token-based form access route |
| `app/[locale]/forms/t/[token]/client.tsx` | Token form client component |
| `components/guests/get-form-link-dialog.tsx` | Dialog for getting guest form link |
| `components/email-templates/form-link-inserter.tsx` | Email inserter for form links |

### Modified Files

| File | Changes |
|------|---------|
| `server/db/schemas/index.ts` | Export new schema |
| `trpc/routers/event-forms.ts` | Add token procedures |
| `trpc/routers/public-forms.ts` | Add getByToken procedure |
| `components/forms/form-links-panel.tsx` | Conditional UI for access type |
| `components/guests/guests-toolbar.tsx` | Add Forms button |
| `components/events/event-guests-tab.tsx` | Handle get_form_link action |
| `components/email-templates/structured-content-editor.tsx` | Add FormLinkInserter |
| `lib/email/render-structured.ts` | Add form link variable processing |
| `lib/queue/email-job.ts` | Pass forms/tokens to renderer |
| `lib/schemas.ts` | Add Zod schemas for tokens |
| `messages/en.json` | Add translations |
| `messages/ar.json` | Add Arabic translations |

---

## Verification Checklist

### Phase 35A
- [ ] `guest_form_tokens` table created with indexes
- [ ] Relations defined correctly
- [ ] Schema exports updated

### Phase 35B
- [ ] `getGuestFormToken` creates/retrieves tokens
- [ ] `getTokenModeForms` returns only token-mode forms
- [ ] `getByToken` validates and returns form + guest

### Phase 35C
- [ ] Token URL resolves to correct form
- [ ] Guest is pre-identified (no email step)
- [ ] Expired tokens show appropriate message
- [ ] Unpublished forms rejected

### Phase 35D
- [ ] Access type toggle in form settings
- [ ] Form links panel shows correct UI per mode
- [ ] Token mode hides QR/sharing section

### Phase 35E
- [ ] Forms button appears for single guest selection
- [ ] Dialog shows token-mode forms only
- [ ] Token generation works
- [ ] Copy link functionality works

### Phase 35F
- [ ] FormLinkInserter appears in structured editor
- [ ] Variable insertion works
- [ ] Email rendering generates tokens on-demand
- [ ] Links resolve correctly in sent emails

### Phase 35G
- [ ] All EN translations added
- [ ] All AR translations added
- [ ] RTL works correctly

---

## Related Documents

- [Stage 20: Custom Event Forms](./20-custom-event-forms.md) - Base forms implementation
- [Stage 31: Email Master Template](./31-email-branding.md) - Structured email system
