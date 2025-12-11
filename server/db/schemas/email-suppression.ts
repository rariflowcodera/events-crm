import { pgEnum, pgTable, text, timestamp, index } from "drizzle-orm/pg-core"

export const suppressionReasonEnum = pgEnum("suppression_reason", [
  "UNKNOWN",
  "HARDBOUNCE",
  "SOFTBOUNCE",
  "MANUAL",
  "COMPLAINT",
  "UNSUBSCRIBE",
])

/**
 * Local cache of OCI Email Delivery suppression list
 * Synced hourly from OCI to enable:
 * 1. Pre-send checks (block emails to suppressed addresses)
 * 2. Updating email_log status to "bounced"
 */
export const emailSuppressions = pgTable(
  "email_suppression",
  {
    id: text("id").primaryKey(), // OCI suppression ID
    email: text("email").notNull(),
    reason: suppressionReasonEnum("reason").notNull(),
    errorDetail: text("error_detail"),
    errorSource: text("error_source"),
    ociCreatedAt: timestamp("oci_created_at", { mode: "date" }),
    syncedAt: timestamp("synced_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("email_suppression_email_idx").on(table.email)]
)

export type EmailSuppression = typeof emailSuppressions.$inferSelect
export type NewEmailSuppression = typeof emailSuppressions.$inferInsert
