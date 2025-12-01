import { workspaces } from "@/server/db/schemas"
import { relations } from "drizzle-orm"
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core"

import { InvitationStatusTypesType, RoleTypesType } from "@/types/types"

export const invitations = pgTable("invitation", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull(),

  invitedBy: text("invited_by").notNull(),
  invitedByProfileImage: text("invited_by_profile_image").notNull(),

  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),

  role: text("role").notNull().$type<RoleTypesType>().default("member"),

  status: text("status").notNull().$type<InvitationStatusTypesType>().default("pending"),

  expired: boolean("expired").notNull().default(false),

  token: text("token").notNull(),

  acceptedAt: timestamp("accepted_at"),
  expiresAt: timestamp("expires_at").notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const invitationsRelations = relations(invitations, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [invitations.workspaceId],
    references: [workspaces.id],
  }),
}))
