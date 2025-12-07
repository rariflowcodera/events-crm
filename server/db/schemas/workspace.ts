import { invitations, users, workspaceMembers, events } from "@/server/db/schemas"
import { relations } from "drizzle-orm"
import { index, json, pgTable, text, timestamp } from "drizzle-orm/pg-core"

// ============================================================================
// Workspace Branding Type
// ============================================================================

export type WorkspaceBranding = {
  logo?: string // Light mode logo URL
  logoDark?: string // Dark mode logo URL
  primaryColor?: string // Primary brand color (hex)
  accentColor?: string // Accent color (hex)
  primaryColorDark?: string // Dark mode primary color
  accentColorDark?: string // Dark mode accent color
}

// ============================================================================
// Workspace Email Settings Type
// ============================================================================

export type WorkspaceEmailSettings = {
  fromEmail?: string // Sender email address (e.g., "invitations@company.com")
  fromName?: string // Sender display name (e.g., "Company Events Team")
}

export const workspaces = pgTable(
  "workspace",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),

    phone: text("phone"),
    logo: text("logo"),

    branding: json("branding").$type<WorkspaceBranding>(),
    emailSettings: json("email_settings").$type<WorkspaceEmailSettings>(),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$default(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("workspace_slug_idx").on(table.slug),
    index("workspace_owner_idx").on(table.ownerId),
    index("workspace_created_at_idx").on(table.createdAt),
  ]
)

export const workspaceRelations = relations(workspaces, ({ many, one }) => ({
  creator: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  invitations: many(invitations),
  events: many(events),
}))
