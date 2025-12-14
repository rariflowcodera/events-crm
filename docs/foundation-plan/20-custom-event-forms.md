# Stage 20: Custom Event Forms System

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: Complete

## Objective

Extend the existing RSVP form builder to support generic forms (beyond RSVP) that can be:
- Created independently within an event
- Accessed via QR codes and shareable links
- Identified by guest email (when accessed generically)
- Used for various purposes: travel requirements, surveys, feedback, etc.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Unknown email handling** | Reject submission | Only existing guests can submit - maintains data integrity |
| **RSVP relationship** | Keep separate | RSVP stays specialized with materialized columns for logistics queries |
| **UI placement** | Rename to "Forms" | Single "Forms" section containing both RSVP and additional forms |
| **Category access** | Per-form categories | Each form can specify which guest categories can access it |

---

## Current System Analysis

### Existing Architecture
- **Form Config Storage**: JSON in `events.rsvpFormConfig` (single form per event)
- **Guest Access**: Token-based (`/{locale}/rsvp/{token}`) - unique token per guest
- **Response Storage**: `rsvp_responses` table with materialized columns for standard RSVP fields
- **Form Builder**: `/components/rsvp-form-builder/` - sophisticated builder with templates
- **Standard Fields**: 18 RSVP-specific fields (logistics, dietary, accessibility, etc.)

### Gap Analysis

| Current | Needed for Generic Forms |
|---------|-------------------------|
| One RSVP form per event | Multiple forms per event |
| Token-based guest access | QR/link access + email identification |
| RSVP-specific standard fields | Purpose-agnostic field library |
| Fixed 4 sections | Flexible section structure |
| `rsvpFormConfig` on event | Separate forms table |

---

## Architecture

### Data Model

```
Event
├── RsvpForm (existing - special case form)
│   └── via events.rsvpFormConfig
│
└── EventForms[] (new - generic forms)
    ├── id, eventId, name, slug
    ├── formConfig (JSON - reuse existing structure)
    ├── accessType: "token" | "email"
    ├── visibleToCategories[]
    ├── shortCode (for QR/links)
    └── FormResponses[]
        ├── guestId (required - no anonymous)
        ├── guestEmail
        └── responses (JSON)
```

### Access Patterns

1. **Token-based** (for personalized links)
   - Guest receives unique link with token (like RSVP)
   - Pre-identified, no email needed
   - Example: `/{locale}/forms/{shortCode}?token={guestFormToken}`

2. **Email-identified** (default - for QR codes & generic links)
   - Guest scans QR or clicks generic link
   - Prompted to enter email
   - System looks up guest by email + event
   - **Rejects unknown emails** - only registered guests can submit
   - Associates response with guest record

---

## Schema Changes

### 1. New Table: `event_forms`

**File**: `server/db/schemas/event-form.ts` (NEW)

```typescript
export const eventForms = pgTable("event_form", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),

  // Form Identity
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  purpose: text("purpose").$type<"travel" | "survey" | "feedback" | "registration" | "custom">(),

  // Form Configuration (reuses existing structure)
  formConfig: json("form_config").$type<FormConfig>().notNull(),

  // Access Control
  accessType: text("access_type").$type<"token" | "email">().default("email"),
  visibleToCategories: json("visible_to_categories").$type<string[]>(),
  allowMultipleSubmissions: boolean("allow_multiple_submissions").default(false),
  allowAmendments: boolean("allow_amendments").default(true),

  // Publishing
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"),
  expiresAt: timestamp("expires_at"),

  // Access Links
  shortCode: text("short_code").unique(),

  // Metadata
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => [
  index("event_form_event_idx").on(table.eventId),
  uniqueIndex("event_form_event_slug_idx").on(table.eventId, table.slug),
  index("event_form_short_code_idx").on(table.shortCode),
])
```

### 2. New Table: `form_responses`

**File**: `server/db/schemas/form-response.ts` (NEW)

```typescript
export const formResponses = pgTable("form_response", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  formId: text("form_id").notNull().references(() => eventForms.id, { onDelete: "cascade" }),
  eventId: text("event_id").notNull().references(() => events.id),

  // Guest Association (required - no anonymous submissions)
  guestId: text("guest_id").notNull().references(() => guests.id),
  guestEmail: text("guest_email").notNull(),

  // Response Data
  responses: json("responses").$type<Record<string, unknown>>().notNull(),

  // Amendment Tracking
  isAmendment: boolean("is_amendment").default(false),
  previousResponseId: text("previous_response_id"),

  // Metadata
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (table) => [
  index("form_response_form_idx").on(table.formId),
  index("form_response_guest_idx").on(table.guestId),
  index("form_response_email_idx").on(table.guestEmail),
])
```

---

## FormConfig Type (Reusable)

**File**: `lib/forms/types.ts` (NEW)

```typescript
export type FormConfig = {
  sections: FormSection[]
  settings: FormSettings
}

export type FormSection = {
  id: string
  title: BilingualText
  description?: BilingualText
  enabled: boolean
  sortOrder: number
  fields: FieldConfig[]
}

export type FieldConfig = {
  id: string
  type: "text" | "textarea" | "select" | "radio" | "checkbox" | "date" | "number" | "email" | "phone"
  label: BilingualText
  description?: BilingualText
  placeholder?: BilingualText
  required: boolean
  visibleToCategories?: string[]
  options?: Array<{ value: string; label: BilingualText }>
  validation?: FieldValidation
  conditionalOn?: FieldConditional
  sortOrder: number
}

export type FormSettings = {
  showProgressIndicator: boolean
  confirmationMessage?: BilingualText
  submitButtonText?: BilingualText
}
```

---

## UI Architecture

### Navigation Structure

```
Event Dashboard → Forms (renamed from "RSVP Form")
├── RSVP Form Card
│   └── Link to existing RSVP form builder
│
└── Additional Forms Section
    ├── [+ Create Form] button
    └── Form cards grid
        ├── Travel Requirements Form
        ├── Post-Event Survey
        └── ...each with edit/QR/link actions
```

### Component Structure

```
components/forms/
├── form-builder/
│   ├── form-builder.tsx            # Main builder (adapt from rsvp-form-builder)
│   ├── form-settings.tsx           # Form-level settings
│   ├── section-editor.tsx          # Section management
│   ├── field-editor.tsx            # Field configuration
│   └── form-preview.tsx            # Live preview
│
├── form-list/
│   ├── forms-page.tsx              # Landing page with RSVP + additional forms
│   ├── form-card.tsx               # Individual form card
│   └── create-form-dialog.tsx      # Create new form
│
├── form-access/
│   ├── qr-code-generator.tsx       # Generate QR codes
│   └── link-manager.tsx            # Manage shareable links
│
└── form-responses/
    ├── response-list.tsx           # View responses
    ├── response-detail.tsx         # Individual response
    └── export-dialog.tsx           # Export responses
```

### Route Structure (Dashboard)

```
app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/events/[eventSlug]/
├── forms/
│   ├── page.tsx                    # Forms landing page
│   ├── [formSlug]/
│   │   ├── page.tsx                # Form builder
│   │   └── responses/
│   │       └── page.tsx            # Form responses
│   └── new/
│       └── page.tsx                # Create form
│
└── rsvp-form/
    └── page.tsx                    # Keep existing (or redirect to /forms)
```

---

## Public Form Access

### Route Structure

```
app/[locale]/forms/
├── [shortCode]/
│   └── page.tsx                    # Public form access via short code
```

### Email Identification Flow

1. Guest scans QR code or clicks form link
2. Form page displays email input field
3. System queries: `SELECT * FROM guests WHERE event_id = ? AND email = ?`
4. **If found**: Verify category access, pre-fill known info, allow submission
5. **If not found**: Display error "Email not found in guest list. Please contact the event organizer."
6. On valid submission: Associate response with guest record via `guestId`

### API Routes

**File**: `app/api/forms/[shortCode]/route.ts` (NEW)

```typescript
// GET - Fetch form config (public)
// POST - Submit form response (validates guest email)
```

---

## tRPC Routers

### Event Forms Router

**File**: `trpc/routers/event-forms.ts` (NEW)

```typescript
export const eventFormsRouter = createTRPCRouter({
  // Form CRUD
  getMany: protectedProcedure,      // List forms for event
  getOne: protectedProcedure,       // Get single form
  create: protectedProcedure,       // Create new form
  update: protectedProcedure,       // Update form config
  delete: protectedProcedure,       // Delete form
  duplicate: protectedProcedure,    // Duplicate form

  // Publishing
  publish: protectedProcedure,      // Make form public
  unpublish: protectedProcedure,    // Hide form

  // Access
  generateQR: protectedProcedure,   // Generate QR code
  regenerateShortCode: protectedProcedure, // New short code

  // Responses
  getResponses: protectedProcedure, // List responses
  getResponse: protectedProcedure,  // Single response detail
  exportResponses: protectedProcedure, // Export CSV/XLSX
})
```

---

## Implementation Phases

### Phase 20A: Database & Types

**Files to create/modify:**

| File | Action |
|------|--------|
| `server/db/schemas/event-form.ts` | Create event forms table |
| `server/db/schemas/form-response.ts` | Create form responses table |
| `server/db/schemas/index.ts` | Export new schemas |
| `lib/forms/types.ts` | Form type definitions |
| `lib/forms/field-library.ts` | Common field definitions |
| `lib/schemas.ts` | Add Zod validation schemas |

**Run**: `pnpm db:push` to apply schema

---

### Phase 20B: tRPC Layer

**Files to create/modify:**

| File | Action |
|------|--------|
| `trpc/routers/event-forms.ts` | Create event forms router |
| `trpc/hooks/event-forms-hooks.ts` | React Query hooks |
| `trpc/routers/_app.ts` | Register new router |

---

### Phase 20C: Forms Landing Page

**Files to create:**

| File | Purpose |
|------|---------|
| `app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/events/[eventSlug]/forms/page.tsx` | Landing page route |
| `components/forms/form-list/forms-page.tsx` | RSVP card + additional forms grid |
| `components/forms/form-list/form-card.tsx` | Individual form card |
| `components/forms/form-list/create-form-dialog.tsx` | Create new form |

**Modify**: Event sidebar navigation - rename "RSVP Form" to "Forms"

---

### Phase 20D: Form Builder UI

**Files to create:**

| File | Purpose |
|------|---------|
| `components/forms/form-builder/form-builder.tsx` | Main builder (adapt from RSVP) |
| `components/forms/form-builder/form-settings.tsx` | Form settings panel |
| `components/forms/form-builder/section-editor.tsx` | Section management |
| `components/forms/form-builder/field-editor.tsx` | Field configuration |
| `components/forms/form-builder/form-preview.tsx` | Live preview |
| Form builder page route | Dashboard route for editing |

---

### Phase 20E: QR & Link Management

**Files to create:**

| File | Purpose |
|------|---------|
| `components/forms/form-access/qr-code-generator.tsx` | QR code generation |
| `components/forms/form-access/link-manager.tsx` | Link management UI |
| `lib/forms/short-code.ts` | Short code generation utility |

---

### Phase 20F: Public Form Access

**Files to create:**

| File | Purpose |
|------|---------|
| `app/[locale]/forms/[shortCode]/page.tsx` | Public form page |
| `app/api/forms/[shortCode]/route.ts` | GET config, POST submission |
| `components/forms/public/form-page.tsx` | Public form component |
| `components/forms/public/email-lookup.tsx` | Email identification form |

---

### Phase 20G: Response Management

**Files to create:**

| File | Purpose |
|------|---------|
| `components/forms/form-responses/response-list.tsx` | Response list view |
| `components/forms/form-responses/response-detail.tsx` | Individual response |
| `components/forms/form-responses/export-dialog.tsx` | Export to CSV/XLSX |
| Response page route | Dashboard route for viewing responses |

---

### Phase 20H: i18n

**Files to modify:**

| File | Changes |
|------|---------|
| `messages/en.json` | Add form translations |
| `messages/ar.json` | Add Arabic translations |

---

## Critical Files Summary

| File | Action | Priority |
|------|--------|----------|
| `server/db/schemas/event-form.ts` | Create | P0 |
| `server/db/schemas/form-response.ts` | Create | P0 |
| `lib/forms/types.ts` | Create | P0 |
| `lib/schemas.ts` | Add Zod schemas | P0 |
| `trpc/routers/event-forms.ts` | Create | P1 |
| `trpc/hooks/event-forms-hooks.ts` | Create | P1 |
| `components/forms/form-list/*` | Create | P1 |
| `components/forms/form-builder/*` | Create | P1 |
| `app/[locale]/forms/[shortCode]/page.tsx` | Create | P1 |
| `app/api/forms/[shortCode]/route.ts` | Create | P1 |
| `components/forms/form-access/*` | Create | P2 |
| `components/forms/form-responses/*` | Create | P2 |
| `messages/en.json` | Update | P2 |
| `messages/ar.json` | Update | P2 |

---

## Verification Checklist

### Phase 20A
- [x] Schema changes applied via `pnpm db:push`
- [x] `event_forms` table created with indexes
- [x] `form_responses` table created with indexes
- [x] TypeScript types compile without errors

### Phase 20B
- [x] All router procedures created
- [x] Hooks created for React Query
- [x] Permission checks implemented

### Phase 20C
- [x] Forms landing page renders
- [x] RSVP form card links to existing builder
- [x] Create form dialog works
- [x] Sidebar navigation updated

### Phase 20D
- [x] Form builder renders sections
- [x] Fields can be added/edited/deleted
- [x] Preview shows correct form
- [x] Save works correctly

### Phase 20E
- [x] QR code generates correctly
- [x] Links are copyable
- [x] Short codes work

### Phase 20F
- [x] Public form page loads
- [x] Email lookup validates against guest list
- [x] Unknown emails show error
- [x] Valid submissions create response records
- [x] Category access restrictions work

### Phase 20G
- [x] Response list shows all responses
- [x] Response detail shows full data
- [x] Export generates valid CSV

### Phase 20H
- [x] All EN translations added
- [x] All AR translations added
- [x] RTL works for Arabic forms

---

## Implementation Summary

**Completed**: December 2024

### Files Created

| Category | Files |
|----------|-------|
| **Database Schemas** | `server/db/schemas/event-form.ts`, `server/db/schemas/form-response.ts` |
| **tRPC Routers** | `trpc/routers/event-forms.ts`, `trpc/routers/public-forms.ts` |
| **React Hooks** | `trpc/hooks/event-forms-hooks.ts`, `trpc/hooks/public-forms-hooks.ts` |
| **Form Components** | `components/forms/generic-form-builder.tsx`, `components/forms/form-card.tsx`, `components/forms/create-form-dialog.tsx`, `components/forms/form-links-panel.tsx` |
| **Dashboard Pages** | Form detail page, Form responses page under `app/[locale]/(web)/(dashboard)/[slug]/.../forms/` |
| **Public Pages** | `app/[locale]/forms/[shortCode]/` (public form access), `app/f/[shortCode]/` (short URL redirect) |

### Key Implementation Notes

1. **Form Builder**: Uses up/down buttons for field ordering instead of drag-and-drop (no external dependencies)
2. **QR Codes**: Implemented with `qrcode.react` library
3. **Public Access**: Email-based guest identification - rejects unknown emails
4. **Response Export**: CSV export with all field values
5. **Translations**: Full EN/AR support for forms, publicForms, and formResponses sections
