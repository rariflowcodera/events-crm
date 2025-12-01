import { relations } from "drizzle-orm"
import { index, integer, json, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { events } from "./event"
import { emailTemplates } from "./email-template"
import { users } from "./user"

export const bulkEmailJobStatusEnum = pgEnum("bulk_email_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
])

export const bulkEmailJobs = pgTable(
  "bulk_email_job",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    templateId: text("template_id")
      .notNull()
      .references(() => emailTemplates.id, { onDelete: "restrict" }),

    // Email type: invitation, reminder, confirmation, etc.
    emailType: text("email_type").notNull(),

    // Job status
    status: bulkEmailJobStatusEnum("status").notNull().default("pending"),

    // Progress tracking
    totalEmails: integer("total_emails").notNull(),
    sentCount: integer("sent_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),

    // Guest selection (stored for reference)
    guestIds: json("guest_ids").$type<string[]>(),

    // BullMQ job reference
    bullmqJobId: text("bullmq_job_id"),

    // Error tracking
    errorMessage: text("error_message"),

    // Audit
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),

    startedAt: timestamp("started_at", { mode: "date" }),
    completedAt: timestamp("completed_at", { mode: "date" }),
  },
  (table) => [
    index("bulk_email_job_event_idx").on(table.eventId),
    index("bulk_email_job_status_idx").on(table.status),
    index("bulk_email_job_created_at_idx").on(table.createdAt),
  ]
)

export const bulkEmailJobsRelations = relations(bulkEmailJobs, ({ one }) => ({
  event: one(events, {
    fields: [bulkEmailJobs.eventId],
    references: [events.id],
  }),
  template: one(emailTemplates, {
    fields: [bulkEmailJobs.templateId],
    references: [emailTemplates.id],
  }),
  creator: one(users, {
    fields: [bulkEmailJobs.createdBy],
    references: [users.id],
  }),
}))
