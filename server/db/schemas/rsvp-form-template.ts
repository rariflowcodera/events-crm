import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  json,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { workspaces } from "./workspace"
import { users } from "./user"
import type { RsvpFormConfig } from "./event"

// ============================================================================
// RSVP Form Template Schema
// ============================================================================

/** Template category for organization */
export type RsvpFormTemplateCategory =
  | "corporate"
  | "conference"
  | "gala"
  | "sports"
  | "government"
  | "wedding"
  | "custom"

export const rsvpFormTemplates = pgTable(
  "rsvp_form_template",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Workspace ownership (null = system template)
    workspaceId: text("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),

    // Template metadata
    name: text("name").notNull(),
    description: text("description"),

    // The form configuration
    config: json("config").$type<RsvpFormConfig>().notNull(),

    // Categorization
    category: text("category").$type<RsvpFormTemplateCategory>().default("custom"),

    // System templates are built-in and cannot be deleted
    isSystem: boolean("is_system").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),

    // Audit fields
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("rsvp_form_template_workspace_idx").on(table.workspaceId),
    index("rsvp_form_template_category_idx").on(table.category),
    index("rsvp_form_template_system_idx").on(table.isSystem),
  ]
)

export const rsvpFormTemplatesRelations = relations(
  rsvpFormTemplates,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [rsvpFormTemplates.workspaceId],
      references: [workspaces.id],
    }),
    creator: one(users, {
      fields: [rsvpFormTemplates.createdBy],
      references: [users.id],
    }),
  })
)
