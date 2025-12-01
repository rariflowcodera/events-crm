// "use server"

// import { getCurrentUser } from "@/server/actions/auth-actions"
// import { db } from "@/server/db/config/database"
// import { PermissionType, UserType, WorkspaceType } from "@/server/db/schema-types"
// import { roles, workspaceMembers, workspaces } from "@/server/db/schemas"
// import {
//   ApiError,
//   AuthenticationError,
//   AuthorizationError,
//   DatabaseError,
//   NotFoundError,
//   RateLimitError,
//   ValidationError,
// } from "@/server/exceptions/exceptions"
// import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
// import { formatZodError } from "@/server/utils/format-zod-error"
// import { Ratelimit } from "@upstash/ratelimit"
// import { and, eq } from "drizzle-orm"

// import { RATE_LIMIT_1_MINUTE, RATE_LIMIT_5 } from "@/lib/constants"
// import { redis } from "@/lib/redis"
// import { updateWorkspaceMemberSchema, userSchema, workspaceSchema } from "@/lib/schemas"

// const ratelimit = new Ratelimit({
//   redis,
//   limiter: Ratelimit.slidingWindow(RATE_LIMIT_5, RATE_LIMIT_1_MINUTE),
// })

// // export const updateMember = async ({
// //   role,
// //   userId,
// //   slug,
// // }: {
// //   role: PermissionType["name"]
// //   userId: UserType["id"]
// //   slug: WorkspaceType["slug"]
// // }) => {
// //   try {
// //     const validateRole = updateWorkspaceMemberSchema.safeParse({ role, userId, slug })

// //     if (!validateRole.success) {
// //       throw new ValidationError(formatZodError(validateRole.error))
// //     }

// //     const { role: validatedRole, userId: id, slug: validatedSlug } = validateRole.data

// //     const { user } = await getCurrentUser()

// //     if (!user) {
// //       throw new AuthenticationError("User not authenticated")
// //     }

// //     const identifier = `ratelimit:update-profile:${userId}`
// //     const { success } = await ratelimit.limit(identifier)

// //     if (!success) {
// //       throw new RateLimitError("Too many requests, please try again later")
// //     }

// //     if (user.id === id) {
// //       throw new AuthorizationError("You can't update your own role")
// //     }

// //     const [workspace] = await db
// //       .select()
// //       .from(workspaces)
// //       .where(eq(workspaces.slug, validatedSlug))
// //       .limit(1)

// //     if (!workspace) {
// //       throw new NotFoundError("Workspace not found")
// //     }

// //     const canUpdateRole = await hasPermission(user.id, workspace.id, PERMISSIONS.UPDATE_MEMBERS)

// //     if (!canUpdateRole) {
// //       throw new AuthorizationError("You don't have permission to update this member")
// //     }

// //     // Get the role ID for the new role
// //     const [newRole] = await db.select().from(roles).where(eq(roles.name, validatedRole)).limit(1)

// //     if (!newRole) {
// //       throw new ValidationError("Invalid role")
// //     }

// //     // update role in db
// //     await db
// //       .update(workspaceMembers)
// //       .set({ roleId: newRole.id, updatedAt: new Date() })
// //       .where(and(eq(workspaceMembers.userId, id), eq(workspaceMembers.workspaceId, workspace.id)))

// //     return {
// //       status: 200,
// //       success: true,
// //       message: "Member role updated successfully",
// //     }
// //   } catch (error: any) {
// //     // Re-throw known errors
// //     if (error instanceof ApiError) {
// //       throw error
// //     }
// //     // Handle unexpected errors
// //     throw new DatabaseError("Failed to update member", "An unexpected error occurred")
// //   }
// // }

// // export const deleteMemberAction = async ({
// //   memberId,
// //   slug,
// // }: {
// //   memberId: UserType["id"]
// //   slug: WorkspaceType["slug"]
// // }) => {
// //   try {
// //     const validateId = userSchema.pick({ id: true }).safeParse({ id: memberId })
// //     const validateSlug = workspaceSchema.pick({ slug: true }).safeParse({ slug: slug })

// //     if (!validateId.success) {
// //       throw new ValidationError(formatZodError(validateId.error))
// //     }

// //     if (!validateSlug.success) {
// //       throw new ValidationError(formatZodError(validateSlug.error))
// //     }

// //     const { id: validatedId } = validateId.data
// //     const { slug: validatedSlug } = validateSlug.data

// //     if (!validatedId) {
// //       throw new ValidationError("User ID is required")
// //     }

// //     // 1. Get session
// //     const { user } = await getCurrentUser()

// //     if (!user) {
// //       throw new AuthenticationError("Unauthorized")
// //     }

// //     if (user.id === validatedId) {
// //       throw new ValidationError("You cannot delete yourself")
// //     }

// //     const identifier = `ratelimit:delete-member:${user.id}`

// //     const { success } = await ratelimit.limit(identifier)
// //     if (!success) {
// //       return {
// //         status: 429,
// //         success: false,
// //         message: "Rate limit exceeded",
// //       }
// //     }

// //     const [workspace] = await db
// //       .select()
// //       .from(workspaces)
// //       .where(eq(workspaces.slug, validatedSlug))
// //       .limit(1)

// //     if (!workspace) {
// //       throw new NotFoundError("Workspace not found")
// //     }

// //     const canDelete = await hasPermission(user.id, workspace.id, PERMISSIONS.DELETE_MEMBERS)

// //     if (!canDelete) {
// //       throw new AuthorizationError("Unauthorized")
// //     }

// //     const member = await db.query.workspaceMembers.findFirst({
// //       where: and(
// //         eq(workspaceMembers.userId, validatedId),
// //         eq(workspaceMembers.workspaceId, workspace.id)
// //       ),
// //       with: {
// //         role: true,
// //       },
// //     })

// //     if (!member) {
// //       throw new NotFoundError("Member not found")
// //     }

// //     if (member.role.name === "owner" || member.role.name === "admin") {
// //       throw new AuthorizationError("You cannot delete the owner or admin of the workspace")
// //     }

// //     // 2. Remove user member object
// //     await db
// //       .delete(workspaceMembers)
// //       .where(
// //         and(
// //           eq(workspaceMembers.userId, validatedId),
// //           eq(workspaceMembers.workspaceId, workspace.id)
// //         )
// //       )

// //     return {
// //       status: 200,
// //       success: true,
// //       message: "Member deleted successfully",
// //     }
// //   } catch (error: any) {
// //     // Re-throw known errors
// //     if (error instanceof ApiError) {
// //       throw error
// //     }
// //     // Handle unexpected errors
// //     throw new DatabaseError("Failed to delete member", "An unexpected error occurred")
// //   }
// // }

// export const leaveWorkspaceAction = async ({ slug }: { slug: WorkspaceType["slug"] }) => {
//   try {
//     const validateValues = workspaceSchema.pick({ slug: true }).safeParse({ slug })

//     if (!validateValues.success) {
//       throw new ValidationError(formatZodError(validateValues.error))
//     }

//     const { slug: validatedSlug } = validateValues.data

//     const { user } = await getCurrentUser()

//     if (!user) {
//       throw new AuthenticationError()
//     }

//     const identifier = `ratelimit:delete-member:${user.id}`
//     const { success } = await ratelimit.limit(identifier)

//     if (!success) {
//       throw new RateLimitError()
//     }

//     const [workspace] = await db
//       .select()
//       .from(workspaces)
//       .where(eq(workspaces.slug, validatedSlug))
//       .limit(1)

//     if (!workspace) {
//       throw new NotFoundError("Workspace not found")
//     }

//     // delete member from db
//     await db
//       .delete(workspaceMembers)
//       .where(
//         and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, user.id))
//       )

//     return {
//       status: 200,
//       success: true,
//       message: "Successfully left workspace",
//       description: "You will now be redirected...",
//     }
//   } catch (error: any) {
//     if (error instanceof ApiError) {
//       throw error
//     }

//     throw new DatabaseError("Failed to delete member", "An unexpected error occurred")
//   }
// }
