import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
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

    additionalContacts: json("additional_contacts").$type<
      Array<{
        type: "assistant" | "spouse" | "secretary" | "other"
        name?: string
        email?: string
        phone?: string
        isPrimary?: boolean
      }>
    >(),

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

export const guestsRelations = relations(guests, ({ one }) => ({
  event: one(events, {
    fields: [guests.eventId],
    references: [events.id],
  }),
  category: one(guestCategories, {
    fields: [guests.categoryId],
    references: [guestCategories.id],
  }),
}))
