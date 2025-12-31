# Stage 40: Public Email Links & Guest Actions Dropdown

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: In Progress

## Objective

1. **Generate Email Link**: Create shareable public links that render emails for specific guests
2. **Actions Dropdown**: Consolidate guest selection actions into a dropdown menu to save toolbar space

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Link Expiry | Never expire | Simplest approach, links work indefinitely |
| Dropdown Scope | All selection actions | Consolidate Invite, Email, Forms, VAPP, Generate Link, Delete into dropdown |
| Disabled Items | Show with tooltips | Display unavailable actions as disabled with explanatory tooltips |
| Token Storage | Database table | Secure, trackable, follows existing patterns (RSVP, form tokens) |
| Public Route | `/email/[token]` | Simple, clean URL pattern matching existing conventions |

---

## Implementation Phases

| Phase | Scope | Files | Status |
|-------|-------|-------|--------|
| 40A | Schema & Migration | ~2 files | Pending |
| 40B | tRPC Router & Hooks | ~3 files | Pending |
| 40C | Public Preview Route | ~1 file | Pending |
| 40D | Generate Link Dialog | ~1 file | Pending |
| 40E | Actions Dropdown | ~1 file | Pending |
| 40F | Toolbar Integration | ~2 files | Pending |
| 40G | Translations | ~2 files | Pending |

---

## 40A: Schema & Migration

### Email Preview Token Schema

**Create `server/db/schemas/email-preview-token.ts`:**

```typescript
import { relations } from "drizzle-orm"
import {
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { guests } from "./guest"
import { emailTemplates } from "./email-template"
import { events } from "./event"
import { users } from "./user"

export const emailPreviewTokens = pgTable(
  "email_preview_token",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    token: text("token")
      .notNull()
      .unique()
      .$defaultFn(() => crypto.randomUUID()),

    guestId: text("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),

    templateId: text("template_id")
      .notNull()
      .references(() => emailTemplates.id, { onDelete: "cascade" }),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("email_preview_token_token_idx").on(table.token),
    index("email_preview_token_guest_idx").on(table.guestId),
    index("email_preview_token_event_idx").on(table.eventId),
  ]
)

export const emailPreviewTokenRelations = relations(
  emailPreviewTokens,
  ({ one }) => ({
    guest: one(guests, {
      fields: [emailPreviewTokens.guestId],
      references: [guests.id],
    }),
    template: one(emailTemplates, {
      fields: [emailPreviewTokens.templateId],
      references: [emailTemplates.id],
    }),
    event: one(events, {
      fields: [emailPreviewTokens.eventId],
      references: [events.id],
    }),
    createdByUser: one(users, {
      fields: [emailPreviewTokens.createdBy],
      references: [users.id],
    }),
  })
)
```

**Update `server/db/schemas/index.ts`:**
- Export `emailPreviewTokens` and `emailPreviewTokenRelations`

**Migration:** Run `npm run db:generate` and `npm run db:migrate`

---

## 40B: tRPC Router & Hooks

### Email Preview Tokens Router

**Create `trpc/routers/email-preview-tokens.ts`:**

```typescript
export const emailPreviewTokensRouter = createTRPCRouter({
  generateToken: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      guestId: z.string().uuid(),
      templateId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to the event
      // Create or find existing token for this guest/template combo
      // Return token and full URL
    }),

  getByToken: baseProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      // Public procedure - looks up token
      // Returns guest, template, event data for rendering
    }),
})
```

### React Query Hooks

**Create `trpc/hooks/email-preview-hooks.ts`:**

```typescript
export const useGenerateEmailPreviewToken = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { token: string; url: string }) => void
  onError?: () => void
} = {}) => {
  const { mutate, isPending } = trpc.emailPreviewTokens.generateToken.useMutation({
    onSuccess,
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })
  return { mutate, isPending }
}
```

---

## 40C: Public Preview Route

**Create `app/[locale]/email/[token]/page.tsx`:**

Server component that:
1. Looks up token using tRPC `getByToken`
2. Fetches all required data (guest, template, event, branding)
3. Calls `renderStructuredEmail()` (or legacy renderer for HTML-only templates)
4. Returns rendered HTML as full page (no app shell/navigation)

```typescript
export default async function EmailPreviewPage({
  params,
}: {
  params: { token: string; locale: string }
}) {
  // Fetch token data
  // If not found, show 404
  // Render email using existing render-structured.ts
  // Return full HTML page
}
```

---

## 40D: Generate Link Dialog

**Create `components/guests/generate-email-link-dialog.tsx`:**

Similar to `GetFormLinkDialog`, with:
- Email template selector dropdown
- Template preview (shows subject line)
- "Generate Link" button
- Generated URL display with copy/open buttons

---

## 40E: Actions Dropdown

**Create `components/guests/guest-actions-dropdown.tsx`:**

Dropdown menu containing all guest selection actions:

| Action | Icon | Bulk Support | Permission |
|--------|------|--------------|------------|
| Send Invitation | Mail | Yes | SEND_EMAILS |
| Send Email | Mail | Yes | SEND_EMAILS |
| Generate Email Link | Link2 | Single only | SEND_EMAILS |
| Get Form Link | FileText | Single only | SEND_EMAILS |
| VAPP Link | Car | Single only | (vappEnabled) |
| Delete | Trash | Yes | DELETE_GUESTS |

Disabled items show tooltips explaining why (e.g., "Select exactly 1 guest").

---

## 40F: Toolbar Integration

**Update `components/guests/guests-toolbar.tsx`:**

Replace inline action buttons (lines 286-348) with `GuestActionsDropdown`.

**Update `BulkAction` type:**
```typescript
type BulkAction =
  | "delete"
  | "send_invitation"
  | "send_email"
  | "get_form_link"
  | "get_vapp_link"
  | "generate_email_link"
```

**Update `components/events/event-guests-tab.tsx`:**
- Add dialog state for `GenerateEmailLinkDialog`
- Add case in `handleBulkAction` for `generate_email_link`
- Mount the dialog component

---

## 40G: Translations

**Update `messages/en.json`:**

```json
"emailPreview": {
  "generateLink": "Generate Email Link",
  "generateLinkDescription": "Generate a shareable link to view this email for {name}",
  "selectTemplate": "Email Template",
  "selectTemplatePlaceholder": "Choose a template",
  "generateButton": "Generate Link",
  "generatedLink": "Generated Link",
  "linkCopied": "Link copied to clipboard",
  "copyFailed": "Failed to copy link",
  "openInNewTab": "Open in New Tab"
},
"guestActions": {
  "actions": "Actions",
  "sendInvitation": "Send Invitation",
  "sendEmail": "Send Email",
  "generateEmailLink": "Generate Email Link",
  "getFormLink": "Get Form Link",
  "vappLink": "VAPP Link",
  "delete": "Delete",
  "selectOneGuest": "Select exactly 1 guest"
}
```

**Update `messages/ar.json`:**
- Add Arabic translations

---

## Verification Checklist

### 40A: Schema & Migration
- [ ] `emailPreviewTokens` table created
- [ ] Indexes on token, guestId, eventId
- [ ] Relations defined
- [ ] Migration runs successfully

### 40B: tRPC Router & Hooks
- [ ] `generateToken` creates/returns token
- [ ] `getByToken` fetches token data (public)
- [ ] Hook provides proper loading/error states

### 40C: Public Preview Route
- [ ] Route renders email HTML
- [ ] Structured content rendering works
- [ ] Legacy HTML templates still work
- [ ] 404 for invalid tokens

### 40D: Generate Link Dialog
- [ ] Template selector loads templates
- [ ] Preview shows subject line
- [ ] Generate creates token
- [ ] Copy button works
- [ ] Open in new tab works

### 40E: Actions Dropdown
- [ ] All actions visible in dropdown
- [ ] Disabled items show tooltips
- [ ] Icons display correctly
- [ ] Destructive action styled appropriately

### 40F: Toolbar Integration
- [ ] Dropdown replaces inline buttons
- [ ] Selection count displays
- [ ] All actions trigger correctly
- [ ] Dialog opens for generate_email_link

### 40G: Translations
- [ ] English translations complete
- [ ] Arabic translations complete

---

## File Structure Summary

**New files:**

```
server/db/schemas/
└── email-preview-token.ts

app/[locale]/email/[token]/
└── page.tsx

trpc/routers/
└── email-preview-tokens.ts

trpc/hooks/
└── email-preview-hooks.ts

components/guests/
├── generate-email-link-dialog.tsx
└── guest-actions-dropdown.tsx
```

**Modified files:**

```
server/db/schemas/index.ts
trpc/routers/index.ts
components/guests/guests-toolbar.tsx
components/events/event-guests-tab.tsx
messages/en.json
messages/ar.json
```

---

## Related Documents

- [Stage 6: Email Template Builder](./06-email-template-builder.md)
- [Stage 31: Email Master Template & Branding](./31-email-branding.md)
- [Stage 14: Document Management](./14-document-management.md)
