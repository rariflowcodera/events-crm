// "use server"

// import { getCurrentUser } from "@/server/actions/auth-actions"
// // import { getWorkspaceSubscriptionBySlug } from "@/server/actions/subscription-actions"
// import { db, dbClient } from "@/server/db/config/database"
// import { InvitationType } from "@/server/db/schema-types"
// import {
//   invitations,
//   notifications,
//   users,
//   workspaceMembers,
//   workspaces,
// } from "@/server/db/schemas"
// import {
//   ApiError,
//   AuthenticationError,
//   AuthorizationError,
//   ConflictError,
//   DatabaseError,
//   NotFoundError,
//   RateLimitError,
//   ServerError,
//   ValidationError,
// } from "@/server/exceptions/exceptions"
// // import { createNotification } from "@/server/queries/notifications"
// // import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
// import { formatZodError } from "@/server/utils/format-zod-error"
// import { Ratelimit } from "@upstash/ratelimit"
// import { and, eq } from "drizzle-orm"
// import { v4 as uuidv4 } from "uuid"

// // import { z } from "zod"

// // import { RoleTypesType } from "@/types/types"
// // import { configuration } from "@/lib/config"
// import { RATE_LIMIT_1_MINUTE, RATE_LIMIT_5 } from "@/lib/constants"
// import { redis } from "@/lib/redis"
// // import { resend } from "@/lib/resend"
// import { bulkInvitationSchema, invitationSchema } from "@/lib/schemas"

// // import { capitalizeFirstLetter } from "@/lib/utils"
// // import { InvitationMail } from "@/components/invitation/invitation-mail"

// const ratelimit = new Ratelimit({
//   redis,
//   limiter: Ratelimit.slidingWindow(RATE_LIMIT_5, RATE_LIMIT_1_MINUTE),
// })

// // export const createInvitationAction = async ({
// //   values,
// // }: {
// //   values: z.infer<typeof invitationSchema>
// // }) => {
// //   try {
// //     const validateValues = invitationSchema
// //       .pick({
// //         email: true,
// //         role: true,
// //         workspaceId: true,
// //         invitedBy: true,
// //         invitedByProfileImage: true,
// //       })
// //       .safeParse(values)

// //     if (!validateValues.success) {
// //       throw new ValidationError(formatZodError(validateValues.error))
// //     }
// //     const { email, role, workspaceId, invitedBy, invitedByProfileImage } = validateValues.data

// //     const { user } = await getCurrentUser()

// //     if (!user) {
// //       throw new AuthenticationError()
// //     }

// //     const identifier = `ratelimit:create-invite:${email}`
// //     const { success } = await ratelimit.limit(identifier)

// //     if (!success) {
// //       throw new RateLimitError()
// //     }

// //     // Start transaction
// //     await dbClient.transaction(async (trx) => {
// //       // 4. Get workspace from database
// //       const [workspace] = await trx
// //         .select()
// //         .from(workspaces)
// //         .where(eq(workspaces.id, workspaceId))
// //         .limit(1)

// //       if (!workspace) {
// //         throw new NotFoundError("Workspace not found")
// //       }

// //       const members = await trx
// //         .select()
// //         .from(workspaceMembers)
// //         .leftJoin(users, eq(workspaceMembers.userId, users.id))
// //         .where(eq(workspaceMembers.workspaceId, workspaceId))

// //       const { plan } = await getWorkspaceSubscriptionBySlug(workspace.slug)

// //       if (!plan) {
// //         throw new NotFoundError("Subscription not found")
// //       }

// //       const { membersQuota, type } = plan

// //       if (members.length >= membersQuota!) {
// //         throw new ConflictError(
// //           `You have reached the maximum number of members for ${capitalizeFirstLetter(type!)} plan`
// //         )
// //       }

// //       // Check if user has permission to invite members
// //       const canInviteMembers = await hasPermission(
// //         user.id,
// //         workspace.id,
// //         PERMISSIONS.INVITE_MEMBERS
// //       )

// //       if (!canInviteMembers) {
// //         throw new AuthorizationError(
// //           "You don't have permission to invite members to this workspace"
// //         )
// //       }

// //       // Check if member already exists by email
// //       const existingMember = members.find((member) => member.user?.email === email)

// //       if (existingMember) {
// //         throw new ConflictError("User is already a member of this workspace")
// //       }

// //       // 5. Check if the invited user exists in the database
// //       const [invitedUserExist] = await trx
// //         .select()
// //         .from(users)
// //         .where(eq(users.email, email))
// //         .limit(1)

// //       if (invitedUserExist) {
// //         // 6. Check if the user is already a member
// //         const [existingMember] = await trx
// //           .select()
// //           .from(workspaceMembers)
// //           .where(
// //             and(
// //               eq(workspaceMembers.userId, invitedUserExist.id),
// //               eq(workspaceMembers.workspaceId, workspace.id)
// //             )
// //           )

// //         if (existingMember) {
// //           throw new ConflictError("User is already a member of this workspace")
// //         }
// //       }

// //       // 7. Check if the invitation exists
// //       const [invitation] = await trx
// //         .select()
// //         .from(invitations)
// //         .where(
// //           and(
// //             eq(invitations.email, email),
// //             eq(invitations.workspaceId, workspace.id),
// //             eq(invitations.expired, false)
// //           )
// //         )

// //       if (invitation) {
// //         throw new ConflictError("Invitation already exists")
// //       }

// //       // 9. Create the token
// //       const token = await generateUniqueToken()
// //       const expiresAt = new Date()
// //       expiresAt.setHours(expiresAt.getHours() + 24)

// //       if (!token) {
// //         throw new ServerError("Error generating token")
// //       }

// //       // 10. Create the invitation
// //       const invitationUrl = `${process.env.NEXTAUTH_URL}/invite/${token}?from=invitation`

// //       const [createdInvitation] = await trx
// //         .insert(invitations)
// //         .values({
// //           email,
// //           workspaceId: workspace.id!,
// //           role: role as RoleTypesType,
// //           token,
// //           invitedBy,
// //           invitedByProfileImage: invitedByProfileImage ?? "",
// //           expiresAt,
// //         })
// //         .returning({ id: invitations.id })

// //       // 11. Send the invitation email
// //       const result = await resend.emails.send({
// //         from: configuration.resend.email,
// //         to: email,
// //         subject: `Invitation to join the ${workspace.name} workspace | ${configuration.site.name}`,
// //         react: InvitationMail({
// //           email: email,
// //           workspaceName: workspace.name,
// //           logo: workspace.logo,
// //           invitedBy: user.name,
// //           invitedByImage: user.image ?? "",
// //           inviteString: invitationUrl,
// //         }),
// //       })

// //       // opt: 12. Notify user if an user exists
// //       if (invitedUserExist) {
// //         await db.insert(notifications).values({
// //           title: "Workspace Invitation",
// //           message: `You have been invited to join ${workspace.name}`,
// //           userId: invitedUserExist.id,
// //           link: invitationUrl,
// //           expiresAt: expiresAt,
// //           type: "invitation",
// //           identifier: createdInvitation.id,
// //           accepted: false,
// //         })
// //       }
// //       if (result.error) {
// //         throw new ServerError()
// //       }
// //     })

// //     return {
// //       status: 200,
// //       success: true,
// //       message: "Invitation sent successfully",
// //       description: "Please check email for the invitation link",
// //     }
// //   } catch (error: any) {
// //     if (error instanceof ApiError) {
// //       throw error
// //     }

// //     throw new DatabaseError("Failed to create invitation", "An unexpected error occurred")
// //   }
// // }

// // export const deleteInvitationAction = async ({
// //   email,
// //   workspaceId,
// // }: {
// //   email: InvitationType["email"]
// //   workspaceId: InvitationType["workspaceId"]
// // }) => {
// //   try {
// //     const validateValues = invitationSchema
// //       .pick({ email: true, workspaceId: true })
// //       .safeParse({ email, workspaceId })

// //     if (!validateValues.success) {
// //       throw new Error(validateValues.error.message)
// //     }

// //     const { email: validatedEmail, workspaceId: validatedWorkspaceId } = validateValues.data

// //     // 1. Get current session
// //     const { user } = await getCurrentUser()
// //     if (!user) {
// //       throw new AuthenticationError()
// //     }

// //     if (user.email === validatedEmail) {
// //       throw new ConflictError("You cannot delete yourself")
// //     }

// //     if (!validatedEmail) {
// //       throw new ValidationError("Invalid email")
// //     }

// //     const identifier = `ratelimit:delete-invitation:${validatedEmail}`
// //     const { success } = await ratelimit.limit(identifier)

// //     if (!success) {
// //       throw new RateLimitError()
// //     }

// //     // Start transaction
// //     await dbClient.transaction(async (trx) => {
// //       // 2. Get the workspace
// //       const [workspace] = await trx
// //         .select()
// //         .from(workspaces)
// //         .where(eq(workspaces.id, validatedWorkspaceId))
// //         .limit(1)

// //       if (!workspace) {
// //         throw new NotFoundError("Workspace not found")
// //       }

// //       // 3. Get the invitation object
// //       const [invitation] = await trx
// //         .select()
// //         .from(invitations)
// //         .where(
// //           and(
// //             eq(invitations.workspaceId, validatedWorkspaceId),
// //             eq(invitations.email, validatedEmail)
// //           )
// //         )
// //         .limit(1)

// //       if (!invitation) {
// //         throw new NotFoundError("Invitation not found")
// //       }

// //       // 4. Delete the invitation object
// //       await trx.delete(invitations).where(eq(invitations.id, invitation.id))

// //       // Delete user notification
// //       const [notification] = await trx
// //         .select()
// //         .from(notifications)
// //         .where(eq(notifications.identifier, invitation.id))
// //         .limit(1)

// //       if (notification) {
// //         await trx.delete(notifications).where(eq(notifications.identifier, invitation.id))
// //       }
// //     })

// //     return {
// //       status: 200,
// //       success: true,
// //       message: "Invitation deleted",
// //     }
// //   } catch (error: any) {
// //     // Re-throw known errors
// //     if (error instanceof ApiError) {
// //       throw error
// //     }
// //     // Handle unexpected errors
// //     throw new DatabaseError("Failed to delete invitation", "An unexpected error occurred")
// //   }
// // }

// export const deleteInvitationByIdAction = async ({ id }: { id: InvitationType["id"] }) => {
//   try {
//     const validateId = invitationSchema.pick({ id: true }).safeParse({ id })

//     if (!validateId.success) {
//       throw new ValidationError(formatZodError(validateId.error))
//     }

//     const { id: validatedId } = validateId.data

//     if (!validatedId) {
//       throw new ValidationError("Invalid invitation id")
//     }

//     const { user } = await getCurrentUser()

//     if (!user) {
//       throw new AuthenticationError()
//     }

//     const identifier = `ratelimit:update-invitation:${user.id}`
//     const { success } = await ratelimit.limit(identifier)

//     if (!success) {
//       throw new RateLimitError()
//     }

//     const [invitation] = await db.select().from(invitations).where(eq(invitations.id, id)).limit(1)

//     if (!invitation) {
//       throw new NotFoundError("Invitation not found")
//     }

//     await db.delete(invitations).where(eq(invitations.id, validatedId))

//     return {
//       status: 200,
//       success: true,
//       message: "Invitation updated",
//     }
//   } catch (error: any) {
//     // Re-throw known errors
//     if (error instanceof ApiError) {
//       throw error
//     }
//     // Handle unexpected errors
//     throw new DatabaseError("Failed to delete invitation", "An unexpected error occurred")
//   }
// }

// // export const createBulkInvitationsAction = async ({ values }: { values: string[] }) => {
// //   try {
// //     const validateEmails = bulkInvitationSchema.safeParse({ emails: values })

// //     if (!validateEmails.success) {
// //       throw new ValidationError(formatZodError(validateEmails.error))
// //     }

// //     const { emails } = validateEmails.data

// //     const { user } = await getCurrentUser()

// //     if (!user) {
// //       throw new AuthenticationError()
// //     }

// //     const identifier = `ratelimit:create-bulk-invitations:${user.id}`
// //     const { success } = await ratelimit.limit(identifier)

// //     if (!success) {
// //       throw new RateLimitError()
// //     }

// //     // Start transaction
// //     await dbClient.transaction(async (trx) => {
// //       const [workspace] = await trx
// //         .select()
// //         .from(workspaces)
// //         .where(eq(workspaces.ownerId, user.id))
// //         .limit(1)

// //       if (!workspace) {
// //         throw new NotFoundError("Workspace not found")
// //       }

// //       const { plan } = await getWorkspaceSubscriptionBySlug(workspace.slug)

// //       if (!plan) {
// //         throw new NotFoundError("Subscription not found")
// //       }

// //       const { membersQuota, type } = plan

// //       const members = await trx
// //         .select()
// //         .from(workspaceMembers)
// //         .leftJoin(users, eq(workspaceMembers.userId, users.id))
// //         .where(eq(workspaceMembers.workspaceId, workspace.id))

// //       if (members.length >= membersQuota!) {
// //         throw new ConflictError(
// //           `You have reached the maximum number of members for ${capitalizeFirstLetter(type!)} plan`
// //         )
// //       }

// //       // Check if user has permission to invite members
// //       const canInviteMembers = await hasPermission(
// //         user.id,
// //         workspace.id,
// //         PERMISSIONS.INVITE_MEMBERS
// //       )

// //       if (!canInviteMembers) {
// //         throw new AuthorizationError(
// //           "You don't have permission to invite members to this workspace"
// //         )
// //       }

// //       // Check if member already exists by email
// //       const existingMember = emails.some((email) =>
// //         members.some((member) => member.user?.email === email)
// //       )

// //       if (existingMember) {
// //         throw new ConflictError("User is already a member of this workspace")
// //       }

// //       for (const email of emails) {
// //         // 5. Check if the invited user exists in the database
// //         const [invitedUserExist] = await trx
// //           .select()
// //           .from(users)
// //           .where(eq(users.email, email))
// //           .limit(1)

// //         if (invitedUserExist) {
// //           // 6. Check if the user is already a member
// //           const [existingMember] = await trx
// //             .select()
// //             .from(workspaceMembers)
// //             .where(
// //               and(
// //                 eq(workspaceMembers.userId, invitedUserExist.id),
// //                 eq(workspaceMembers.workspaceId, workspace.id)
// //               )
// //             )

// //           if (existingMember) {
// //             throw new ConflictError("User is already a member of this workspace")
// //           }
// //         }

// //         // 7. Check if the invitation exists
// //         const [invitation] = await trx
// //           .select()
// //           .from(invitations)
// //           .where(
// //             and(
// //               eq(invitations.email, email),
// //               eq(invitations.workspaceId, workspace.id),
// //               eq(invitations.expired, false)
// //             )
// //           )

// //         if (invitation) {
// //           throw new ConflictError("Invitation already exists")
// //         }

// //         // 9. Create the token
// //         const token = await generateUniqueToken()
// //         const expiresAt = new Date()
// //         expiresAt.setHours(expiresAt.getHours() + 24)

// //         if (!token) {
// //           throw new ServerError("Error generating token")
// //         }

// //         // 10. Create the invitation
// //         const invitationUrl = `${process.env.NEXTAUTH_URL}/invite/${token}?from=invitation`

// //         const [createdInvitation] = await trx
// //           .insert(invitations)
// //           .values({
// //             email,
// //             workspaceId: workspace.id!,
// //             role: "member",
// //             token,
// //             invitedBy: user.name,
// //             invitedByProfileImage: user.image ?? "",
// //             expiresAt,
// //           })
// //           .returning({ id: invitations.id })

// //         // 11. Send the invitation email
// //         const result = await resend.emails.send({
// //           from: configuration.resend.email,
// //           to: email,
// //           subject: `Invitation to join the ${workspace.name} workspace | ${configuration.site.name}`,
// //           react: InvitationMail({
// //             email: email,
// //             workspaceName: workspace.name,
// //             logo: workspace.logo,
// //             invitedBy: user.name,
// //             invitedByImage: user.image ?? "",
// //             inviteString: invitationUrl,
// //           }),
// //         })

// //         // opt: 12. Notify user if an user exists
// //         if (invitedUserExist && result.data) {
// //           await createNotification({
// //             values: {
// //               title: "Workspace Invitation",
// //               message: `You have been invited to join ${workspace.name}`,
// //               userId: invitedUserExist.id,
// //               link: invitationUrl,
// //               expiresAt: expiresAt,
// //               type: "invitation",
// //               identifier: createdInvitation.id,
// //               accepted: false,
// //             },
// //           })
// //         }
// //         if (result.error) {
// //           throw new ServerError("Error sending email")
// //         }
// //       }
// //     })

// //     return {
// //       status: 200,
// //       success: true,
// //       message: "Invitations created",
// //     }
// //   } catch (error: any) {
// //     if (error instanceof ApiError) {
// //       throw error
// //     }
// //     throw new DatabaseError("Failed to delete invitation", "An unexpected error occurred")
// //   }
// // }

// // Helper functions

// export async function generateUniqueToken() {
//   let token
//   let tokenExists = true

//   while (tokenExists) {
//     token = uuidv4()
//     const existingToken = await db.query.invitations.findFirst({
//       where: eq(invitations.token, token),
//     })
//     tokenExists = !!existingToken
//   }

//   return token
// }
