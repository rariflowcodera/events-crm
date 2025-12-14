import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  json,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { events } from "./event"
import { guests } from "./guest"
import { eventForms } from "./event-form"

// ============================================================================
// Form Responses Schema
// ============================================================================

export const formResponses = pgTable(
  "form_response",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    formId: text("form_id")
      .notNull()
      .references(() => eventForms.id, { onDelete: "cascade" }),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    // Guest Association (required - no anonymous submissions)
    guestId: text("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),

    guestEmail: text("guest_email").notNull(),

    // Response Data
    responses: json("responses").$type<Record<string, unknown>>().notNull(),

    // Amendment Tracking
    isAmendment: boolean("is_amendment").notNull().default(false),
    previousResponseId: text("previous_response_id"),

    // Metadata
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    submittedAt: timestamp("submitted_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("form_response_form_idx").on(table.formId),
    index("form_response_event_idx").on(table.eventId),
    index("form_response_guest_idx").on(table.guestId),
    index("form_response_email_idx").on(table.guestEmail),
    index("form_response_submitted_idx").on(table.formId, table.submittedAt),
  ]
)

export const formResponsesRelations = relations(formResponses, ({ one }) => ({
  form: one(eventForms, {
    fields: [formResponses.formId],
    references: [eventForms.id],
  }),
  event: one(events, {
    fields: [formResponses.eventId],
    references: [events.id],
  }),
  guest: one(guests, {
    fields: [formResponses.guestId],
    references: [guests.id],
  }),
}))
