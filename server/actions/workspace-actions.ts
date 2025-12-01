// "use server"

// import { getCurrentUser } from "@/server/actions/auth-actions"
// import { db, dbClient } from "@/server/db/config/database"
// import { WorkspaceType } from "@/server/db/schema-types"
// import { roles, subscriptions, users, workspaceMembers, workspaces } from "@/server/db/schemas"
// import {
//   ApiError,
//   AuthenticationError,
//   AuthorizationError,
//   DatabaseError,
//   NotFoundError,
//   RateLimitError,
//   ValidationError,
// } from "@/server/exceptions/exceptions"
// import { createNotification } from "@/server/queries/notifications"
// import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
// import { formatZodError } from "@/server/utils/format-zod-error"
// import { Ratelimit } from "@upstash/ratelimit"
// import { and, eq } from "drizzle-orm"

// import { RATE_LIMIT_1_MINUTE, RATE_LIMIT_10 } from "@/lib/constants"
// import { redis } from "@/lib/redis"
// import { userSchema, workspaceSchema } from "@/lib/schemas"

// const ratelimit = new Ratelimit({
//   redis,
//   limiter: Ratelimit.slidingWindow(RATE_LIMIT_10, RATE_LIMIT_1_MINUTE),
// })

// // export const createWorkspaceAction = async ({
// //   values,
// //   isInitial,
// // }: {
// //   values: z.infer<typeof workspaceSchema>
// //   isInitial?: boolean
// // }) => {
// //   try {
// //     // 1. Validate input
// //     const validateValues = workspaceSchema
// //       .pick({ name: true, logo: true, slug: true })
// //       .safeParse(values)

// //     if (!validateValues.success) {
// //       throw new ValidationError(formatZodError(validateValues.error))
// //     }

// //     const { name, slug, logo } = validateValues.data
// //     const slugName = slugify(slug)

// //     // 2. Check authentication
// //     const { user } = await getCurrentUser()
// //     if (!user) {
// //       throw new AuthenticationError()
// //     }

// //     // 3. Check rate limit
// //     const identifier = `ratelimit:create-workspace:${user.id}`
// //     const { success: rateLimitSuccess } = await ratelimit.limit(identifier)
// //     if (!rateLimitSuccess) {
// //       throw new RateLimitError()
// //     }

// //     // 4. Get all required data in parallel
// //     const [workspaceWithSlug, userOwnedWorkspaces, stripeSubscription, subscription, ownerRole] =
// //       await getWorkspaceData(user.id, slugName)

// //     // 5. Validate all required data
// //     if (workspaceWithSlug.length) {
// //       throw new ConflictError("Slug already exists")
// //     }

// //     if (!subscription.length) {
// //       throw new NotFoundError("Subscription not found")
// //     }

// //     if (!ownerRole.length) {
// //       throw new NotFoundError("Owner role not found")
// //     }

// //     const { workspacesQuota, type, isSubscribed } = stripeSubscription

// //     // 6. Check subscription limits

// //     if (userOwnedWorkspaces.length >= workspacesQuota! && !isSubscribed) {
// //       throw new QuotaExceededError(
// //         `Exceeded ${capitalizeFirstLetter(type!)} plan Workspace quota`,
// //         "Please upgrade your plan to create more workspaces"
// //       )
// //     }

// //     const result = await dbClient.transaction(async (tx) => {
// //       // Create workspace
// //       const [newWorkspace] = await tx
// //         .insert(workspaces)
// //         .values({
// //           ownerId: user.id,
// //           slug: slugName,
// //           logo: logo ? (logo as string) : null,
// //           name,
// //           subscriptionId: subscription[0].id,
// //         })
// //         .returning({
// //           id: workspaces.id,
// //           slug: workspaces.slug,
// //         })

// //       // Create workspace member with owner role
// //       await tx.insert(workspaceMembers).values({
// //         roleId: ownerRole[0].id,
// //         userId: user.id,
// //         workspaceId: newWorkspace.id,
// //       })

// //       if (isInitial) {
// //         await tx
// //           .update(userSettings)
// //           .set({
// //             onboardingStep: "collaborate",
// //             updatedAt: new Date(),
// //           })
// //           .where(eq(userSettings.userId, user.id))
// //       }

// //       return newWorkspace
// //     })

// //     return {
// //       success: true,
// //       status: 200,
// //       slug: result.slug,
// //       message: "Workspace created successfully",
// //     }
// //   } catch (error: any) {
// //     // Re-throw known errors
// //     if (error instanceof ApiError) {
// //       throw error
// //     }

// //     // Log unexpected errors
// //     throw new DatabaseError(
// //       "Failed to create workspace",
// //       `An unexpected error occurred: ${error.message}`
// //     )
// //   }
// // }

// // export const updateWorkspaceAction = async ({
// //   values,
// //   slug,
// // }: {
// //   values: z.infer<typeof updateWorkspaceSchema>
// //   slug: WorkspaceType["slug"]
// // }) => {
// //   try {
// //     const validateValues = updateWorkspaceSchema.safeParse(values)
// //     const validateSlug = workspaceSchema.pick({ slug: true }).safeParse({ slug: slug })

// //     if (!validateValues.success) {
// //       throw new ValidationError(formatZodError(validateValues.error))
// //     }

// //     if (!validateSlug.success) {
// //       throw new ValidationError(formatZodError(validateSlug.error))
// //     }

// //     const { name, slug: newSlug, logo } = validateValues.data
// //     const { slug: validatedSlug } = validateSlug.data

// //     const { user } = await getCurrentUser()

// //     if (!user) {
// //       throw new AuthenticationError()
// //     }

// //     const identifier = `ratelimit:update-workspace:${user.id}`
// //     const { success } = await ratelimit.limit(identifier)

// //     if (!success) {
// //       throw new RateLimitError()
// //     }

// //     const [workspace] = await db
// //       .select()
// //       .from(workspaces)
// //       .where(eq(workspaces.slug, validatedSlug))
// //       .limit(1)

// //     if (!workspace) {
// //       throw new NotFoundError("Workspace not found")
// //     }

// //     const canEdit = await hasPermission(user.id, workspace.id, PERMISSIONS.MANAGE_WORKSPACE)

// //     if (!canEdit) {
// //       throw new AuthorizationError()
// //     }

// //     await db
// //       .update(workspaces)
// //       .set({
// //         name,
// //         slug: newSlug,
// //         logo: logo ? (logo as string) : null,
// //         updatedAt: new Date(),
// //       })
// //       .where(eq(workspaces.slug, validatedSlug))

// //     return {
// //       success: true,
// //       status: 200,
// //       message: "Workspace updated successfully",
// //       newSlug: newSlug ?? null,
// //     }
// //   } catch (error: any) {
// //     // Re-throw known errors
// //     if (error instanceof ApiError) {
// //       throw error
// //     }
// //     // Handle unexpected errors
// //     throw new DatabaseError("Failed to update workspace", "An unexpected error occurred")
// //   }
// // }

// export const transferWorkspaceOwnership = async ({
//   id,
//   email,
// }: {
//   id: WorkspaceType["id"]
//   email: string
// }) => {
//   try {
//     const validateEmail = userSchema.pick({ email: true }).safeParse({ email })

//     if (!validateEmail.success) {
//       throw new ValidationError(formatZodError(validateEmail.error))
//     }

//     const validateId = workspaceSchema.pick({ id: true }).safeParse({ id })

//     if (!validateId.success) {
//       throw new ValidationError(formatZodError(validateId.error))
//     }

//     const { email: validatedEmail } = validateEmail.data
//     const { id: validatedId } = validateId.data

//     if (!validatedId) {
//       throw new ValidationError("Invalid workspace ID")
//     }

//     const { user } = await getCurrentUser()

//     if (!user) {
//       throw new AuthenticationError()
//     }

//     const identifier = `ratelimit:transfer-workspace-ownership:${user.id}`
//     const { success } = await ratelimit.limit(identifier)

//     if (!success) {
//       throw new RateLimitError()
//     }

//     const [newOwner] = await db.select().from(users).where(eq(users.email, validatedEmail)).limit(1)

//     if (!newOwner) {
//       throw new NotFoundError("New owner not found")
//     }

//     if (newOwner.id === user.id) {
//       throw new ValidationError("New owner cannot be the current user")
//     }

//     const [workspace] = await db
//       .select()
//       .from(workspaces)
//       .where(eq(workspaces.id, validatedId))
//       .limit(1)

//     if (!workspace) {
//       throw new NotFoundError("Workspace not found")
//     }

//     const canTransferOwnership = await hasPermission(
//       user.id,
//       workspace.id,
//       PERMISSIONS.TRANSFER_OWNERSHIP
//     )

//     if (!canTransferOwnership) {
//       throw new AuthorizationError()
//     }

//     // Check if the user is a member of the workspace
//     const [member] = await db
//       .select()
//       .from(workspaceMembers)
//       .where(
//         and(
//           eq(workspaceMembers.userId, newOwner.id),
//           eq(workspaceMembers.workspaceId, workspace.id)
//         )
//       )
//       .limit(1)

//     if (!member) {
//       throw new NotFoundError("New owner is not a member of the workspace")
//     }

//     const [currentOwnerSubscription] = await db
//       .select()
//       .from(subscriptions)
//       .where(eq(subscriptions.userId, user.id))
//       .limit(1)

//     if (
//       currentOwnerSubscription.planType !== "PRO" &&
//       currentOwnerSubscription.planType !== "STARTER"
//     ) {
//       throw new ValidationError("Current owner must have an active PRO or STARTER subscription")
//     }

//     const [newOwnerSubscription] = await db
//       .select()
//       .from(subscriptions)
//       .where(eq(subscriptions.userId, newOwner.id))
//       .limit(1)

//     if (newOwnerSubscription.planType !== currentOwnerSubscription.planType) {
//       throw new ValidationError(
//         "New owner must have the same subscription plan as the current owner"
//       )
//     }

//     await dbClient.transaction(async (tx) => {
//       // Update the new owner
//       await tx
//         .update(workspaces)
//         .set({
//           ownerId: newOwner.id,
//           updatedAt: new Date(),
//         })
//         .where(eq(workspaces.id, workspace.id))

//       const [ownerRole] = await tx
//         .select({
//           id: roles.id,
//         })
//         .from(roles)
//         .where(eq(roles.name, "owner"))
//         .limit(1)

//       const [memberRole] = await tx
//         .select({
//           id: roles.id,
//         })
//         .from(roles)
//         .where(eq(roles.name, "member"))
//         .limit(1)

//       await tx
//         .update(workspaceMembers)
//         .set({
//           roleId: ownerRole.id,
//           updatedAt: new Date(),
//         })
//         .where(eq(workspaceMembers.userId, newOwner.id))

//       await tx
//         .update(workspaceMembers)
//         .set({
//           roleId: memberRole.id,
//           updatedAt: new Date(),
//         })
//         .where(eq(workspaceMembers.userId, user.id))

//       await createNotification({
//         values: {
//           title: "Workspace Ownership Transferred",
//           message: `You are no longer the owner of ${workspace.name}`,
//           userId: user.id,
//         },
//       })

//       await createNotification({
//         values: {
//           title: "Workspace Ownership Transferred",
//           message: `You are now the owner of ${workspace.name}`,
//           userId: newOwner.id,
//         },
//       })
//     })

//     return {
//       status: 200,
//       success: true,
//       message: "Workspace ownership transferred successfully",
//       description: "You are no longer the owner of this workspace",
//     }
//   } catch (error: any) {
//     // Re-throw known errors
//     if (error instanceof ApiError) {
//       throw error
//     }
//     // Handle unexpected errors
//     throw new DatabaseError(
//       "Failed to transfer workspace ownership",
//       "An unexpected error occurred"
//     )
//   }
// }

// // export const deleteWorkspaceAction = async ({ slug }: { slug: WorkspaceType["slug"] }) => {
// //   try {
// //     const validateSlug = workspaceSchema.pick({ slug: true }).safeParse({ slug: slug })

// //     if (!validateSlug.success) {
// //       throw new ValidationError(formatZodError(validateSlug.error))
// //     }

// //     const { slug: validatedSlug } = validateSlug.data

// //     const { user } = await getCurrentUser()

// //     if (!user) {
// //       throw new AuthenticationError()
// //     }

// //     const identifier = `ratelimit:delete-workspace:${user.id}`
// //     const { success } = await ratelimit.limit(identifier)

// //     if (!success) {
// //       throw new RateLimitError()
// //     }

// //     const [workspace] = await db
// //       .select()
// //       .from(workspaces)
// //       .where(eq(workspaces.slug, validatedSlug))
// //       .limit(1)

// //     if (!workspace) {
// //       throw new NotFoundError("Workspace not found")
// //     }

// //     // 3. Check if user is admin or owner
// //     const canDelete = await hasPermission(user.id, workspace.id, PERMISSIONS.DELETE_WORKSPACE)

// //     if (!canDelete) {
// //       throw new AuthorizationError()
// //     }

// //     await db.delete(workspaces).where(eq(workspaces.slug, validatedSlug))

// //     return {
// //       success: true,
// //       status: 200,
// //       message: "Workspace deleted",
// //       description: "You will be redirected to the home page",
// //     }
// //   } catch (error: any) {
// //     // Re-throw known errors
// //     if (error instanceof ApiError) {
// //       throw error
// //     }
// //     // Handle unexpected errors
// //     throw new DatabaseError("Failed to delete workspace", "An unexpected error occurred")
// //   }
// // }

// // Helper functions
