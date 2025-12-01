# Stage 3: Domain Schema & i18n Setup

> **Parent**: [00-overview.md](./00-overview.md) | **Estimate**: 4-5 hours | **Status**: ✅ COMPLETED (2024-11-29)

## Objective

Create the complete Events domain database schema and set up Arabic/English internationalization with RTL support.

## Implementation Notes

**Adaptation Made**: Kept "Workspace" terminology instead of "Organization" (Stage 2 decision). All new schemas use `workspaceId` to reference the existing `workspaces` table.

**Files Created**:
- Phase 1: `event.ts`, `guest-category.ts`, `guest.ts`, `rsvp-response.ts`, `email-template.ts`, `email-log.ts`, `guest-import.ts`
- Future Phases: `inventory.ts`, `itinerary.ts`, `workflow.ts`, `communication.ts`
- i18n: `i18n/routing.ts`, `i18n/request.ts`, `i18n/navigation.ts`, `middleware.ts`
- Translations: `messages/en.json`, `messages/ar.json`

**Additional Changes**:
- Added "manager" role to `types/types.ts`
- Updated permissions in `server/queries/permissions.ts` with 14 new event-related permissions

---

## 3.1 Schema Overview

```
Organization (enhanced from Stage 2)
    └── Events
        ├── GuestCategories
        │   └── ServiceAllocations (JSON)
        ├── Guests
        │   └── RSVPResponses
        ├── EmailTemplates
        │   └── EmailLogs
        └── GuestImportBatches

Future (schema only):
    ├── InventoryTypes → InventoryItems → GuestInventoryAllocations
    ├── ItineraryTemplates → ItineraryItems → GuestItineraries
    ├── Workflows → WorkflowSteps → ApprovalRequests
    └── Communications
```

---

## 3.2 Enhance Organization Schema

Update `server/db/schemas/organization.ts`:

```typescript
import { relations } from "drizzle-orm"
import { boolean, index, json, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { users } from "./user"
import { subscriptions } from "./subscription"

export const organizations = pgTable(
  "organization",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Basic info
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),

    // Contact
    phone: text("phone"),
    email: text("email"),
    website: text("website"),

    // Branding - Organization level defaults
    logo: text("logo"),
    logoDark: text("logo_dark"),
    favicon: text("favicon"),
    primaryColor: text("primary_color").default("#000000"),
    secondaryColor: text("secondary_color").default("#ffffff"),

    // Subscription
    subscriptionId: text("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),

    // Settings
    settings: json("settings").$type<{
      timezone?: string
      dateFormat?: string
      language?: "en" | "ar"
    }>(),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("organization_slug_idx").on(table.slug),
    index("organization_owner_idx").on(table.ownerId),
    index("organization_created_at_idx").on(table.createdAt),
  ]
)

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [organizations.subscriptionId],
    references: [subscriptions.id],
  }),
  members: many(organizationMembers),
  events: many(events),
  invitations: many(invitations),
}))
```

---

## 3.3 Phase 1 Tables (Active)

### Event Schema

Create `server/db/schemas/event.ts`:

```typescript
import { relations } from "drizzle-orm"
import { boolean, index, integer, json, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { organizations } from "./organization"
import { users } from "./user"

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

export const events = pgTable(
  "event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),

    eventType: text("event_type"),
    venue: text("venue"),
    venueAddress: text("venue_address"),

    startDate: timestamp("start_date", { mode: "date" }),
    endDate: timestamp("end_date", { mode: "date" }),
    timezone: text("timezone").default("Asia/Riyadh"),

    rsvpDeadline: timestamp("rsvp_deadline", { mode: "date" }),
    rsvpFormConfig: json("rsvp_form_config").$type<{
      fields: Array<{
        id: string
        type: "text" | "select" | "checkbox" | "radio" | "textarea" | "date"
        label: { en: string; ar?: string }
        required: boolean
        options?: Array<{ value: string; label: { en: string; ar?: string } }>
        conditionalOnCategory?: string[]
      }>
      confirmationMessage?: { en: string; ar?: string }
    }>(),

    maxGuests: integer("max_guests"),
    status: eventStatusEnum("status").notNull().default("draft"),

    branding: json("branding").$type<{
      logo?: string
      logoDark?: string
      primaryColor?: string
      secondaryColor?: string
      backgroundImage?: string
    }>(),

    customDomain: text("custom_domain").unique(),

    settings: json("settings").$type<{
      allowPlusOne?: boolean
      maxPlusOnes?: number
      requireApproval?: boolean
      sendReminders?: boolean
      reminderDays?: number[]
    }>(),

    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("event_organization_idx").on(table.organizationId),
    index("event_slug_org_idx").on(table.organizationId, table.slug),
    index("event_status_idx").on(table.status),
    index("event_start_date_idx").on(table.startDate),
  ]
)

export const eventsRelations = relations(events, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [events.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
  guestCategories: many(guestCategories),
  guests: many(guests),
  emailTemplates: many(emailTemplates),
}))
```

### Guest Category Schema

Create `server/db/schemas/guest-category.ts`:

```typescript
import { relations } from "drizzle-orm"
import { boolean, index, integer, json, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { events } from "./event"

export const guestCategories = pgTable(
  "guest_category",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    code: text("code").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    color: text("color").default("#6366f1"),

    serviceAllocations: json("service_allocations").$type<{
      hotelStars?: number
      roomType?: string
      transportType?: string
      airportPickup?: boolean
      flightClass?: string
      flightIncluded?: boolean
      mealType?: string
      accessLevel?: string[]
      giftPackage?: string
      custom?: Record<string, unknown>
    }>(),

    defaultEmailTemplateId: text("default_email_template_id"),

    rsvpPageConfig: json("rsvp_page_config").$type<{
      headline?: { en: string; ar?: string }
      welcomeMessage?: { en: string; ar?: string }
      backgroundImage?: string
      showServiceDetails?: boolean
    }>(),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("guest_category_event_idx").on(table.eventId),
    index("guest_category_code_idx").on(table.eventId, table.code),
  ]
)

export const guestCategoriesRelations = relations(guestCategories, ({ one, many }) => ({
  event: one(events, {
    fields: [guestCategories.eventId],
    references: [events.id],
  }),
  guests: many(guests),
}))
```

### Guest Schema

Create `server/db/schemas/guest.ts`:

```typescript
import { relations } from "drizzle-orm"
import { boolean, index, json, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { events } from "./event"
import { guestCategories } from "./guest-category"

export const guestStatusEnum = pgEnum("guest_status", [
  "pending",
  "invited",
  "reminded",
  "viewed",
  "confirmed",
  "declined",
  "maybe",
  "waitlisted",
  "cancelled",
  "attended",
  "no_show",
])

export const guests = pgTable(
  "guest",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    categoryId: text("category_id")
      .notNull()
      .references(() => guestCategories.id, { onDelete: "restrict" }),

    // Personal
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    preferredName: text("preferred_name"),
    title: text("title"),
    salutation: text("salutation"),

    // Professional
    position: text("position"),
    entity: text("entity"),
    department: text("department"),

    // Contact
    email: text("email"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),

    additionalContacts: json("additional_contacts").$type<Array<{
      type: "assistant" | "spouse" | "secretary" | "other"
      name?: string
      email?: string
      phone?: string
      isPrimary?: boolean
    }>>(),

    // RSVP
    rsvpToken: text("rsvp_token").notNull().unique(),
    rsvpTokenExpiresAt: timestamp("rsvp_token_expires_at", { mode: "date" }),
    status: guestStatusEnum("status").notNull().default("pending"),
    rsvpRespondedAt: timestamp("rsvp_responded_at", { mode: "date" }),

    // Companion
    hasCompanion: boolean("has_companion").default(false),
    companionDetails: json("companion_details").$type<{
      name?: string
      email?: string
      phone?: string
      dietaryRequirements?: string
    }>(),

    // Requirements
    dietaryRequirements: text("dietary_requirements"),
    accessibilityNeeds: text("accessibility_needs"),

    // Metadata
    tags: json("tags").$type<string[]>(),
    customFields: json("custom_fields").$type<Record<string, unknown>>(),
    internalNotes: text("internal_notes"),

    // Import tracking
    importBatchId: text("import_batch_id"),
    externalId: text("external_id"),

    // Activity tracking
    lastEmailSentAt: timestamp("last_email_sent_at", { mode: "date" }),
    lastEmailOpenedAt: timestamp("last_email_opened_at", { mode: "date" }),
    lastRsvpPageVisitAt: timestamp("last_rsvp_page_visit_at", { mode: "date" }),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("guest_event_idx").on(table.eventId),
    index("guest_category_idx").on(table.categoryId),
    index("guest_status_idx").on(table.eventId, table.status),
    index("guest_rsvp_token_idx").on(table.rsvpToken),
    index("guest_email_idx").on(table.eventId, table.email),
  ]
)

export const guestsRelations = relations(guests, ({ one, many }) => ({
  event: one(events, {
    fields: [guests.eventId],
    references: [events.id],
  }),
  category: one(guestCategories, {
    fields: [guests.categoryId],
    references: [guestCategories.id],
  }),
  rsvpResponses: many(rsvpResponses),
  emailLogs: many(emailLogs),
}))
```

### RSVP Response Schema

Create `server/db/schemas/rsvp-response.ts`:

```typescript
import { relations } from "drizzle-orm"
import { boolean, index, json, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { events } from "./event"
import { guests } from "./guest"

export const rsvpResponses = pgTable(
  "rsvp_response",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    guestId: text("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    responseStatus: text("response_status")
      .notNull()
      .$type<"confirmed" | "declined" | "maybe">(),

    formResponses: json("form_responses").$type<Record<string, unknown>>(),

    companionInfo: json("companion_info").$type<{
      bringing: boolean
      count?: number
      names?: string[]
      details?: Array<{ name: string; dietary?: string }>
    }>(),

    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    isAmendment: boolean("is_amendment").default(false),
    previousResponseId: text("previous_response_id"),

    submittedAt: timestamp("submitted_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("rsvp_response_guest_idx").on(table.guestId),
    index("rsvp_response_event_idx").on(table.eventId),
    index("rsvp_response_status_idx").on(table.eventId, table.responseStatus),
  ]
)

export const rsvpResponsesRelations = relations(rsvpResponses, ({ one }) => ({
  guest: one(guests, {
    fields: [rsvpResponses.guestId],
    references: [guests.id],
  }),
  event: one(events, {
    fields: [rsvpResponses.eventId],
    references: [events.id],
  }),
}))
```

### Email Template Schema

Create `server/db/schemas/email-template.ts`:

```typescript
import { relations } from "drizzle-orm"
import { boolean, index, json, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { events } from "./event"
import { guestCategories } from "./guest-category"
import { users } from "./user"

export const emailTemplateTypeEnum = pgEnum("email_template_type", [
  "invitation",
  "reminder",
  "confirmation",
  "declined_acknowledgment",
  "update",
  "cancellation",
  "custom",
])

export const emailTemplates = pgTable(
  "email_template",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    type: emailTemplateTypeEnum("type").notNull(),

    categoryId: text("category_id")
      .references(() => guestCategories.id, { onDelete: "set null" }),

    subject: text("subject").notNull(),
    htmlContent: text("html_content").notNull(),
    textContent: text("text_content"),

    fromName: text("from_name"),
    fromEmail: text("from_email"),
    replyTo: text("reply_to"),

    attachments: json("attachments").$type<Array<{
      name: string
      url: string
      type: string
    }>>(),

    availableVariables: json("available_variables").$type<string[]>(),

    isActive: boolean("is_active").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),

    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("email_template_event_idx").on(table.eventId),
    index("email_template_type_idx").on(table.eventId, table.type),
  ]
)

export const emailTemplatesRelations = relations(emailTemplates, ({ one, many }) => ({
  event: one(events, {
    fields: [emailTemplates.eventId],
    references: [events.id],
  }),
  category: one(guestCategories, {
    fields: [emailTemplates.categoryId],
    references: [guestCategories.id],
  }),
  logs: many(emailLogs),
}))
```

### Email Log Schema

Create `server/db/schemas/email-log.ts`:

```typescript
import { relations } from "drizzle-orm"
import { index, json, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { events } from "./event"
import { guests } from "./guest"
import { emailTemplates } from "./email-template"

export const emailStatusEnum = pgEnum("email_status", [
  "pending",
  "queued",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "failed",
])

export const emailLogs = pgTable(
  "email_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    guestId: text("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    templateId: text("template_id")
      .references(() => emailTemplates.id, { onDelete: "set null" }),

    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),

    status: emailStatusEnum("status").notNull().default("pending"),

    providerMessageId: text("provider_message_id"),
    providerResponse: json("provider_response").$type<Record<string, unknown>>(),

    sentAt: timestamp("sent_at", { mode: "date" }),
    deliveredAt: timestamp("delivered_at", { mode: "date" }),
    openedAt: timestamp("opened_at", { mode: "date" }),
    bouncedAt: timestamp("bounced_at", { mode: "date" }),

    errorMessage: text("error_message"),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("email_log_guest_idx").on(table.guestId),
    index("email_log_event_idx").on(table.eventId),
    index("email_log_status_idx").on(table.status),
  ]
)

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  guest: one(guests, {
    fields: [emailLogs.guestId],
    references: [guests.id],
  }),
  event: one(events, {
    fields: [emailLogs.eventId],
    references: [events.id],
  }),
  template: one(emailTemplates, {
    fields: [emailLogs.templateId],
    references: [emailTemplates.id],
  }),
}))
```

### Guest Import Schema

Create `server/db/schemas/guest-import.ts`:

```typescript
import { relations } from "drizzle-orm"
import { index, integer, json, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { events } from "./event"
import { users } from "./user"

export const importStatusEnum = pgEnum("import_status", [
  "pending",
  "processing",
  "completed",
  "completed_with_errors",
  "failed",
])

export const guestImportBatches = pgTable(
  "guest_import_batch",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    fileName: text("file_name"),
    fileUrl: text("file_url"),

    status: importStatusEnum("status").notNull().default("pending"),

    totalRows: integer("total_rows").default(0),
    successCount: integer("success_count").default(0),
    errorCount: integer("error_count").default(0),
    duplicateCount: integer("duplicate_count").default(0),

    columnMapping: json("column_mapping").$type<Record<string, string>>(),

    errors: json("errors").$type<Array<{
      row: number
      column?: string
      message: string
      data?: Record<string, unknown>
    }>>(),

    startedAt: timestamp("started_at", { mode: "date" }),
    completedAt: timestamp("completed_at", { mode: "date" }),

    importedBy: text("imported_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("guest_import_event_idx").on(table.eventId),
    index("guest_import_status_idx").on(table.status),
  ]
)

export const guestImportBatchesRelations = relations(guestImportBatches, ({ one }) => ({
  event: one(events, {
    fields: [guestImportBatches.eventId],
    references: [events.id],
  }),
  importedBy: one(users, {
    fields: [guestImportBatches.importedBy],
    references: [users.id],
  }),
}))
```

---

## 3.4 Future Phase Tables (Schema Only)

Create `server/db/schemas/inventory.ts`, `server/db/schemas/itinerary.ts`, `server/db/schemas/workflow.ts`, and `server/db/schemas/communication.ts` with the full schemas from the planning documents. These are created now but features built later.

---

## 3.5 Update Schema Exports

Update `server/db/schemas.ts`:

```typescript
// Auth
export * from "@/server/db/schemas/user"
export * from "@/server/db/schemas/auth"

// Organization
export * from "@/server/db/schemas/organization"
export * from "@/server/db/schemas/member"
export * from "@/server/db/schemas/permission"
export * from "@/server/db/schemas/invitation"
export * from "@/server/db/schemas/subscription"

// Events Domain - Phase 1
export * from "@/server/db/schemas/event"
export * from "@/server/db/schemas/guest-category"
export * from "@/server/db/schemas/guest"
export * from "@/server/db/schemas/rsvp-response"
export * from "@/server/db/schemas/email-template"
export * from "@/server/db/schemas/email-log"
export * from "@/server/db/schemas/guest-import"

// Future Phases (schema only)
export * from "@/server/db/schemas/inventory"
export * from "@/server/db/schemas/itinerary"
export * from "@/server/db/schemas/workflow"
export * from "@/server/db/schemas/communication"

// Rate limiting
export * from "@/server/db/schemas/ratelimit"
```

---

## 3.6 i18n Setup with next-intl

### Install Dependency

```bash
npm install next-intl
```

### Create i18n Configuration

Create `i18n.ts` at project root:

```typescript
import { getRequestConfig } from "next-intl/server"

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
}))
```

### Create Middleware

Update/create `middleware.ts`:

```typescript
import createMiddleware from "next-intl/middleware"

export default createMiddleware({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localeDetection: true,
})

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
}
```

### Update Next.js Config

Update `next.config.ts`:

```typescript
import createNextIntlPlugin from "next-intl/plugin"
import type { NextConfig } from "next"

const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  // existing config...
}

export default withNextIntl(nextConfig)
```

### Create Translation Files

Create `messages/en.json`:

```json
{
  "common": {
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "search": "Search",
    "filter": "Filter",
    "export": "Export",
    "import": "Import"
  },
  "auth": {
    "signIn": "Sign In",
    "signOut": "Sign Out",
    "email": "Email",
    "password": "Password",
    "magicLink": {
      "title": "Sign in with Magic Link",
      "description": "We'll send you a link to sign in",
      "sent": "Check your email for the magic link"
    }
  },
  "organization": {
    "title": "Organization",
    "create": "Create Organization",
    "settings": "Organization Settings",
    "members": "Members",
    "switchOrganization": "Switch Organization"
  },
  "event": {
    "title": "Event",
    "events": "Events",
    "create": "Create Event",
    "settings": "Event Settings",
    "status": {
      "draft": "Draft",
      "planning": "Planning",
      "rsvpOpen": "RSVP Open",
      "rsvpClosed": "RSVP Closed",
      "inProgress": "In Progress",
      "completed": "Completed"
    }
  },
  "guest": {
    "title": "Guest",
    "guests": "Guests",
    "import": "Import Guests",
    "category": "Category",
    "status": {
      "pending": "Pending",
      "invited": "Invited",
      "confirmed": "Confirmed",
      "declined": "Declined"
    }
  },
  "rsvp": {
    "title": "RSVP",
    "confirm": "Confirm Attendance",
    "decline": "Decline",
    "maybe": "Maybe",
    "submitted": "Thank you for your response"
  }
}
```

Create `messages/ar.json`:

```json
{
  "common": {
    "loading": "جار التحميل...",
    "save": "حفظ",
    "cancel": "إلغاء",
    "delete": "حذف",
    "edit": "تعديل",
    "create": "إنشاء",
    "search": "بحث",
    "filter": "تصفية",
    "export": "تصدير",
    "import": "استيراد"
  },
  "auth": {
    "signIn": "تسجيل الدخول",
    "signOut": "تسجيل الخروج",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "magicLink": {
      "title": "تسجيل الدخول برابط سحري",
      "description": "سنرسل لك رابطاً لتسجيل الدخول",
      "sent": "تحقق من بريدك الإلكتروني"
    }
  },
  "organization": {
    "title": "المنظمة",
    "create": "إنشاء منظمة",
    "settings": "إعدادات المنظمة",
    "members": "الأعضاء",
    "switchOrganization": "تبديل المنظمة"
  },
  "event": {
    "title": "الفعالية",
    "events": "الفعاليات",
    "create": "إنشاء فعالية",
    "settings": "إعدادات الفعالية",
    "status": {
      "draft": "مسودة",
      "planning": "التخطيط",
      "rsvpOpen": "التسجيل مفتوح",
      "rsvpClosed": "التسجيل مغلق",
      "inProgress": "جارية",
      "completed": "مكتملة"
    }
  },
  "guest": {
    "title": "الضيف",
    "guests": "الضيوف",
    "import": "استيراد الضيوف",
    "category": "الفئة",
    "status": {
      "pending": "قيد الانتظار",
      "invited": "تم الدعوة",
      "confirmed": "مؤكد",
      "declined": "معتذر"
    }
  },
  "rsvp": {
    "title": "تأكيد الحضور",
    "confirm": "تأكيد الحضور",
    "decline": "اعتذار",
    "maybe": "ربما",
    "submitted": "شكراً لردك"
  }
}
```

### Update Root Layout for RTL

Update `app/layout.tsx`:

```typescript
import { getLocale, getMessages } from "next-intl/server"
import { NextIntlClientProvider } from "next-intl"

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()
  const dir = locale === "ar" ? "rtl" : "ltr"

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          {/* existing providers */}
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

### Restructure App Directory

Move routes under `[locale]`:

```
app/
├── [locale]/
│   ├── (marketing)/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── (web)/
│       ├── (auth)/
│       ├── (dashboard)/
│       └── ...
├── api/  (stays at root - no locale)
└── layout.tsx
```

---

## 3.7 Add New Permissions

Update `server/db/seed.ts` to add new permissions:

```typescript
const eventPermissions = [
  { name: "create:event", description: "Create events" },
  { name: "manage:event", description: "Manage event settings" },
  { name: "delete:event", description: "Delete events" },
  { name: "view:event", description: "View events" },
  { name: "import:guests", description: "Import guests" },
  { name: "manage:guests", description: "Manage guests" },
  { name: "view:guests", description: "View guests" },
  { name: "delete:guests", description: "Delete guests" },
  { name: "view:rsvps", description: "View RSVP responses" },
  { name: "manage:rsvps", description: "Manage RSVP responses" },
  { name: "send:emails", description: "Send emails" },
  { name: "manage:templates", description: "Manage email templates" },
  { name: "view:reports", description: "View reports" },
  { name: "export:data", description: "Export data" },
]
```

---

## Verification

After completing Stage 3:

```bash
# Run database migrations
npm run db:push

# Verify tables created
npm run db:studio

# Test i18n
npm run dev
# Visit http://localhost:3000/ar to test Arabic
```

### Checklist

- [x] All schema files created
- [x] Database tables created successfully (`pnpm db:push`)
- [x] Permissions seeded (`pnpm db:seed`)
- [x] next-intl configured
- [x] English translations complete
- [x] Arabic translations complete
- [x] RTL layout works for Arabic
- [x] Locale switching works
- [x] Build passes successfully

---

## Next Stage

→ [Stage 4: tRPC Routers & RSVP](./04-routers-rsvp.md)
