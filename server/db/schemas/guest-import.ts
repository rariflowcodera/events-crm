import { relations } from "drizzle-orm"
import {
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
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

    errors: json("errors").$type<
      Array<{
        row: number
        column?: string
        message: string
        data?: Record<string, unknown>
      }>
    >(),

    startedAt: timestamp("started_at", { mode: "date" }),
    completedAt: timestamp("completed_at", { mode: "date" }),

    importedBy: text("imported_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("guest_import_event_idx").on(table.eventId),
    index("guest_import_status_idx").on(table.status),
  ]
)

export const guestImportBatchesRelations = relations(
  guestImportBatches,
  ({ one }) => ({
    event: one(events, {
      fields: [guestImportBatches.eventId],
      references: [events.id],
    }),
    importer: one(users, {
      fields: [guestImportBatches.importedBy],
      references: [users.id],
    }),
  })
)
