import { relations } from "drizzle-orm"
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { events } from "./event"
import { users } from "./user"

export const eventDocumentTypeEnum = pgEnum("event_document_type", [
  "schedule",
  "map",
  "policy",
  "brochure",
  "invitation",
  "other",
  "image",
])

export const eventDocumentTypeValues = [
  "schedule",
  "map",
  "policy",
  "brochure",
  "invitation",
  "other",
  "image",
] as const

export type EventDocumentType = (typeof eventDocumentTypeValues)[number]

export const eventDocuments = pgTable(
  "event_document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    // Document metadata
    name: text("name").notNull(),
    fileName: text("file_name").notNull(),
    url: text("url").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),

    // Categorization
    type: eventDocumentTypeEnum("type").notNull().default("other"),

    // Category visibility: null/empty = all categories, array = specific categories only
    categoryIds: jsonb("category_ids").$type<string[]>(),

    // Audit
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("event_document_event_idx").on(table.eventId),
    index("event_document_type_idx").on(table.eventId, table.type),
  ]
)

export const eventDocumentsRelations = relations(
  eventDocuments,
  ({ one }) => ({
    event: one(events, {
      fields: [eventDocuments.eventId],
      references: [events.id],
    }),
    creator: one(users, {
      fields: [eventDocuments.createdBy],
      references: [users.id],
    }),
  })
)
