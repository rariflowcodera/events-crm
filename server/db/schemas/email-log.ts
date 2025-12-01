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

    templateId: text("template_id").references(() => emailTemplates.id, {
      onDelete: "set null",
    }),

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
