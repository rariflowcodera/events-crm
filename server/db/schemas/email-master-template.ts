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
import { events } from "./event"
import { users } from "./user"

// ============================================================================
// Master Template Structure Type
// ============================================================================

export type MasterTemplateStructure = {
  showLogo: boolean
  showAccentStrip: boolean
  showEnglishSection: boolean
  showArabicSection: boolean
  showDivider: boolean
  showFooter: boolean
  sectionOrder: ("en" | "ar")[]
}

// ============================================================================
// Email Master Template Schema
// ============================================================================

export const emailMasterTemplates = pgTable(
  "email_master_template",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Scope: workspace-level (eventId null) or event-level override
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    eventId: text("event_id").references(() => events.id, {
      onDelete: "cascade",
    }),

    name: text("name").notNull(),
    description: text("description"),

    // The master template HTML with placeholders
    // Placeholders: {{logo}}, {{accentStripColor}}, {{enContent}}, {{arContent}}, {{footer}}, etc.
    htmlTemplate: text("html_template").notNull(),

    // Template structure config (what sections are enabled)
    structure: json("structure").$type<MasterTemplateStructure>(),

    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),

    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("email_master_template_workspace_idx").on(table.workspaceId),
    index("email_master_template_event_idx").on(table.eventId),
  ]
)

export const emailMasterTemplatesRelations = relations(
  emailMasterTemplates,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [emailMasterTemplates.workspaceId],
      references: [workspaces.id],
    }),
    event: one(events, {
      fields: [emailMasterTemplates.eventId],
      references: [events.id],
    }),
    creator: one(users, {
      fields: [emailMasterTemplates.createdBy],
      references: [users.id],
    }),
  })
)
