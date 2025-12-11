import { db } from "@/server/db/config/database"
import {
  events,
  guests,
  guestCategories,
  workspaceMembers,
  rsvpResponses,
} from "@/server/db/schemas"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import { and, desc, eq, ilike, or, sql } from "drizzle-orm"
import { z } from "zod"

const guestStatusValues = [
  "pending",
  "invited",
  "reminded",
  "viewed",
  "confirmed",
  "declined",
  "maybe",
  "waitlisted",
  "cancelled",
  "attended",
  "no_show",
] as const

export const guestsRouter = createTRPCRouter({
  // Get guests for an event with pagination and filters
  getMany: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        status: z.enum(guestStatusValues).optional(),
        categoryId: z.string().uuid().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      // Check permission
      const canView = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.VIEW_GUESTS,
      })

      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view guests",
        })
      }

      // Build query conditions
      const conditions = [eq(guests.eventId, input.eventId)]

      if (input.status) {
        conditions.push(eq(guests.status, input.status))
      }

      if (input.categoryId) {
        conditions.push(eq(guests.categoryId, input.categoryId))
      }

      if (input.search) {
        const searchTerm = `%${input.search}%`
        conditions.push(
          or(
            ilike(guests.firstName, searchTerm),
            ilike(guests.lastName, searchTerm),
            ilike(guests.email, searchTerm),
            ilike(guests.entity, searchTerm),
            ilike(guests.position, searchTerm)
          )!
        )
      }

      const guestList = await db.query.guests.findMany({
        where: and(...conditions),
        with: {
          category: {
            columns: { id: true, name: true, code: true, color: true },
          },
        },
        orderBy: [desc(guests.createdAt)],
        limit: input.limit,
        offset: input.offset,
      })

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(guests)
        .where(and(...conditions))

      return {
        guests: guestList,
        total: count,
        hasMore: input.offset + guestList.length < count,
      }
    }),

  // Get single guest with full details
  getOne: protectedProcedure
    .input(z.object({ guestId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const guest = await db.query.guests.findFirst({
        where: eq(guests.id, input.guestId),
        with: {
          category: true,
          event: true,
        },
      })

      if (!guest) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Guest not found" })
      }

      const canView = await hasPermission({
        userId: ctx.user.id,
        workspaceId: guest.event.workspaceId,
        permissionName: PERMISSIONS.VIEW_GUESTS,
      })

      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view guests",
        })
      }

      // Get latest RSVP response
      const latestResponse = await db.query.rsvpResponses.findFirst({
        where: eq(rsvpResponses.guestId, guest.id),
        orderBy: [desc(rsvpResponses.submittedAt)],
      })

      return {
        ...guest,
        latestRsvpResponse: latestResponse,
      }
    }),

  // Create single guest
  create: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        categoryId: z.string().uuid(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        whatsapp: z.string().optional(),
        title: z.string().optional(),
        salutation: z.string().optional(),
        preferredName: z.string().optional(),
        position: z.string().optional(),
        entity: z.string().optional(),
        department: z.string().optional(),
        dietaryRequirements: z.string().optional(),
        accessibilityNeeds: z.string().optional(),
        internalNotes: z.string().optional(),
        tags: z.array(z.string()).optional(),
        customFields: z.record(z.unknown()).optional(),
        externalId: z.string().optional(),
        country: z.string().optional(),
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
        permissionName: PERMISSIONS.MANAGE_GUESTS,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage guests",
        })
      }

      // Verify category exists and belongs to this event
      const category = await db.query.guestCategories.findFirst({
        where: and(
          eq(guestCategories.id, input.categoryId),
          eq(guestCategories.eventId, input.eventId)
        ),
      })

      if (!category) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid category for this event",
        })
      }

      // Generate unique RSVP token
      const rsvpToken = crypto.randomUUID()

      const [guest] = await db
        .insert(guests)
        .values({
          ...input,
          rsvpToken,
          rsvpTokenExpiresAt: event.rsvpDeadline,
        })
        .returning()

      return guest
    }),

  // Update guest
  update: protectedProcedure
    .input(
      z.object({
        guestId: z.string().uuid(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().nullable().optional(),
        phone: z.string().nullable().optional(),
        whatsapp: z.string().nullable().optional(),
        title: z.string().nullable().optional(),
        salutation: z.string().nullable().optional(),
        preferredName: z.string().nullable().optional(),
        position: z.string().nullable().optional(),
        entity: z.string().nullable().optional(),
        department: z.string().nullable().optional(),
        categoryId: z.string().uuid().optional(),
        status: z.enum(guestStatusValues).optional(),
        dietaryRequirements: z.string().nullable().optional(),
        accessibilityNeeds: z.string().nullable().optional(),
        internalNotes: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
        customFields: z.record(z.unknown()).optional(),
        hasCompanion: z.boolean().optional(),
        companionDetails: z
          .object({
            name: z.string().optional(),
            email: z.string().optional(),
            phone: z.string().optional(),
            dietaryRequirements: z.string().optional(),
          })
          .nullable()
          .optional(),
        country: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const guest = await db.query.guests.findFirst({
        where: eq(guests.id, input.guestId),
        with: { event: true },
      })

      if (!guest) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Guest not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: guest.event.workspaceId,
        permissionName: PERMISSIONS.MANAGE_GUESTS,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage guests",
        })
      }

      // If changing category, verify it belongs to the same event
      if (input.categoryId && input.categoryId !== guest.categoryId) {
        const category = await db.query.guestCategories.findFirst({
          where: and(
            eq(guestCategories.id, input.categoryId),
            eq(guestCategories.eventId, guest.eventId)
          ),
        })

        if (!category) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid category for this event",
          })
        }
      }

      const { guestId, ...updateData } = input

      const [updated] = await db
        .update(guests)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(guests.id, guestId))
        .returning()

      return updated
    }),

  // Delete guest
  delete: protectedProcedure
    .input(z.object({ guestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const guest = await db.query.guests.findFirst({
        where: eq(guests.id, input.guestId),
        with: { event: true },
      })

      if (!guest) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Guest not found" })
      }

      const canDelete = await hasPermission({
        userId: ctx.user.id,
        workspaceId: guest.event.workspaceId,
        permissionName: PERMISSIONS.DELETE_GUESTS,
      })

      if (!canDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete guests",
        })
      }

      await db.delete(guests).where(eq(guests.id, input.guestId))

      return { success: true }
    }),

  // Bulk delete guests
  bulkDelete: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        guestIds: z.array(z.string().uuid()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      const canDelete = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.DELETE_GUESTS,
      })

      if (!canDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete guests",
        })
      }

      // Delete only guests that belong to this event
      const deleted = await db
        .delete(guests)
        .where(
          and(
            eq(guests.eventId, input.eventId),
            sql`${guests.id} = ANY(${input.guestIds})`
          )
        )
        .returning({ id: guests.id })

      return { deletedCount: deleted.length }
    }),

  // Get guest statistics for an event
  getStats: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      const canView = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.VIEW_GUESTS,
      })

      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view guests",
        })
      }

      // Stats by status
      const statusStats = await db
        .select({
          status: guests.status,
          count: sql<number>`count(*)::int`,
        })
        .from(guests)
        .where(eq(guests.eventId, input.eventId))
        .groupBy(guests.status)

      // Stats by category
      const categoryStats = await db
        .select({
          categoryId: guests.categoryId,
          categoryName: guestCategories.name,
          categoryCode: guestCategories.code,
          categoryColor: guestCategories.color,
          count: sql<number>`count(*)::int`,
        })
        .from(guests)
        .innerJoin(guestCategories, eq(guests.categoryId, guestCategories.id))
        .where(eq(guests.eventId, input.eventId))
        .groupBy(guests.categoryId, guestCategories.name, guestCategories.code, guestCategories.color)

      // Total count
      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(guests)
        .where(eq(guests.eventId, input.eventId))

      return {
        byStatus: statusStats,
        byCategory: categoryStats,
        total,
      }
    }),

  // Regenerate RSVP token for a guest
  regenerateRsvpToken: protectedProcedure
    .input(z.object({ guestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const guest = await db.query.guests.findFirst({
        where: eq(guests.id, input.guestId),
        with: { event: true },
      })

      if (!guest) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Guest not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: guest.event.workspaceId,
        permissionName: PERMISSIONS.MANAGE_GUESTS,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage guests",
        })
      }

      const newToken = crypto.randomUUID()

      const [updated] = await db
        .update(guests)
        .set({
          rsvpToken: newToken,
          rsvpTokenExpiresAt: guest.event.rsvpDeadline,
          updatedAt: new Date(),
        })
        .where(eq(guests.id, input.guestId))
        .returning()

      return {
        rsvpToken: updated.rsvpToken,
        rsvpTokenExpiresAt: updated.rsvpTokenExpiresAt,
      }
    }),

  // Bulk update guest status
  bulkUpdateStatus: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        guestIds: z.array(z.string().uuid()).min(1),
        status: z.enum(guestStatusValues),
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
        permissionName: PERMISSIONS.MANAGE_GUESTS,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage guests",
        })
      }

      const updated = await db
        .update(guests)
        .set({ status: input.status, updatedAt: new Date() })
        .where(
          and(
            eq(guests.eventId, input.eventId),
            sql`${guests.id} = ANY(${input.guestIds})`
          )
        )
        .returning({ id: guests.id })

      return { updatedCount: updated.length }
    }),

  // Bulk update guest category
  bulkUpdateCategory: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        guestIds: z.array(z.string().uuid()).min(1),
        categoryId: z.string().uuid(),
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
        permissionName: PERMISSIONS.MANAGE_GUESTS,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage guests",
        })
      }

      // Verify category belongs to this event
      const category = await db.query.guestCategories.findFirst({
        where: and(
          eq(guestCategories.id, input.categoryId),
          eq(guestCategories.eventId, input.eventId)
        ),
      })

      if (!category) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid category for this event",
        })
      }

      const updated = await db
        .update(guests)
        .set({ categoryId: input.categoryId, updatedAt: new Date() })
        .where(
          and(
            eq(guests.eventId, input.eventId),
            sql`${guests.id} = ANY(${input.guestIds})`
          )
        )
        .returning({ id: guests.id })

      return { updatedCount: updated.length }
    }),

  // Bulk create guests (for import)
  bulkCreate: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        guests: z.array(
          z.object({
            categoryId: z.string().uuid(),
            firstName: z.string().min(1),
            lastName: z.string().min(1),
            email: z.string().email(),
            phone: z.string().optional(),
            position: z.string().optional(),
            entity: z.string().optional(),
            department: z.string().optional(),
            internalNotes: z.string().optional(),
            externalId: z.string().optional(),
            country: z.string().optional(),
          })
        ).min(1).max(500),
        importBatchId: z.string().optional(),
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
        permissionName: PERMISSIONS.MANAGE_GUESTS,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage guests",
        })
      }

      // Get all valid category IDs for this event
      const eventCategories = await db.query.guestCategories.findMany({
        where: eq(guestCategories.eventId, input.eventId),
        columns: { id: true },
      })
      const validCategoryIds = new Set(eventCategories.map(c => c.id))

      // Validate all category IDs
      const invalidCategories = input.guests.filter(g => !validCategoryIds.has(g.categoryId))
      if (invalidCategories.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid category IDs found for ${invalidCategories.length} guest(s)`,
        })
      }

      // Generate batch ID if not provided
      const batchId = input.importBatchId || crypto.randomUUID()

      // Prepare guest records
      const guestRecords = input.guests.map(guest => ({
        ...guest,
        eventId: input.eventId,
        rsvpToken: crypto.randomUUID(),
        rsvpTokenExpiresAt: event.rsvpDeadline,
        importBatchId: batchId,
      }))

      // Insert all guests
      const created = await db
        .insert(guests)
        .values(guestRecords)
        .returning({ id: guests.id })

      return {
        createdCount: created.length,
        importBatchId: batchId,
      }
    }),

  // Check which emails already exist in the event (for import duplicate detection)
  checkExistingEmails: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        emails: z.array(z.string()).max(1000),
      })
    )
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      // Check permission
      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.MANAGE_EVENT,
      })
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to manage guests for this event",
        })
      }

      // Get all guests for this event
      const existingGuests = await db.query.guests.findMany({
        where: eq(guests.eventId, input.eventId),
        columns: { email: true },
      })

      // Normalize input emails to lowercase for comparison
      const normalizedInputEmails = input.emails.map((e) =>
        e.toLowerCase().trim()
      )

      // Find which input emails exist (case-insensitive)
      const existingEmailsSet = new Set(
        existingGuests
          .map((g) => g.email?.toLowerCase())
          .filter((e): e is string => !!e)
      )

      const duplicateEmails = normalizedInputEmails.filter((e) =>
        existingEmailsSet.has(e)
      )

      return { existingEmails: [...new Set(duplicateEmails)] }
    }),

  // Get guests with their category info (for bulk email validation)
  getGuestsWithCategories: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        guestIds: z.array(z.string().uuid()).min(1).max(5000),
      })
    )
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      // Check permission
      const canView = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.VIEW_GUESTS,
      })

      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view guests",
        })
      }

      // Fetch guests with their categories
      const guestList = await db.query.guests.findMany({
        where: and(
          eq(guests.eventId, input.eventId),
          sql`${guests.id} = ANY(${input.guestIds})`
        ),
        with: {
          category: {
            columns: {
              id: true,
              name: true,
              code: true,
              color: true,
              defaultEmailTemplateId: true,
            },
          },
        },
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          categoryId: true,
        },
      })

      // Group guests by category and identify categories without templates
      const categoriesMap = new Map<
        string,
        {
          id: string
          name: string
          code: string
          color: string | null
          defaultEmailTemplateId: string | null
          guestCount: number
        }
      >()

      for (const guest of guestList) {
        if (!guest.category) continue

        const existing = categoriesMap.get(guest.category.id)
        if (existing) {
          existing.guestCount++
        } else {
          categoriesMap.set(guest.category.id, {
            ...guest.category,
            guestCount: 1,
          })
        }
      }

      const categories = Array.from(categoriesMap.values())
      const categoriesWithoutTemplate = categories.filter(
        (c) => !c.defaultEmailTemplateId
      )

      return {
        guests: guestList,
        categories,
        categoriesWithoutTemplate,
        allHaveTemplates: categoriesWithoutTemplate.length === 0,
      }
    }),
})
