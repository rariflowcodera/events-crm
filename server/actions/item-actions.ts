// "use server"

// import { getCurrentUser } from "@/server/actions/auth-actions"
// import { db } from "@/server/db/config/database"
// import { ItemType, WorkspaceType } from "@/server/db/schema-types"
// import { items, workspaces } from "@/server/db/schemas"
// import {
//   ApiError,
//   AuthenticationError,
//   DatabaseError,
//   NotFoundError,
//   RateLimitError,
//   ValidationError,
// } from "@/server/exceptions/exceptions"
// import { createNotification } from "@/server/queries/notifications"
// import { formatZodError } from "@/server/utils/format-zod-error"
// import { Ratelimit } from "@upstash/ratelimit"
// import { eq } from "drizzle-orm"
// import { z } from "zod"

// import { RATE_LIMIT_1_MINUTE, RATE_LIMIT_10 } from "@/lib/constants"
// import { redis } from "@/lib/redis"
// import { createItemSchema, itemSchema, slugSchema } from "@/lib/schemas"

// const ratelimit = new Ratelimit({
//   redis,
//   limiter: Ratelimit.slidingWindow(RATE_LIMIT_10, RATE_LIMIT_1_MINUTE),
// })

// // export const createItemAction = async ({
// //   slug,
// //   values,
// // }: {
// //   slug: WorkspaceType["slug"]
// //   values: z.infer<typeof createItemSchema>
// // }) => {
// //   try {
// //     const validateValues = createItemSchema.safeParse(values)
// //     const validateSlug = slugSchema.safeParse(slug)

// //     if (!validateValues.success) {
// //       throw new ValidationError(formatZodError(validateValues.error))
// //     }

// //     if (!validateSlug.success) {
// //       throw new ValidationError(formatZodError(validateSlug.error))
// //     }

// //     const { name, description, dueDate, tags, status } = validateValues.data
// //     const validatedSlug = validateSlug.data

// //     const { user } = await getCurrentUser()

// //     if (!user) {
// //       throw new AuthenticationError()
// //     }

// //     const identifier = `ratelimit:create-item:${user.id}`
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

// //     const [newItem] = await db
// //       .insert(items)
// //       .values({
// //         name,
// //         description,
// //         userId: user.id,
// //         workspaceId: workspace.id,
// //         dueDate,
// //         tags,
// //         status,
// //       })
// //       .returning({
// //         id: items.id,
// //       })

// //     if (newItem) {
// //       await createNotification({
// //         values: {
// //           title: "Item has been created",
// //           message: `${name} has been created`,
// //           userId: user.id,
// //           link: `/${slug}/items/${newItem.id}`,
// //           expiresAt: null,
// //           type: "item",
// //           identifier: newItem.id,
// //           accepted: false,
// //         },
// //       })
// //     }

// //     return {
// //       status: 200,
// //       success: true,
// //       message: "Item created successfully",
// //     }
// //   } catch (error: any) {
// //     if (error instanceof ApiError) {
// //       throw error
// //     }

// //     throw new DatabaseError("Failed to create item", "An unexpected error occurred")
// //   }
// // }

// // export const deleteItemAction = async ({ id }: { id: ItemType["id"] }) => {
// //   try {
// //     const validateId = itemSchema.pick({ id: true }).safeParse({ id })

// //     if (!validateId.success) {
// //       throw new ValidationError(formatZodError(validateId.error))
// //     }
// //     const validatedId = validateId.data

// //     if (!validatedId.id) {
// //       throw new ValidationError("Invalid item id")
// //     }

// //     const { user } = await getCurrentUser()

// //     if (!user) {
// //       throw new AuthenticationError()
// //     }

// //     const identifier = `ratelimit:delete-item:${user.id}`
// //     const { success } = await ratelimit.limit(identifier)

// //     if (!success) {
// //       throw new RateLimitError()
// //     }

// //     const [item] = await db.select().from(items).where(eq(items.id, id)).limit(1)

// //     if (!item) {
// //       throw new NotFoundError("Item not found")
// //     }

// //     await db.delete(items).where(eq(items.id, validatedId.id))

// //     return {
// //       status: 200,
// //       success: true,
// //       message: "Item deleted successfully",
// //     }
// //   } catch (error: any) {
// //     if (error instanceof ApiError) {
// //       throw error
// //     }

// //     throw new DatabaseError("Failed to create item", "An unexpected error occurred")
// //   }
// // }

// // export const duplicateItemAction = async ({ id }: { id: ItemType["id"] }) => {
// //   try {
// //     const validateId = itemSchema.pick({ id: true }).safeParse({ id })

// //     if (!validateId.success) {
// //       throw new ValidationError(formatZodError(validateId.error))
// //     }

// //     const { id: validatedId } = validateId.data

// //     if (!validatedId) {
// //       throw new ValidationError("Invalid item id")
// //     }

// //     const { user } = await getCurrentUser()

// //     if (!user) {
// //       throw new AuthenticationError()
// //     }

// //     const identifier = `ratelimit:duplicate-item:${user.id}`
// //     const { success } = await ratelimit.limit(identifier)

// //     if (!success) {
// //       throw new RateLimitError()
// //     }

// //     const [item] = await db.select().from(items).where(eq(items.id, validatedId)).limit(1)

// //     if (!item) {
// //       throw new NotFoundError("Item not found")
// //     }

// //     await db.insert(items).values({
// //       name: item.name,
// //       description: item.description,
// //       dueDate: item.dueDate,
// //       userId: user.id,
// //       workspaceId: item.workspaceId,
// //       tags: item.tags,
// //       status: item.status,
// //     })

// //     return {
// //       status: 200,
// //       success: true,
// //       message: "Item duplicated successfully",
// //     }
// //   } catch (error: any) {
// //     if (error instanceof ApiError) {
// //       throw error
// //     }

// //     throw new DatabaseError("Failed to create item", "An unexpected error occurred")
// //   }
// // }
