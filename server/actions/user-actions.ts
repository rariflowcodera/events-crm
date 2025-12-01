// "use server"

// import { cookies } from "next/headers"
// import { getCurrentUser } from "@/server/actions/auth-actions"
// // import { generateUniqueToken } from "@/server/actions/invitation-actions"
// import { db, dbClient } from "@/server/db/config/database"
// import { UserType } from "@/server/db/schema-types"
// import {
//   emailVerifications,
//   subscriptions,
//   userNotificationSettings,
//   users,
//   userSettings,
//   workspaces,
// } from "@/server/db/schemas"
// import {
//   ApiError,
//   AuthenticationError,
//   AuthorizationError,
//   ConflictError,
//   DatabaseError,
//   RateLimitError,
//   ServerError,
//   ValidationError,
// } from "@/server/exceptions/exceptions"
// import { formatZodError } from "@/server/utils/format-zod-error"
// import { Ratelimit } from "@upstash/ratelimit"
// import { and, eq } from "drizzle-orm"
// import { z } from "zod"

// import { configuration } from "@/lib/config"
// import { RATE_LIMIT_1_MINUTE, RATE_LIMIT_5 } from "@/lib/constants"
// import { generateUniqueToken } from "@/lib/invitation"
// import { redis } from "@/lib/redis"
// import { resend } from "@/lib/resend"
// import { userSchema } from "@/lib/schemas"
// import { EmailVerificationMail } from "@/components/profile/email-verification-mail"

// const ratelimit = new Ratelimit({
//   redis,
//   limiter: Ratelimit.slidingWindow(RATE_LIMIT_5, RATE_LIMIT_1_MINUTE),
// })

// // export const createUserAction = async ({
// //   values,
// //   isFromInvitation,
// // }: {
// //   values: z.infer<typeof userSchema>
// //   isFromInvitation?: boolean
// // }) => {
// //   try {
// //     // 1. Validate input
// //     const validateValues = userSchema.safeParse(values)
// //     if (!validateValues.success) {
// //       throw new ValidationError(formatZodError(validateValues.error))
// //     }

// //     const { email, name, id, image, lastName } = validateValues.data

// //     // 2. Check authentication
// //     const { user } = await getCurrentUser()
// //     if (!user) {
// //       throw new AuthenticationError()
// //     }

// //     const userId = user.id

// //     // 3. Check rate limit
// //     const identifier = `ratelimit:create-user:${userId}`
// //     const { success } = await ratelimit.limit(identifier)
// //     if (!success) {
// //       throw new RateLimitError()
// //     }

// //     if (!id) {
// //       throw new ValidationError("User ID is required")
// //     }

// //     // 4. Verify authorization
// //     if (id !== userId || email !== user.email) {
// //       throw new AuthorizationError()
// //     }

// //     // Start transaction
// //     return await dbClient.transaction(async (tx) => {
// //       // 1. Update user profile
// //       await tx
// //         .update(users)
// //         .set({
// //           name,
// //           image,
// //           lastName,
// //           updatedAt: new Date(),
// //         })
// //         .where(and(eq(users.id, userId), eq(users.email, email)))

// //       // 2. Get or create user settings

// //       let currentSettings = await tx
// //         .select()
// //         .from(userSettings)
// //         .where(eq(userSettings.userId, userId))
// //         .limit(1)
// //         .then((results) => results[0])

// //       if (!currentSettings) {
// //         ;[currentSettings] = await tx
// //           .insert(userSettings)
// //           .values({
// //             userId,
// //             onboardingStatus: isFromInvitation ? "completed" : "in_progress",
// //             onboardingCompletedAt: isFromInvitation ? new Date() : null,
// //             onboardingStep: isFromInvitation ? "collaborate" : "workspace",
// //           })
// //           .returning()
// //       }

// //       // 3. Handle parallel inserts/updates
// //       await Promise.all([
// //         // Upsert subscription
// //         tx
// //           .insert(subscriptions)
// //           .values({
// //             userId,
// //             currentPeriodStart: new Date(),
// //             planType: "FREE",
// //             status: "active",
// //           })
// //           .onConflictDoNothing(),

// //         // Upsert notification settings
// //         tx
// //           .insert(userNotificationSettings)
// //           .values({
// //             updateEmails: true,
// //             userSettingsId: currentSettings.id!,
// //             subscriptionEmails: true,
// //             userId: userId,
// //           })
// //           .onConflictDoNothing(),

// //         // Update onboarding status if needed
// //         currentSettings.onboardingStatus === "in_progress" &&
// //           tx
// //             .update(userSettings)
// //             .set({
// //               onboardingStatus: isFromInvitation ? "completed" : "in_progress",
// //               onboardingCompletedAt: isFromInvitation ? new Date() : null,
// //               onboardingStep: isFromInvitation ? "collaborate" : "workspace",
// //               updatedAt: new Date(),
// //             })
// //             .where(eq(userSettings.userId, userId)),
// //       ])
// //       // 4. Get workspace status
// //       const [workspace] = await tx
// //         .select()
// //         .from(workspaces)
// //         .where(eq(workspaces.ownerId, id))
// //         .limit(1)

// //       return {
// //         status: 200,
// //         success: true,
// //         hasWorkspace: !!workspace,
// //         message: "Profile created successfully",
// //         description: "Please wait until you get redirected...",
// //       }
// //     })
// //   } catch (error: any) {
// //     if (error instanceof ApiError) {
// //       throw error
// //     }
// //     throw new DatabaseError("Failed to create workspace", "An unexpected error occurred")
// //   }
// // }

// // export const updateUserAction = async ({ values }: { values: z.infer<typeof userSchema> }) => {
// //   try {
// //     const validatedValues = userSchema
// //       .pick({
// //         name: true,
// //         email: true,
// //         image: true,
// //         id: true,
// //       })
// //       .safeParse({
// //         name: values.name,
// //         email: values.email,
// //         image: values.image,
// //         id: values.id,
// //       })

// //     if (!validatedValues.success) {
// //       throw new ValidationError(formatZodError(validatedValues.error))
// //     }

// //     const { name, id, image } = validatedValues.data

// //     if (!id) {
// //       throw new ValidationError("Invalid user ID")
// //     }

// //     const { user } = await getCurrentUser()

// //     if (!user) {
// //       throw new AuthenticationError()
// //     }
// //     const identifier = `ratelimit:update-profile:${user.id}`
// //     const { success } = await ratelimit.limit(identifier)

// //     if (!success) {
// //       throw new RateLimitError()
// //     }

// //     if (user.id !== id) {
// //       throw new AuthenticationError()
// //     }

// //     await db.update(users).set({ name, image, updatedAt: new Date() }).where(eq(users.id, id))

// //     return { status: 200, success: true, message: "Profile updated" }
// //   } catch (error: any) {
// //     // Re-throw known errors
// //     if (error instanceof ApiError) {
// //       throw error
// //     }
// //     // Handle unexpected errors
// //     throw new DatabaseError("Failed to update profile", "An unexpected error occurred")
// //   }
// // }

// // export async function deleteUserAction({ userId }: { userId: UserType["id"] }) {
// //   try {
// //     // 1. Validate input
// //     const validateValues = userSchema.pick({ id: true }).safeParse({ id: userId })
// //     if (!validateValues.success) {
// //       throw new ValidationError(formatZodError(validateValues.error))
// //     }

// //     const { id: validatedUserId } = validateValues.data

// //     if (!validatedUserId) {
// //       throw new ValidationError("User ID is required")
// //     }

// //     // 2. Check authentication
// //     const { user } = await getCurrentUser()
// //     if (!user) {
// //       throw new AuthenticationError()
// //     }

// //     // 3. Check rate limit
// //     const identifier = `ratelimit:delete-profile:${validatedUserId}`
// //     const { success } = await ratelimit.limit(identifier)
// //     if (!success) {
// //       throw new RateLimitError()
// //     }

// //     // 4. Verify authorization
// //     if (user.id !== validatedUserId) {
// //       throw new AuthorizationError()
// //     }

// //     await db.delete(users).where(eq(users.id, validatedUserId))

// //     // 6. Clear all auth-related cookies
// //     const cookieStore = await cookies()
// //     const authCookies = [
// //       "next-auth.session-token",
// //       "next-auth.csrf-token",
// //       "__Secure-next-auth.session-token",
// //       "__Host-next-auth.csrf-token",
// //     ]

// //     authCookies.forEach((name) => {
// //       cookieStore.delete(name)
// //     })

// //     // 7. Redirect to sign in page
// //     return {
// //       success: true,
// //       status: 200,
// //     }
// //   } catch (error: any) {
// //     if (error instanceof ApiError) {
// //       throw error
// //     }
// //     throw new DatabaseError("Failed to delete user", "An unexpected error occurred")
// //   }
// // }

// export const initialEmailChangeAction = async ({ email }: { email: string }) => {
//   try {
//     // 1. Validate input
//     const validateValues = userSchema.pick({ email: true }).safeParse({ email })

//     if (!validateValues.success) {
//       throw new ValidationError(formatZodError(validateValues.error))
//     }

//     const { email: validatedNewEmail } = validateValues.data

//     if (!validatedNewEmail) {
//       throw new ValidationError("Invalid email")
//     }

//     // 2. Check authentication
//     const { user } = await getCurrentUser()

//     if (!user) {
//       throw new AuthenticationError()
//     }

//     if (user.email === validatedNewEmail) {
//       throw new ConflictError("Email is the same as the current email")
//     }

//     await dbClient.transaction(async (trx) => {
//       // Check if the new email is already in use
//       const [existingUser] = await trx
//         .select()
//         .from(users)
//         .where(eq(users.email, validatedNewEmail))
//         .limit(1)

//       if (existingUser) {
//         throw new ConflictError("Email is already in use")
//       }

//       const token = await generateUniqueToken()
//       const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours

//       if (!token) {
//         throw new ServerError("Error generating token")
//       }

//       await db.insert(emailVerifications).values({
//         userId: user.id,
//         token,
//         newEmail: validatedNewEmail,
//         expiresAt,
//       })

//       const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email/${token}`

//       const result = await resend.emails.send({
//         from: configuration.resend.email,
//         to: validatedNewEmail,
//         subject: `Verify your email | ${configuration.site.name}`,
//         react: EmailVerificationMail({
//           email: validatedNewEmail,
//           verificationUrl,
//         }),
//       })

//       if (result.error) {
//         throw new ServerError("Error sending email")
//       }
//     })

//     return {
//       success: true,
//       status: 200,
//       message: `Email verification sent to ${validatedNewEmail}`,
//     }
//   } catch (error: any) {
//     if (error instanceof ApiError) {
//       throw error
//     }
//     throw new DatabaseError("Failed to update profile", "An unexpected error occurred")
//   }
// }
