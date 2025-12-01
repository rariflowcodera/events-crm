import { roles, users, workspaces } from "@/server/db/schemas"
import { relations } from "drizzle-orm"
import { index, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core"

export const workspaceMembers = pgTable(
  "workspace_member",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),

    status: text("status").notNull().$type<"active" | "inactive">().default("active"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at"),
  },

  (t) => [
    primaryKey({ columns: [t.userId, t.workspaceId] }),
    index("workspace_member_user_workspace_idx").on(t.userId, t.workspaceId),
    index("workspace_member_role_id_idx").on(t.roleId),
    index("workspace_member_status_idx").on(t.status),
  ]
)

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  role: one(roles, {
    fields: [workspaceMembers.roleId],
    references: [roles.id],
  }),
}))
