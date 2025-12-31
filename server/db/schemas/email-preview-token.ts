import { relations } from "drizzle-orm"
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { guests } from "./guest"
import { emailTemplates } from "./email-template"
import { events } from "./event"
import { users } from "./user"

// ============================================================================
// Email Preview Tokens Schema
// ============================================================================
// Stores unique tokens for public email preview access
// One token per guest per template - generated on-demand, never expires

export const emailPreviewTokens = pgTable(
  "email_preview_token",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Unique token for URL access
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
    // Ensure one token per guest per template
    uniqueIndex("email_preview_token_guest_template_idx").on(
      table.guestId,
      table.templateId
    ),
  ]
)

export const emailPreviewTokensRelations = relations(
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
