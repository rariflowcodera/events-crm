# Stage 8: RSVP Form System

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: ✅ Implementation Complete

## Objective

Build a flexible RSVP form system that supports bilingual (EN/AR) forms with category-specific field visibility, enabling both form customization per event and efficient querying/reporting on responses.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Schema Approach** | Hybrid (Materialized + JSON) | Critical reporting needs require SQL-queryable columns; moderate variation means most queries hit indexed columns |
| **Form Structure** | 4 standard sections | Personal Info, Logistics, Experience/Program, Important to Know |
| **Field System** | Standard library + Custom fields | 70-80% standard fields (materialized columns), 20-30% custom (JSON) |
| **Category Handling** | Field visibility rules | Same form structure, fields shown/hidden per category |
| **Template System** | Workspace-level reusable | Save form configs as templates for reuse across events |

---

## Architecture

### Data Model

```
Event
├── rsvpFormConfig (JSON) - Form structure definition
│   ├── sections[] - 4 standard sections
│   │   ├── standardFields[] - IDs of enabled standard fields
│   │   └── customFields[] - Event-specific field definitions
│   └── settings - Form behavior settings
│
└── RsvpResponses
    ├── [Materialized columns] - Standard field values (SQL queryable)
    ├── customResponses (JSON) - Custom field values
    └── formResponses (JSON) - Legacy/full backup
```

### Standard Fields with Materialized Columns

Add these columns to `rsvp_responses` table for direct SQL filtering:

| Section | Field Key | Column Name | Type | Notes |
|---------|-----------|-------------|------|-------|
| **Logistics** | arrival_date | `arrival_date` | timestamp | When guest arrives |
| | departure_date | `departure_date` | timestamp | When guest leaves |
| | arrival_flight | `arrival_flight` | text | Flight number |
| | departure_flight | `departure_flight` | text | Flight number |
| | hotel_required | `hotel_required` | boolean | Needs accommodation |
| | hotel_checkin | `hotel_checkin` | timestamp | Check-in date |
| | hotel_checkout | `hotel_checkout` | timestamp | Check-out date |
| | transport_required | `transport_required` | boolean | Airport pickup needed |
| **Important** | dietary_type | `dietary_type` | text | Enum: none/vegetarian/vegan/halal/kosher/gluten_free/other |
| | dietary_details | `dietary_details` | text | Free text allergies/specifics |
| | accessibility_type | `accessibility_type` | text | Enum: none/wheelchair/hearing/visual/mobility/other |
| | accessibility_details | `accessibility_details` | text | Free text needs |
| | emergency_contact_name | `emergency_contact_name` | text | |
| | emergency_contact_phone | `emergency_contact_phone` | text | |
| **Experience** | sessions_interested | `sessions_interested` | json | Array of session IDs |
| **Personal** | preferred_language | `preferred_language` | text | en/ar |

---

## Schema Changes

### 1. Update `rsvp_responses` Table

**File**: `server/db/schemas/rsvp-response.ts`

Add materialized columns:

```typescript
// === LOGISTICS SECTION ===
arrivalDate: timestamp("arrival_date", { mode: "date" }),
departureDate: timestamp("departure_date", { mode: "date" }),
arrivalFlight: text("arrival_flight"),
departureFlight: text("departure_flight"),
hotelRequired: boolean("hotel_required"),
hotelCheckin: timestamp("hotel_checkin", { mode: "date" }),
hotelCheckout: timestamp("hotel_checkout", { mode: "date" }),
transportRequired: boolean("transport_required"),

// === IMPORTANT TO KNOW SECTION ===
dietaryType: text("dietary_type"),
dietaryDetails: text("dietary_details"),
accessibilityType: text("accessibility_type"),
accessibilityDetails: text("accessibility_details"),
emergencyContactName: text("emergency_contact_name"),
emergencyContactPhone: text("emergency_contact_phone"),

// === EXPERIENCE SECTION ===
sessionsInterested: json("sessions_interested").$type<string[]>(),

// === PERSONAL SECTION ===
preferredLanguage: text("preferred_language"),

// === CUSTOM FIELDS (JSON) ===
customResponses: json("custom_responses").$type<Record<string, unknown>>(),
```

Add indexes:

```typescript
index("rsvp_response_arrival_idx").on(table.eventId, table.arrivalDate),
index("rsvp_response_departure_idx").on(table.eventId, table.departureDate),
index("rsvp_response_dietary_idx").on(table.eventId, table.dietaryType),
index("rsvp_response_accessibility_idx").on(table.eventId, table.accessibilityType),
index("rsvp_response_hotel_idx").on(table.eventId, table.hotelRequired),
index("rsvp_response_transport_idx").on(table.eventId, table.transportRequired),
```

### 2. Enhanced `rsvpFormConfig` Type

**File**: `server/db/schemas/event.ts` (update existing field type)

```typescript
export type RsvpFormConfig = {
  sections: RsvpFormSection[]
  settings: {
    allowAmendments: boolean
    showProgressIndicator: boolean
    confirmationMessage?: { en: string; ar?: string }
    declineMessage?: { en: string; ar?: string }
    submitButtonText?: { en: string; ar?: string }
  }
}

export type RsvpFormSection = {
  id: "personal_info" | "logistics" | "experience" | "important_to_know"
  title: { en: string; ar?: string }
  description?: { en: string; ar?: string }
  enabled: boolean
  sortOrder: number
  standardFields: StandardFieldConfig[]
  customFields: CustomFieldDefinition[]
}

export type StandardFieldConfig = {
  fieldKey: string  // e.g., "arrival_date", "dietary_type"
  enabled: boolean
  required: boolean
  visibleToCategories?: string[]  // null = all categories
  labelOverride?: { en: string; ar?: string }
}

export type CustomFieldDefinition = {
  id: string
  type: "text" | "textarea" | "select" | "radio" | "checkbox" | "date" | "number"
  label: { en: string; ar?: string }
  description?: { en: string; ar?: string }
  placeholder?: { en: string; ar?: string }
  required: boolean
  visibleToCategories?: string[]
  options?: Array<{ value: string; label: { en: string; ar?: string } }>
  validation?: { minLength?: number; maxLength?: number; pattern?: string }
  sortOrder: number
}
```

### 3. New `rsvp_form_templates` Table

**File**: `server/db/schemas/rsvp-form-template.ts` (NEW)

```typescript
export const rsvpFormTemplates = pgTable(
  "rsvp_form_template",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    config: json("config").$type<RsvpFormConfig>().notNull(),
    category: text("category").$type<"corporate" | "conference" | "gala" | "sports" | "government" | "custom">(),
    isSystem: boolean("is_system").default(false),
    isActive: boolean("is_active").default(true),
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("rsvp_form_template_workspace_idx").on(table.workspaceId),
  ]
)
```

---

## Standard Field Library

**File**: `lib/rsvp/standard-fields.ts` (NEW)

Pre-defined field definitions with bilingual labels:

```typescript
export const STANDARD_FIELDS = {
  // Personal Info
  preferred_language: {
    section: "personal_info",
    type: "select",
    label: { en: "Preferred Language", ar: "اللغة المفضلة" },
    options: [
      { value: "en", label: { en: "English", ar: "الإنجليزية" } },
      { value: "ar", label: { en: "Arabic", ar: "العربية" } },
    ],
    materializedColumn: "preferredLanguage",
  },

  // Logistics
  arrival_date: {
    section: "logistics",
    type: "date",
    label: { en: "Arrival Date", ar: "تاريخ الوصول" },
    materializedColumn: "arrivalDate",
  },
  departure_date: {
    section: "logistics",
    type: "date",
    label: { en: "Departure Date", ar: "تاريخ المغادرة" },
    materializedColumn: "departureDate",
  },
  arrival_flight: {
    section: "logistics",
    type: "text",
    label: { en: "Arrival Flight Number", ar: "رقم رحلة الوصول" },
    placeholder: { en: "e.g., SV123", ar: "مثال: SV123" },
    materializedColumn: "arrivalFlight",
  },
  departure_flight: {
    section: "logistics",
    type: "text",
    label: { en: "Departure Flight Number", ar: "رقم رحلة المغادرة" },
    placeholder: { en: "e.g., SV456", ar: "مثال: SV456" },
    materializedColumn: "departureFlight",
  },
  transport_required: {
    section: "logistics",
    type: "radio",
    label: { en: "Do you require airport transportation?", ar: "هل تحتاج إلى نقل من المطار؟" },
    options: [
      { value: "yes", label: { en: "Yes", ar: "نعم" } },
      { value: "no", label: { en: "No", ar: "لا" } },
    ],
    materializedColumn: "transportRequired",
  },
  hotel_required: {
    section: "logistics",
    type: "radio",
    label: { en: "Do you require hotel accommodation?", ar: "هل تحتاج إلى إقامة فندقية؟" },
    options: [
      { value: "yes", label: { en: "Yes", ar: "نعم" } },
      { value: "no", label: { en: "No", ar: "لا" } },
    ],
    materializedColumn: "hotelRequired",
  },
  hotel_checkin: {
    section: "logistics",
    type: "date",
    label: { en: "Hotel Check-in Date", ar: "تاريخ تسجيل الدخول للفندق" },
    conditionalOn: { fieldKey: "hotel_required", value: "yes" },
    materializedColumn: "hotelCheckin",
  },
  hotel_checkout: {
    section: "logistics",
    type: "date",
    label: { en: "Hotel Check-out Date", ar: "تاريخ تسجيل الخروج من الفندق" },
    conditionalOn: { fieldKey: "hotel_required", value: "yes" },
    materializedColumn: "hotelCheckout",
  },

  // Important to Know
  dietary_type: {
    section: "important_to_know",
    type: "select",
    label: { en: "Dietary Requirements", ar: "المتطلبات الغذائية" },
    options: [
      { value: "none", label: { en: "No restrictions", ar: "لا قيود" } },
      { value: "vegetarian", label: { en: "Vegetarian", ar: "نباتي" } },
      { value: "vegan", label: { en: "Vegan", ar: "نباتي صرف" } },
      { value: "halal", label: { en: "Halal", ar: "حلال" } },
      { value: "kosher", label: { en: "Kosher", ar: "كوشر" } },
      { value: "gluten_free", label: { en: "Gluten-free", ar: "خالي من الغلوتين" } },
      { value: "other", label: { en: "Other", ar: "أخرى" } },
    ],
    materializedColumn: "dietaryType",
  },
  dietary_details: {
    section: "important_to_know",
    type: "textarea",
    label: { en: "Dietary Details / Allergies", ar: "تفاصيل غذائية / حساسية" },
    placeholder: { en: "Please specify any allergies or specific requirements", ar: "يرجى تحديد أي حساسية أو متطلبات محددة" },
    conditionalOn: { fieldKey: "dietary_type", operator: "not_equals", value: "none" },
    materializedColumn: "dietaryDetails",
  },
  accessibility_type: {
    section: "important_to_know",
    type: "select",
    label: { en: "Accessibility Requirements", ar: "متطلبات الوصول" },
    options: [
      { value: "none", label: { en: "None", ar: "لا شيء" } },
      { value: "wheelchair", label: { en: "Wheelchair access", ar: "وصول كرسي متحرك" } },
      { value: "hearing", label: { en: "Hearing assistance", ar: "مساعدة سمعية" } },
      { value: "visual", label: { en: "Visual assistance", ar: "مساعدة بصرية" } },
      { value: "mobility", label: { en: "Mobility assistance", ar: "مساعدة في التنقل" } },
      { value: "other", label: { en: "Other", ar: "أخرى" } },
    ],
    materializedColumn: "accessibilityType",
  },
  accessibility_details: {
    section: "important_to_know",
    type: "textarea",
    label: { en: "Accessibility Details", ar: "تفاصيل الوصول" },
    conditionalOn: { fieldKey: "accessibility_type", operator: "not_equals", value: "none" },
    materializedColumn: "accessibilityDetails",
  },
  emergency_contact_name: {
    section: "important_to_know",
    type: "text",
    label: { en: "Emergency Contact Name", ar: "اسم جهة اتصال الطوارئ" },
    materializedColumn: "emergencyContactName",
  },
  emergency_contact_phone: {
    section: "important_to_know",
    type: "text",
    label: { en: "Emergency Contact Phone", ar: "هاتف جهة اتصال الطوارئ" },
    materializedColumn: "emergencyContactPhone",
  },

  // Experience (sessions_interested options loaded dynamically per event)
  sessions_interested: {
    section: "experience",
    type: "checkbox",
    label: { en: "Which sessions are you interested in?", ar: "أي الجلسات تهتم بها؟" },
    options: [], // Populated per event
    materializedColumn: "sessionsInterested",
  },
}
```

---

## Implementation Phases

### Phase 8A: Schema & Types (3-4 hours)

**Files to create/modify:**

| File | Action |
|------|--------|
| `server/db/schemas/rsvp-response.ts` | Add materialized columns + indexes |
| `server/db/schemas/event.ts` | Enhance `rsvpFormConfig` type definition |
| `server/db/schemas/rsvp-form-template.ts` | Create new template table schema |
| `server/db/schemas/index.ts` | Export new schema |
| `lib/rsvp/standard-fields.ts` | Create standard field library |
| `lib/rsvp/types.ts` | Create TypeScript types |
| `lib/schemas.ts` | Add Zod validation schemas |

**Run**: `pnpm db:push` to apply schema changes

---

### Phase 8B: tRPC Routers (4-5 hours)

**New file**: `trpc/routers/rsvp-forms.ts`

```typescript
export const rsvpFormsRouter = createTRPCRouter({
  getFormConfig: protectedProcedure       // Get form config for event
  updateFormConfig: protectedProcedure    // Save form config
  getStandardFields: protectedProcedure   // Return standard field library
  toggleField: protectedProcedure         // Enable/disable a field
  addCustomField: protectedProcedure      // Add custom field
  updateCustomField: protectedProcedure   // Modify custom field
  deleteCustomField: protectedProcedure   // Remove custom field
  reorderFields: protectedProcedure       // Change field order
})
```

**New file**: `trpc/routers/rsvp-templates.ts`

```typescript
export const rsvpTemplatesRouter = createTRPCRouter({
  getMany: protectedProcedure      // List templates (system + workspace)
  getOne: protectedProcedure       // Get single template
  create: protectedProcedure       // Create template
  update: protectedProcedure       // Update template
  delete: protectedProcedure       // Delete template
  applyToEvent: protectedProcedure // Apply template to event
  saveFromEvent: protectedProcedure // Save event config as template
})
```

**New file**: `trpc/routers/rsvp-reports.ts`

```typescript
export const rsvpReportsRouter = createTRPCRouter({
  getSummary: protectedProcedure           // Overall RSVP stats
  getDietaryBreakdown: protectedProcedure  // Dietary stats
  getAccessibilityBreakdown: protectedProcedure // Accessibility stats
  getArrivalTimeline: protectedProcedure   // Arrivals by date
  getHotelRequirements: protectedProcedure // Hotel needs summary
  getTransportRequirements: protectedProcedure // Transport needs
  filterGuests: protectedProcedure         // Filter by response values
  exportResponses: protectedProcedure      // Export to CSV/XLSX
})
```

**Update**: `trpc/routers/_app.ts` - Register new routers

**Create hooks**: `trpc/hooks/rsvp-form-hooks.ts`, `trpc/hooks/rsvp-template-hooks.ts`, `trpc/hooks/rsvp-report-hooks.ts`

---

### Phase 8C: Form Builder UI (6-8 hours)

**Directory**: `components/rsvp-form-builder/`

| Component | Purpose |
|-----------|---------|
| `rsvp-form-builder.tsx` | Main builder container with tabs (Builder/Settings/Preview) |
| `section-list.tsx` | Drag-and-drop section ordering, enable/disable sections |
| `standard-field-list.tsx` | Toggle standard fields, set required, category visibility |
| `custom-field-editor.tsx` | Add/edit custom fields with full config |
| `field-options-editor.tsx` | Options for select/radio/checkbox fields |
| `category-visibility-select.tsx` | Multi-select for category visibility |
| `bilingual-input.tsx` | Reusable EN/AR input with language tabs |
| `form-preview.tsx` | Live preview in selected language |
| `template-picker-dialog.tsx` | Select template to apply |
| `save-template-dialog.tsx` | Save config as reusable template |

**Pattern reference**: Follow `components/email-templates/email-template-form.tsx` for language tabs pattern.

---

### Phase 8D: Public RSVP Form Enhancement (4-5 hours)

**File**: `components/rsvp/rsvp-form.tsx` (major refactor)

**New components**:

| Component | Purpose |
|-----------|---------|
| `components/rsvp/dynamic-form-renderer.tsx` | Render form from config, handle visibility & conditionals |
| `components/rsvp/form-section.tsx` | Section header with description, collapsible |
| `components/rsvp/dynamic-field.tsx` | Render field by type with bilingual labels |

**Update**: `app/api/rsvp/[token]/route.ts`
- Extract standard field values to materialized columns
- Store custom fields in `customResponses`
- Keep `formResponses` as full backup

---

### Phase 8E: Reporting Dashboard (4-5 hours)

**Directory**: `components/rsvp-reports/`

| Component | Purpose |
|-----------|---------|
| `rsvp-summary-cards.tsx` | Overview stats (total confirmed, declined, pending) |
| `dietary-breakdown-chart.tsx` | Pie/bar chart of dietary requirements |
| `accessibility-summary.tsx` | Counts and breakdown |
| `arrival-timeline.tsx` | Guests by arrival date |
| `hotel-requirements-table.tsx` | Hotel bookings list |
| `transport-list.tsx` | Transport needs list |
| `response-filter-builder.tsx` | Dynamic filter UI |
| `export-dialog.tsx` | Export to CSV/XLSX |

**Page**: `app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/events/[eventSlug]/reports/page.tsx`

---

### Phase 8F: i18n & Polish (2-3 hours)

**Update**: `messages/en.json` - Add translation keys:

```json
{
  "rsvpForm": {
    "builder": {
      "title": "RSVP Form Builder",
      "tabs": { "builder": "Builder", "settings": "Settings", "preview": "Preview" },
      "sections": {
        "personal_info": "Personal Information",
        "logistics": "Travel & Logistics",
        "experience": "Experience & Program",
        "important_to_know": "Important to Know"
      },
      "addCustomField": "Add Custom Field",
      "saveAsTemplate": "Save as Template",
      "applyTemplate": "Apply Template"
    },
    "fields": { /* field labels */ },
    "reports": {
      "title": "RSVP Reports",
      "dietary": "Dietary Requirements",
      "accessibility": "Accessibility Needs",
      "arrivals": "Arrival Timeline",
      "hotels": "Hotel Requirements",
      "transport": "Transportation Needs"
    }
  }
}
```

**Update**: `messages/ar.json` - Arabic translations

**Seed**: System templates (Corporate, Conference, Gala presets)

---

## Query Examples

### Filter guests arriving on specific date:

```typescript
db.select().from(rsvpResponses)
  .where(and(
    eq(rsvpResponses.eventId, eventId),
    eq(rsvpResponses.arrivalDate, targetDate)
  ))
```

### Get dietary breakdown:

```typescript
db.select({
  type: rsvpResponses.dietaryType,
  count: sql<number>`count(*)::int`
})
.from(rsvpResponses)
.where(eq(rsvpResponses.eventId, eventId))
.groupBy(rsvpResponses.dietaryType)
```

### Filter guests needing transport:

```typescript
db.select().from(rsvpResponses)
  .innerJoin(guests, eq(rsvpResponses.guestId, guests.id))
  .where(and(
    eq(rsvpResponses.eventId, eventId),
    eq(rsvpResponses.transportRequired, true)
  ))
```

### Query custom field (JSONB):

```typescript
db.execute(sql`
  SELECT * FROM rsvp_response
  WHERE event_id = ${eventId}
  AND custom_responses->>'workshop_choice' = 'advanced'
`)
```

---

## Critical Files Summary

| File | Action | Priority |
|------|--------|----------|
| `server/db/schemas/rsvp-response.ts` | Add columns + indexes | P0 |
| `server/db/schemas/event.ts` | Update rsvpFormConfig type | P0 |
| `server/db/schemas/rsvp-form-template.ts` | Create new | P0 |
| `lib/rsvp/standard-fields.ts` | Create new | P0 |
| `lib/rsvp/types.ts` | Create new | P0 |
| `lib/schemas.ts` | Add Zod schemas | P0 |
| `trpc/routers/rsvp-forms.ts` | Create new | P1 |
| `trpc/routers/rsvp-templates.ts` | Create new | P1 |
| `trpc/routers/rsvp-reports.ts` | Create new | P1 |
| `components/rsvp-form-builder/*` | Create new | P1 |
| `components/rsvp/rsvp-form.tsx` | Major refactor | P1 |
| `app/api/rsvp/[token]/route.ts` | Update submission handler | P1 |
| `components/rsvp-reports/*` | Create new | P2 |
| `messages/en.json` | Add translations | P2 |
| `messages/ar.json` | Add translations | P2 |

---

## Estimated Effort

| Phase | Hours |
|-------|-------|
| 8A: Schema & Types | 3-4 |
| 8B: tRPC Routers | 4-5 |
| 8C: Form Builder UI | 6-8 |
| 8D: Public Form Enhancement | 4-5 |
| 8E: Reporting Dashboard | 4-5 |
| 8F: i18n & Polish | 2-3 |
| **Total** | **23-30 hours** |

---

## Verification Checklist

### Phase 8A
- [ ] Schema changes applied via `pnpm db:push`
- [ ] All materialized columns created on `rsvp_responses`
- [ ] Indexes created for common query patterns
- [ ] `rsvp_form_templates` table created
- [ ] TypeScript types compile without errors

### Phase 8B
- [ ] All router procedures created
- [ ] Hooks created for each router
- [ ] Permission checks implemented

### Phase 8C
- [ ] Form builder renders all 4 sections
- [ ] Standard fields can be toggled on/off
- [ ] Custom fields can be added/edited/deleted
- [ ] Category visibility rules work
- [ ] Language tabs switch correctly
- [ ] Preview shows correct form

### Phase 8D
- [ ] Public RSVP form renders from config
- [ ] Conditional fields show/hide correctly
- [ ] RTL works for Arabic
- [ ] Submission saves to materialized columns
- [ ] Custom responses saved to JSON

### Phase 8E
- [ ] Summary stats display correctly
- [ ] Dietary breakdown chart renders
- [ ] Filter builder works
- [ ] Export generates valid CSV/XLSX

### Phase 8F
- [ ] All EN translations added
- [ ] All AR translations added
- [ ] System templates seeded
