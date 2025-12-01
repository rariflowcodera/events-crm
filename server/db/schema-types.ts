import {
  account,
  invitations,
  permissions,
  users,
  userSettings,
  workspaceMembers,
  workspaces,
} from "@/server/db/schemas"

export type UserType = typeof users.$inferSelect

export type InvitationType = typeof invitations.$inferSelect

export type MemberType = typeof workspaceMembers.$inferSelect

export type WorkspaceType = typeof workspaces.$inferSelect

export type PermissionType = typeof permissions.$inferSelect

export type AccountType = typeof account.$inferSelect

export type SettingsType = typeof userSettings.$inferSelect
