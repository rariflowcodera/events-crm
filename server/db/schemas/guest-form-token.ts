import { relations } from "drizzle-orm"
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { guests } from "./guest"
import { eventForms } from "./event-form"

// ============================================================================
// Guest Form Tokens Schema
// ============================================================================
// Stores unique tokens for guest-specific form access (token mode)
// One token per guest per form - generated on-demand

export const guestFormTokens = pgTable(
  "guest_form_token",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    guestId: text("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),

    formId: text("form_id")
      .notNull()
      .references(() => eventForms.id, { onDelete: "cascade" }),

    // Unique token for URL access
    token: text("token").notNull().unique(),

    // Optional expiration (inherits from form if not set)
    expiresAt: timestamp("expires_at", { mode: "date" }),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("guest_form_token_guest_idx").on(table.guestId),
    index("guest_form_token_form_idx").on(table.formId),
    index("guest_form_token_token_idx").on(table.token),
    // Ensure one token per guest per form
    uniqueIndex("guest_form_token_guest_form_idx").on(table.guestId, table.formId),
  ]
)

export const guestFormTokensRelations = relations(guestFormTokens, ({ one }) => ({
  guest: one(guests, {
    fields: [guestFormTokens.guestId],
    references: [guests.id],
  }),
  form: one(eventForms, {
    fields: [guestFormTokens.formId],
    references: [eventForms.id],
  }),
}))
