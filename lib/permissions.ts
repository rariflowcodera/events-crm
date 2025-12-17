/**
 * Frontend permission constants - mirrors server/queries/permissions.ts
 * Use these constants instead of string literals for type safety
 */

export const PERMISSIONS = {
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

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
