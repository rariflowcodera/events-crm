// "use server"

// import { getCurrentUser } from "@/server/actions/auth-actions"
// import { db } from "@/server/db/config/database"
// import { NotificationType } from "@/server/db/schema-types"
// import { notifications } from "@/server/db/schemas"
// import {
//   ApiError,
//   AuthenticationError,
//   DatabaseError,
//   NotFoundError,
//   RateLimitError,
//   ValidationError,
// } from "@/server/exceptions/exceptions"
// import { formatZodError } from "@/server/utils/format-zod-error"
// import { Ratelimit } from "@upstash/ratelimit"
// import { eq } from "drizzle-orm"

// import { RATE_LIMIT_1_MINUTE, RATE_LIMIT_5 } from "@/lib/constants"
// import { redis } from "@/lib/redis"
// import { notificationSchema } from "@/lib/schemas"

// const ratelimit = new Ratelimit({
//   redis,
//   limiter: Ratelimit.slidingWindow(RATE_LIMIT_5, RATE_LIMIT_1_MINUTE),
// })

// // export const archiveNotificationAction = async ({
// //   id,
// //   value,
// // }: {
// //   id: NotificationType["id"]
// //   value: NotificationType["archived"]
// // }) => {
// //   try {
// //     const validateId = notificationSchema.pick({ id: true }).safeParse({ id })
// //     const validateValue = notificationSchema.pick({ archived: true }).safeParse({ archived: value })

// //     if (!validateId.success) {
// //       throw new ValidationError(formatZodError(validateId.error))
// //     }

// //     if (!validateValue.success) {
// //       throw new ValidationError(formatZodError(validateValue.error))
// //     }

// //     const { id: notificationId } = validateId.data

// //     const identifier = `ratelimit:archive-notification:${notificationId}`
// //     const { success } = await ratelimit.limit(identifier)

// //     if (!success) {
// //       throw new RateLimitError()
// //     }

// //     const { user } = await getCurrentUser()

// //     if (!user) {
// //       throw new AuthenticationError()
// //     }

// //     const [notification] = await db
// //       .select()
// //       .from(notifications)
// //       .where(eq(notifications.id, notificationId!))

// //     if (!notification) {
// //       throw new NotFoundError("Notification not found")
// //     }

// //     if (notification.userId !== user.id) {
// //       throw new AuthenticationError()
// //     }

// //     await db
// //       .update(notifications)
// //       .set({ read: false, archived: value, updatedAt: new Date() })
// //       .where(eq(notifications.id, notificationId!))

// //     const message = value ? "Notification archived" : "Notification un-archived"

// //     return {
// //       status: 200,
// //       success: true,
// //       message,
// //     }
// //   } catch (error: any) {
// //     if (error instanceof ApiError) {
// //       throw error
// //     }
// //     throw new DatabaseError("Failed to archive notification", "An unexpected error occurred")
// //   }
// // }

// export const archiveAllNotificationsAction = async ({ value }: { value: boolean }) => {
//   try {
//     const { user } = await getCurrentUser()

//     if (!user) {
//       throw new AuthenticationError()
//     }

//     const identifier = `ratelimit:update-all-notifications:${user.id}`
//     const { success } = await ratelimit.limit(identifier)

//     if (!success) {
//       throw new RateLimitError()
//     }

//     await db.update(notifications).set({ archived: value, updatedAt: new Date() }).where(eq(notifications.userId, user.id))

//     return {
//       status: 200,
//       success: true,
//       message: "Notifications updated",
//     }
//   } catch (error: any) {
//     if (error instanceof ApiError) {
//       throw error
//     }

//     throw new DatabaseError("Failed to archive all notifications", "An unexpected error occurred")
//   }
// }

// export const updateNotificationAction = async ({
//   id,
//   status,
// }: {
//   id: NotificationType["id"]
//   status: NotificationType["read"]
// }) => {
//   try {
//     const validateStatus = notificationSchema.pick({ read: true, accepted: true }).safeParse({
//       read: status,
//       accepted: status,
//     })

//     if (!validateStatus.success) {
//       throw new ValidationError(formatZodError(validateStatus.error))
//     }

//     const { read, accepted } = validateStatus.data

//     const { user } = await getCurrentUser()

//     if (!user) {
//       throw new AuthenticationError()
//     }

//     const identifier = `ratelimit:update-notification:${user.id}`
//     const { success } = await ratelimit.limit(identifier)

//     if (!success) {
//       throw new RateLimitError()
//     }

//     const [notification] = await db.select().from(notifications).where(eq(notifications.id, id))

//     if (!notification) {
//       throw new NotFoundError("Notification not found")
//     }

//     if (notification.userId !== user.id) {
//       throw new AuthenticationError()
//     }

//     await db.update(notifications).set({ read, accepted , updatedAt: new Date()}).where(eq(notifications.id, id))

//     return {
//       status: 200,
//       success: true,
//       message: "Notification updated",
//     }
//   } catch (error: any) {
//     if (error instanceof ApiError) {
//       throw error
//     }

//     throw new DatabaseError("Failed to archive all notifications", "An unexpected error occurred")
//   }
// }
