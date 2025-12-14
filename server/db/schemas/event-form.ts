import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  json,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { events } from "./event"
import { workspaces } from "./workspace"
import { users } from "./user"
import type { BilingualText, FieldValidation, FieldConditional } from "./event"

// Re-export BilingualText for use in form components
export type { BilingualText } from "./event"

// ============================================================================
// Generic Form Configuration Types
// ============================================================================

/** Form purpose categorization */
export type FormPurpose =
  | "travel"
  | "survey"
  | "feedback"
  | "registration"
  | "custom"

/** Form access type */
export type FormAccessType = "token" | "email"

/** Field configuration for generic forms */
export type FormFieldConfig = {
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

/** Form section configuration */
export type FormSectionConfig = {
  id: string
  title: BilingualText
  description?: BilingualText
  enabled: boolean
  sortOrder: number
  fields: FormFieldConfig[]
}

/** Form-level settings */
export type FormSettings = {
  showProgressIndicator: boolean
  confirmationMessage?: BilingualText
  submitButtonText?: BilingualText
}

/** Complete form configuration */
export type FormConfig = {
  sections: FormSectionConfig[]
  settings: FormSettings
}

// ============================================================================
// Event Forms Schema
// ============================================================================

export const eventForms = pgTable(
  "event_form",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    // Form Identity
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    purpose: text("purpose").$type<FormPurpose>().default("custom"),

    // Form Configuration
    formConfig: json("form_config").$type<FormConfig>().notNull(),

    // Access Control
    accessType: text("access_type").$type<FormAccessType>().default("email"),
    visibleToCategories: json("visible_to_categories").$type<string[]>(),
    allowMultipleSubmissions: boolean("allow_multiple_submissions").notNull().default(false),
    allowAmendments: boolean("allow_amendments").notNull().default(true),

    // Publishing
    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: timestamp("published_at", { mode: "date" }),
    expiresAt: timestamp("expires_at", { mode: "date" }),

    // Access Links
    shortCode: text("short_code").unique(),

    // Metadata
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("event_form_event_idx").on(table.eventId),
    index("event_form_workspace_idx").on(table.workspaceId),
    uniqueIndex("event_form_event_slug_idx").on(table.eventId, table.slug),
    index("event_form_short_code_idx").on(table.shortCode),
    index("event_form_purpose_idx").on(table.purpose),
    index("event_form_published_idx").on(table.isPublished),
  ]
)

export const eventFormsRelations = relations(eventForms, ({ one }) => ({
  event: one(events, {
    fields: [eventForms.eventId],
    references: [events.id],
  }),
  workspace: one(workspaces, {
    fields: [eventForms.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [eventForms.createdBy],
    references: [users.id],
  }),
}))
