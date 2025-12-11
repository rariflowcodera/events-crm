import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { workspaces } from "./workspace"
import { users } from "./user"

// ============================================================================
// RSVP Form Configuration Types
// ============================================================================

/** Bilingual text content */
export type BilingualText = {
  en: string
  ar?: string
}

/** Configuration for a standard field in the form */
export type StandardFieldConfig = {
  fieldKey: string
  enabled: boolean
  required: boolean
  visibleToCategories?: string[] // null/undefined = all categories
  labelOverride?: BilingualText
}

/** Validation rules for custom fields */
export type FieldValidation = {
  minLength?: number
  maxLength?: number
  pattern?: string
  min?: number
  max?: number
}

/** Conditional visibility based on another field's value */
export type FieldConditional = {
  fieldKey: string
  operator?: "equals" | "not_equals" | "contains" | "not_empty"
  value?: string | string[] | boolean
}

/** Custom field definition */
export type CustomFieldDefinition = {
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

/** Section IDs for the 4 standard sections */
export type RsvpFormSectionId = "personal_info" | "logistics" | "experience" | "important_to_know"

/** Form section configuration */
export type RsvpFormSection = {
  id: RsvpFormSectionId
  title: BilingualText
  description?: BilingualText
  enabled: boolean
  sortOrder: number
  standardFields: StandardFieldConfig[]
  customFields: CustomFieldDefinition[]
}

/** Form-level settings */
export type RsvpFormSettings = {
  allowAmendments: boolean
  showProgressIndicator: boolean
  confirmationMessage?: BilingualText
  declineMessage?: BilingualText
  maybeMessage?: BilingualText
  submitButtonText?: BilingualText
  // RSVP question customization
  rsvpQuestionLabel?: BilingualText
  confirmOptionLabel?: BilingualText
  declineOptionLabel?: BilingualText
  maybeOptionLabel?: BilingualText
  showMaybeOption?: boolean // Default: true
}

/** Complete RSVP form configuration */
export type RsvpFormConfig = {
  sections: RsvpFormSection[]
  settings: RsvpFormSettings
}

// ============================================================================
// Event Branding Type
// ============================================================================

export type EventBranding = {
  logo?: string // Light mode logo URL
  logoDark?: string // Dark mode logo URL
  primaryColor?: string // Primary brand color (hex)
  secondaryColor?: string // Secondary brand color (hex)
  primaryColorDark?: string // Dark mode primary color
  secondaryColorDark?: string // Dark mode secondary color
  backgroundImage?: string // Background image URL for RSVP pages
  backgroundImageMode?: "cover" | "contain" | "repeat" | "center" // How the background image displays
  // Card styling
  cardAccent?: {
    enabled: boolean
    color: string // Hex color (e.g., "#D4A84B" for gold)
    position: "top" | "bottom" | "left" | "right"
    thickness: "thin" | "medium" | "thick" // 3px, 6px, 10px
  }
  sectionHeader?: {
    backgroundColor: string // Hex color for section header background
    textColor: string // Hex color for section header text
  }
}

// ============================================================================
// Event Email Settings Type
// ============================================================================

export type EventEmailSettings = {
  fromEmail?: string // Sender email address for event emails
  fromName?: string // Sender display name for event emails
}

// ============================================================================
// Event Schema
// ============================================================================

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

    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

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
    rsvpFormConfig: json("rsvp_form_config").$type<RsvpFormConfig>(),

    maxGuests: integer("max_guests"),
    status: eventStatusEnum("status").notNull().default("draft"),

    branding: json("branding").$type<EventBranding>(),

    // Custom domain configuration for RSVP pages
    customDomain: text("custom_domain").unique(),
    customDomainVerified: boolean("custom_domain_verified").default(false),
    customDomainVerifiedAt: timestamp("custom_domain_verified_at", { mode: "date" }),
    customDomainVerificationToken: text("custom_domain_verification_token"),

    settings: json("settings").$type<{
      allowPlusOne?: boolean
      maxPlusOnes?: number
      requireApproval?: boolean
      sendReminders?: boolean
      reminderDays?: number[]
      emailSettings?: EventEmailSettings
    }>(),

    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("event_workspace_idx").on(table.workspaceId),
    index("event_slug_workspace_idx").on(table.workspaceId, table.slug),
    index("event_status_idx").on(table.status),
    index("event_start_date_idx").on(table.startDate),
    index("event_custom_domain_idx").on(table.customDomain),
  ]
)

export const eventsRelations = relations(events, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [events.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
}))
