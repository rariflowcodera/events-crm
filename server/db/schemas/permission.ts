import { workspaceMembers } from "@/server/db/schemas"
import { relations } from "drizzle-orm"
import { index, pgTable, primaryKey, text } from "drizzle-orm/pg-core"

import { RoleTypesType } from "@/types/types"

// Define all possible permissions
export const permissions = pgTable(
  "permission",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull().unique(), // e.g., "create:comments"
    description: text("description"),
  },
  (t) => [index("permission_name_idx").on(t.name)]
)

// Define roles
export const roles = pgTable(
  "role",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull().unique().$type<RoleTypesType>().default("member"), // e.g., "admin"
    description: text("description"),
  },
  (t) => [index("role_name_idx").on(t.name)]
)

// Link roles to permissions (many-to-many)
export const rolePermissions = pgTable(
  "role_permission",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.permissionId] }),
    index("role_permission_permission_id_idx").on(t.permissionId),
  ]
)

// Relations
export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(rolePermissions),
  members: many(workspaceMembers),
}))

export const permissionsRelations = relations(permissions, ({ many }) => ({
  roles: many(rolePermissions),
}))

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}))
