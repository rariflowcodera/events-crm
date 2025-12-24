import { db } from "@/server/db/config/database"
import { events, guestCategories, workspaceMembers } from "@/server/db/schemas"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import { and, asc, eq } from "drizzle-orm"
import { z } from "zod"

export const guestCategoriesRouter = createTRPCRouter({
  // Get categories for an event
  getMany: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      // Check membership
      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, event.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" })
      }

      return db.query.guestCategories.findMany({
        where: eq(guestCategories.eventId, input.eventId),
        orderBy: [asc(guestCategories.sortOrder)],
      })
    }),

  // Get single category
  getOne: protectedProcedure
    .input(z.object({ categoryId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const category = await db.query.guestCategories.findFirst({
        where: eq(guestCategories.id, input.categoryId),
        with: {
          event: true,
        },
      })

      if (!category) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" })
      }

      // Check membership
      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, category.event.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" })
      }

      return category
    }),

  // Create category
  create: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        name: z.string().min(1),
        code: z.string().min(1).max(10),
        description: z.string().optional(),
        color: z.string().optional(),
        sortOrder: z.number().int().optional(),
        serviceAllocations: z
          .object({
            hotelStars: z.number().optional(),
            roomType: z.string().optional(),
            transportType: z.string().optional(),
            airportPickup: z.boolean().optional(),
            flightClass: z.string().optional(),
            flightIncluded: z.boolean().optional(),
            mealType: z.string().optional(),
            accessLevel: z.array(z.string()).optional(),
            giftPackage: z.string().optional(),
            custom: z.record(z.unknown()).optional(),
          })
          .optional(),
        rsvpPageConfig: z
          .object({
            headline: z
              .object({
                en: z.string(),
                ar: z.string().optional(),
              })
              .optional(),
            welcomeMessage: z
              .object({
                en: z.string(),
                ar: z.string().optional(),
              })
              .optional(),
            backgroundImage: z.string().optional(),
            showServiceDetails: z.boolean().optional(),
          })
          .optional(),
        defaultEmailTemplateId: z.string().uuid().nullable().optional(),
        vappAccessCode: z.string().max(10).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.MANAGE_EVENT,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage this event",
        })
      }

      // Check for duplicate code
      const existingCategory = await db.query.guestCategories.findFirst({
        where: and(
          eq(guestCategories.eventId, input.eventId),
          eq(guestCategories.code, input.code.toUpperCase())
        ),
      })

      if (existingCategory) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A category with this code already exists for this event",
        })
      }

      // Get max sort order if not provided
      let sortOrder = input.sortOrder
      if (sortOrder === undefined) {
        const categories = await db.query.guestCategories.findMany({
          where: eq(guestCategories.eventId, input.eventId),
          orderBy: [asc(guestCategories.sortOrder)],
        })
        sortOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sortOrder)) + 1 : 0
      }

      const [category] = await db
        .insert(guestCategories)
        .values({
          eventId: input.eventId,
          name: input.name,
          code: input.code.toUpperCase(),
          description: input.description,
          color: input.color,
          sortOrder,
          serviceAllocations: input.serviceAllocations,
          rsvpPageConfig: input.rsvpPageConfig,
          defaultEmailTemplateId: input.defaultEmailTemplateId,
          vappAccessCode: input.vappAccessCode?.toUpperCase(),
        })
        .returning()

      return category
    }),

  // Update category
  update: protectedProcedure
    .input(
      z.object({
        categoryId: z.string().uuid(),
        name: z.string().min(1).optional(),
        code: z.string().min(1).max(10).optional(),
        description: z.string().nullable().optional(),
        color: z.string().optional(),
        sortOrder: z.number().int().optional(),
        serviceAllocations: z
          .object({
            hotelStars: z.number().optional(),
            roomType: z.string().optional(),
            transportType: z.string().optional(),
            airportPickup: z.boolean().optional(),
            flightClass: z.string().optional(),
            flightIncluded: z.boolean().optional(),
            mealType: z.string().optional(),
            accessLevel: z.array(z.string()).optional(),
            giftPackage: z.string().optional(),
            custom: z.record(z.unknown()).optional(),
          })
          .optional(),
        rsvpPageConfig: z
          .object({
            headline: z
              .object({
                en: z.string(),
                ar: z.string().optional(),
              })
              .optional(),
            welcomeMessage: z
              .object({
                en: z.string(),
                ar: z.string().optional(),
              })
              .optional(),
            backgroundImage: z.string().optional(),
            showServiceDetails: z.boolean().optional(),
          })
          .optional(),
        isActive: z.boolean().optional(),
        defaultEmailTemplateId: z.string().uuid().nullable().optional(),
        vappAccessCode: z.string().max(10).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const category = await db.query.guestCategories.findFirst({
        where: eq(guestCategories.id, input.categoryId),
        with: { event: true },
      })

      if (!category) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: category.event.workspaceId,
        permissionName: PERMISSIONS.MANAGE_EVENT,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage this event",
        })
      }

      // Check for duplicate code if code is being updated
      if (input.code && input.code.toUpperCase() !== category.code) {
        const existingCategory = await db.query.guestCategories.findFirst({
          where: and(
            eq(guestCategories.eventId, category.eventId),
            eq(guestCategories.code, input.code.toUpperCase())
          ),
        })

        if (existingCategory) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A category with this code already exists for this event",
          })
        }
      }

      const { categoryId, ...updateData } = input

      // Transform code and vappAccessCode to uppercase if provided
      const finalUpdateData = {
        ...updateData,
        code: updateData.code?.toUpperCase(),
        vappAccessCode: updateData.vappAccessCode?.toUpperCase(),
        updatedAt: new Date(),
      }

      const [updated] = await db
        .update(guestCategories)
        .set(finalUpdateData)
        .where(eq(guestCategories.id, categoryId))
        .returning()

      return updated
    }),

  // Delete category
  delete: protectedProcedure
    .input(z.object({ categoryId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const category = await db.query.guestCategories.findFirst({
        where: eq(guestCategories.id, input.categoryId),
        with: { event: true },
      })

      if (!category) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: category.event.workspaceId,
        permissionName: PERMISSIONS.MANAGE_EVENT,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage this event",
        })
      }

      // Note: Deleting a category will fail if there are guests assigned to it
      // due to the onDelete: "restrict" constraint. This is intentional.
      try {
        await db.delete(guestCategories).where(eq(guestCategories.id, input.categoryId))
        return { success: true }
      } catch (error) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Cannot delete category with assigned guests. Please reassign or remove guests first.",
        })
      }
    }),

  // Reorder categories
  reorder: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        categoryIds: z.array(z.string().uuid()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.MANAGE_EVENT,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage this event",
        })
      }

      // Update sort order for each category
      await Promise.all(
        input.categoryIds.map((categoryId, index) =>
          db
            .update(guestCategories)
            .set({ sortOrder: index, updatedAt: new Date() })
            .where(eq(guestCategories.id, categoryId))
        )
      )

      return { success: true }
    }),
})
