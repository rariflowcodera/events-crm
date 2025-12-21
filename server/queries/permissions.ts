import { db } from "@/server/db/config/database"
import { PermissionType, UserType, WorkspaceType } from "@/server/db/schema-types"
import { permissions, rolePermissions, roles, workspaceMembers } from "@/server/db/schemas"
import { and, eq, inArray, sql } from "drizzle-orm"

import { RoleTypesType } from "@/types/types"

type DefaultPermissionsType = {
  name: PermissionType["name"]
  description: string
}

type DefaultRolesType = {
  name: RoleTypesType
  description: string
  permissions: PermissionType["name"][]
}

export async function getIsUserMember({
  userId,
  workspaceId,
}: {
  userId: UserType["id"]
  workspaceId: WorkspaceType["id"]
}) {
  const [isMember] = await db
    .select({
      status: workspaceMembers.status,
    })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)))

  return isMember.status === "active" ? true : false
}

export async function hasPermission({
  userId,
  workspaceId,
  permissionName,
}: {
  userId: UserType["id"]
  workspaceId: WorkspaceType["id"]
  permissionName: PermissionType["name"]
}): Promise<boolean> {
  // Direct SQL query to check for the specific permission
  const result = await db
    .select({ exists: sql`count(*)` })
    .from(workspaceMembers)
    .innerJoin(roles, eq(workspaceMembers.roleId, roles.id))
    .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(permissions.name, permissionName)
      )
    )
    .limit(1)

  return result.length > 0 && Number(result[0].exists) > 0
}

// Helper for checking multiple permissions
export async function hasPermissions(
  userId: string,
  workspaceId: string,
  permissionNames: string[]
): Promise<boolean> {
  if (permissionNames.length === 0) return true

  const result = await db
    .select({ name: permissions.name })
    .from(workspaceMembers)
    .innerJoin(roles, eq(workspaceMembers.roleId, roles.id))
    .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId),
        inArray(permissions.name, permissionNames)
      )
    )

  const foundPermissions = new Set(result.map((r) => r.name))
  return permissionNames.every((name) => foundPermissions.has(name))
}

export const PERMISSIONS = {
  // Legacy item permissions (can be removed if not needed)
  VIEW_ITEMS: "view:items",
  CREATE_ITEMS: "create:items",
  UPDATE_ITEMS: "update:items",
  DELETE_ITEMS: "delete:items",

  // Member management
  VIEW_MEMBERS: "view:members",
  CREATE_MEMBERS: "create:members",
  UPDATE_MEMBERS: "update:members",
  DELETE_MEMBERS: "delete:members",
  MANAGE_MEMBERS: "manage:members",
  INVITE_MEMBERS: "invite:members",
  REMOVE_MEMBERS: "remove:members",
  MANAGE_ROLES: "manage:roles",

  // Workspace management
  MANAGE_WORKSPACE: "manage:workspace",
  DELETE_WORKSPACE: "delete:workspace",
  TRANSFER_OWNERSHIP: "transfer:ownership",

  // Event management
  CREATE_EVENT: "create:event",
  MANAGE_EVENT: "manage:event",
  DELETE_EVENT: "delete:event",
  VIEW_EVENT: "view:event",

  // Guest management
  IMPORT_GUESTS: "import:guests",
  MANAGE_GUESTS: "manage:guests",
  VIEW_GUESTS: "view:guests",
  VIEW_GUEST_DETAILS: "view:guest_details",
  DELETE_GUESTS: "delete:guests",

  // Attendance
  MARK_ATTENDANCE: "mark:attendance",

  // RSVP management
  VIEW_RSVPS: "view:rsvps",
  MANAGE_RSVPS: "manage:rsvps",

  // Email management
  SEND_EMAILS: "send:emails",
  MANAGE_TEMPLATES: "manage:templates",

  // Reporting
  VIEW_REPORTS: "view:reports",
  EXPORT_DATA: "export:data",
} as const

const defaultPermissions: DefaultPermissionsType[] = [
  // Member management
  { name: PERMISSIONS.VIEW_MEMBERS, description: "Can view members" },
  { name: PERMISSIONS.CREATE_MEMBERS, description: "Can create members" },
  { name: PERMISSIONS.UPDATE_MEMBERS, description: "Can update members" },
  { name: PERMISSIONS.DELETE_MEMBERS, description: "Can delete members" },
  { name: PERMISSIONS.MANAGE_MEMBERS, description: "Can manage members" },
  { name: PERMISSIONS.INVITE_MEMBERS, description: "Can invite members" },
  { name: PERMISSIONS.REMOVE_MEMBERS, description: "Can remove members" },
  { name: PERMISSIONS.MANAGE_ROLES, description: "Can manage roles" },

  // Workspace management
  { name: PERMISSIONS.MANAGE_WORKSPACE, description: "Can manage workspace" },
  { name: PERMISSIONS.DELETE_WORKSPACE, description: "Can delete workspace" },
  { name: PERMISSIONS.TRANSFER_OWNERSHIP, description: "Can transfer workspace ownership" },

  // Legacy item permissions
  { name: PERMISSIONS.VIEW_ITEMS, description: "Can view items" },
  { name: PERMISSIONS.CREATE_ITEMS, description: "Can create items" },
  { name: PERMISSIONS.UPDATE_ITEMS, description: "Can update items" },
  { name: PERMISSIONS.DELETE_ITEMS, description: "Can delete items" },

  // Event management
  { name: PERMISSIONS.CREATE_EVENT, description: "Can create events" },
  { name: PERMISSIONS.MANAGE_EVENT, description: "Can manage event settings" },
  { name: PERMISSIONS.DELETE_EVENT, description: "Can delete events" },
  { name: PERMISSIONS.VIEW_EVENT, description: "Can view events" },

  // Guest management
  { name: PERMISSIONS.IMPORT_GUESTS, description: "Can import guests from Excel/CSV" },
  { name: PERMISSIONS.MANAGE_GUESTS, description: "Can manage guest records" },
  { name: PERMISSIONS.VIEW_GUESTS, description: "Can view guest list" },
  { name: PERMISSIONS.VIEW_GUEST_DETAILS, description: "Can view individual guest profiles" },
  { name: PERMISSIONS.DELETE_GUESTS, description: "Can delete guests" },

  // Attendance
  { name: PERMISSIONS.MARK_ATTENDANCE, description: "Can mark guest attendance" },

  // RSVP management
  { name: PERMISSIONS.VIEW_RSVPS, description: "Can view RSVP responses" },
  { name: PERMISSIONS.MANAGE_RSVPS, description: "Can manage RSVP responses" },

  // Email management
  { name: PERMISSIONS.SEND_EMAILS, description: "Can send emails to guests" },
  { name: PERMISSIONS.MANAGE_TEMPLATES, description: "Can manage email templates" },

  // Reporting
  { name: PERMISSIONS.VIEW_REPORTS, description: "Can view analytics and reports" },
  { name: PERMISSIONS.EXPORT_DATA, description: "Can export data" },
]

const defaultRoles: DefaultRolesType[] = [
  {
    name: "owner",
    description: "Workspace owner with full access",
    permissions: ["*"],
  },
  {
    name: "admin",
    description: "Workspace administrator",
    permissions: [
      // Member management
      "view:members",
      "create:members",
      "update:members",
      "delete:members",
      "invite:members",
      "remove:members",
      "manage:members",
      "manage:roles",
      // Event management
      "create:event",
      "manage:event",
      "delete:event",
      "view:event",
      // Guest management
      "import:guests",
      "manage:guests",
      "view:guests",
      "view:guest_details",
      "delete:guests",
      // Attendance
      "mark:attendance",
      // RSVP management
      "view:rsvps",
      "manage:rsvps",
      // Email management
      "send:emails",
      "manage:templates",
      // Reporting
      "view:reports",
      "export:data",
    ],
  },
  {
    name: "manager",
    description: "Event manager with limited access",
    permissions: [
      "view:members",
      "invite:members",
      "manage:members",
      "view:event",
      "manage:event",
      "view:guests",
      "view:guest_details",
      "manage:guests",
      "import:guests",
      "mark:attendance",
      "view:rsvps",
      "manage:rsvps",
      "send:emails",
      "view:reports",
      "export:data",
    ],
  },
  {
    name: "event_staff",
    description: "Event staff with attendance marking access",
    permissions: [
      "view:event",
      "view:guests",
      "view:rsvps",
      "mark:attendance",
    ],
  },
  {
    name: "member",
    description: "Regular member with view-only access",
    permissions: ["view:members", "view:event", "view:guests", "view:guest_details", "view:rsvps", "view:reports"],
  },
]

// For seed.ts to create initial data
export async function initializeRBAC() {
  try {
    // Insert permissions one by one to handle conflicts
    for (const permission of defaultPermissions) {
      await db
        .insert(permissions)
        .values({
          id: crypto.randomUUID(),
          ...permission,
        })
        .onConflictDoUpdate({
          target: permissions.name,
          set: {
            description: permission.description,
          },
        })
    }

    // Get all inserted permissions
    const insertedPermissions = await db.select().from(permissions)
    const permissionsMap = new Map(insertedPermissions.map((p) => [p.name, p.id]))

    // Insert roles one by one
    for (const role of defaultRoles) {
      const [insertedRole] = await db
        .insert(roles)
        .values({
          id: crypto.randomUUID(),
          name: role.name,
          description: role.description,
        })
        .onConflictDoUpdate({
          target: roles.name,
          set: {
            description: role.description,
          },
        })
        .returning()

      if (insertedRole) {
        // Delete existing role permissions
        await db.delete(rolePermissions).where(eq(rolePermissions.roleId, insertedRole.id))

        // If role has all permissions
        if (role.permissions.includes("*")) {
          // Insert all permissions for this role
          await db.insert(rolePermissions).values(
            insertedPermissions.map((permission) => ({
              roleId: insertedRole.id,
              permissionId: permission.id,
            }))
          )
        } else {
          // Insert specific permissions for the role
          const rolePermissionValues = role.permissions
            .map((permissionName) => {
              const permissionId = permissionsMap.get(permissionName)
              if (permissionId) {
                return {
                  roleId: insertedRole.id,
                  permissionId,
                }
              }
              return null
            })
            .filter((v): v is { roleId: string; permissionId: string } => v !== null)

          if (rolePermissionValues.length > 0) {
            await db.insert(rolePermissions).values(rolePermissionValues)
          }
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log("RBAC initialization completed successfully")
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error initializing RBAC:", error)
    throw error
  }
}
