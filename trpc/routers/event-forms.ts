import { db } from "@/server/db/config/database"
import {
  events,
  eventForms,
  formResponses,
  guests,
  guestCategories,
  guestFormTokens,
  workspaceMembers,
} from "@/server/db/schemas"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import { and, eq, desc, count, sql } from "drizzle-orm"
import { z } from "zod"

import {
  createEventFormSchema,
  updateEventFormSchema,
  formConfigSchema,
  formPurposeValues,
  formAccessTypeValues,
} from "@/lib/schemas"
import type { FormConfig } from "@/server/db/schemas/event-form"
import {
  remapCategoryIdsByName,
  remapFormConfigCategories,
} from "@/lib/event-duplication"

// Helper to generate a short code
function generateShortCode(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Helper to generate a unique form token
function generateFormToken(): string {
  return crypto.randomUUID()
}

// Helper to create a default empty form config
function createDefaultFormConfig(): FormConfig {
  return {
    sections: [
      {
        id: crypto.randomUUID(),
        title: { en: "Section 1" },
        enabled: true,
        sortOrder: 0,
        fields: [],
      },
    ],
    settings: {
      showProgressIndicator: true,
      confirmationMessage: { en: "Thank you for your submission!" },
      submitButtonText: { en: "Submit" },
    },
  }
}

export const eventFormsRouter = createTRPCRouter({
  // List all forms for an event
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

      const forms = await db.query.eventForms.findMany({
        where: eq(eventForms.eventId, input.eventId),
        orderBy: [desc(eventForms.createdAt)],
      })

      // Get response counts for each form
      const formsWithCounts = await Promise.all(
        forms.map(async (form) => {
          const [responseCount] = await db
            .select({ count: count() })
            .from(formResponses)
            .where(eq(formResponses.formId, form.id))

          return {
            ...form,
            responseCount: responseCount?.count ?? 0,
          }
        })
      )

      return formsWithCounts
    }),

  // Get single form by ID
  getOne: protectedProcedure
    .input(z.object({ formId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const form = await db.query.eventForms.findFirst({
        where: eq(eventForms.id, input.formId),
      })

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" })
      }

      // Check membership via event
      const event = await db.query.events.findFirst({
        where: eq(events.id, form.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, event.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" })
      }

      // Get response count
      const [responseCount] = await db
        .select({ count: count() })
        .from(formResponses)
        .where(eq(formResponses.formId, form.id))

      return {
        ...form,
        event: {
          id: event.id,
          name: event.name,
          slug: event.slug,
        },
        responseCount: responseCount?.count ?? 0,
      }
    }),

  // Get single form by event and slug
  getBySlug: protectedProcedure
    .input(z.object({ eventId: z.string().uuid(), formSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const form = await db.query.eventForms.findFirst({
        where: and(eq(eventForms.eventId, input.eventId), eq(eventForms.slug, input.formSlug)),
      })

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" })
      }

      // Check membership via event
      const event = await db.query.events.findFirst({
        where: eq(events.id, form.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, event.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" })
      }

      // Get response count
      const [responseCount] = await db
        .select({ count: count() })
        .from(formResponses)
        .where(eq(formResponses.formId, form.id))

      return {
        ...form,
        event: {
          id: event.id,
          name: event.name,
          slug: event.slug,
        },
        responseCount: responseCount?.count ?? 0,
      }
    }),

  // Create new form
  create: protectedProcedure
    .input(createEventFormSchema)
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

      // Check for duplicate slug within event
      const existingForm = await db.query.eventForms.findFirst({
        where: and(eq(eventForms.eventId, input.eventId), eq(eventForms.slug, input.slug)),
      })

      if (existingForm) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A form with this slug already exists for this event",
        })
      }

      // Generate unique short code
      let shortCode = generateShortCode()
      let attempts = 0
      while (attempts < 10) {
        const existing = await db.query.eventForms.findFirst({
          where: eq(eventForms.shortCode, shortCode),
        })
        if (!existing) break
        shortCode = generateShortCode()
        attempts++
      }

      const [form] = await db
        .insert(eventForms)
        .values({
          eventId: input.eventId,
          workspaceId: event.workspaceId,
          name: input.name,
          slug: input.slug,
          description: input.description,
          purpose: input.purpose,
          formConfig: input.formConfig as FormConfig,
          accessType: input.accessType,
          visibleToCategories: input.visibleToCategories,
          allowMultipleSubmissions: input.allowMultipleSubmissions,
          allowAmendments: input.allowAmendments,
          expiresAt: input.expiresAt,
          shortCode,
          createdBy: ctx.user.id,
        })
        .returning()

      return form
    }),

  // Update form
  update: protectedProcedure
    .input(updateEventFormSchema)
    .mutation(async ({ ctx, input }) => {
      const form = await db.query.eventForms.findFirst({
        where: eq(eventForms.id, input.formId),
      })

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" })
      }

      const event = await db.query.events.findFirst({
        where: eq(events.id, form.eventId),
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

      // Check for duplicate slug if changing
      if (input.slug && input.slug !== form.slug) {
        const existingForm = await db.query.eventForms.findFirst({
          where: and(eq(eventForms.eventId, form.eventId), eq(eventForms.slug, input.slug)),
        })

        if (existingForm) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A form with this slug already exists for this event",
          })
        }
      }

      const [updated] = await db
        .update(eventForms)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.slug !== undefined && { slug: input.slug }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.purpose !== undefined && { purpose: input.purpose }),
          ...(input.formConfig !== undefined && { formConfig: input.formConfig as FormConfig }),
          ...(input.accessType !== undefined && { accessType: input.accessType }),
          ...(input.visibleToCategories !== undefined && {
            visibleToCategories: input.visibleToCategories,
          }),
          ...(input.allowMultipleSubmissions !== undefined && {
            allowMultipleSubmissions: input.allowMultipleSubmissions,
          }),
          ...(input.allowAmendments !== undefined && { allowAmendments: input.allowAmendments }),
          ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt }),
          updatedAt: new Date(),
        })
        .where(eq(eventForms.id, input.formId))
        .returning()

      return updated
    }),

  // Delete form
  delete: protectedProcedure
    .input(z.object({ formId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const form = await db.query.eventForms.findFirst({
        where: eq(eventForms.id, input.formId),
      })

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" })
      }

      const event = await db.query.events.findFirst({
        where: eq(events.id, form.eventId),
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

      await db.delete(eventForms).where(eq(eventForms.id, input.formId))

      return { success: true }
    }),

  // Duplicate form
  duplicate: protectedProcedure
    .input(z.object({ formId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const form = await db.query.eventForms.findFirst({
        where: eq(eventForms.id, input.formId),
      })

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" })
      }

      const event = await db.query.events.findFirst({
        where: eq(events.id, form.eventId),
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

      // Generate unique slug
      let newSlug = `${form.slug}-copy`
      let counter = 1
      while (true) {
        const existing = await db.query.eventForms.findFirst({
          where: and(eq(eventForms.eventId, form.eventId), eq(eventForms.slug, newSlug)),
        })
        if (!existing) break
        newSlug = `${form.slug}-copy-${counter}`
        counter++
      }

      // Generate unique short code
      let shortCode = generateShortCode()
      let attempts = 0
      while (attempts < 10) {
        const existing = await db.query.eventForms.findFirst({
          where: eq(eventForms.shortCode, shortCode),
        })
        if (!existing) break
        shortCode = generateShortCode()
        attempts++
      }

      // Handle bilingual name for copy
      const originalName = form.name as { en: string; ar?: string }
      const copyName = {
        en: `${originalName.en} (Copy)`,
        ar: originalName.ar ? `${originalName.ar} (نسخة)` : undefined,
      }

      const [newForm] = await db
        .insert(eventForms)
        .values({
          eventId: form.eventId,
          workspaceId: form.workspaceId,
          name: copyName,
          slug: newSlug,
          description: form.description,
          purpose: form.purpose,
          formConfig: form.formConfig,
          accessType: form.accessType,
          visibleToCategories: form.visibleToCategories,
          allowMultipleSubmissions: form.allowMultipleSubmissions,
          allowAmendments: form.allowAmendments,
          expiresAt: form.expiresAt,
          shortCode,
          isPublished: false,
          createdBy: ctx.user.id,
        })
        .returning()

      return newForm
    }),

  // Copy form to other events
  copyToEvents: protectedProcedure
    .input(
      z.object({
        formId: z.string().uuid(),
        targetEventIds: z.array(z.string().uuid()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Get the source form
      const sourceForm = await db.query.eventForms.findFirst({
        where: eq(eventForms.id, input.formId),
      })

      if (!sourceForm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" })
      }

      // 2. Get the source event and verify permissions
      const sourceEvent = await db.query.events.findFirst({
        where: eq(events.id, sourceForm.eventId),
      })

      if (!sourceEvent) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source event not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: sourceEvent.workspaceId,
        permissionName: PERMISSIONS.MANAGE_EVENT,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage events in this workspace",
        })
      }

      // 3. Get source event categories for name-based remapping
      const sourceCategories = await db.query.guestCategories.findMany({
        where: eq(guestCategories.eventId, sourceForm.eventId),
      })

      // 4. Verify all target events belong to the same workspace and not the source event
      const targetEvents = await db.query.events.findMany({
        where: sql`${events.id} IN (${sql.join(
          input.targetEventIds.map((id) => sql`${id}`),
          sql`, `
        )})`,
      })

      if (targetEvents.length !== input.targetEventIds.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more target events not found",
        })
      }

      for (const targetEvent of targetEvents) {
        if (targetEvent.workspaceId !== sourceEvent.workspaceId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "All target events must belong to the same workspace",
          })
        }

        // Cannot copy to the source event
        if (targetEvent.id === sourceForm.eventId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot copy form to its own event. Use duplicate instead.",
          })
        }
      }

      // 5. Copy form to each target event
      const results: Array<{
        eventId: string
        eventName: string
        formId: string
        formSlug: string
      }> = []

      for (const targetEvent of targetEvents) {
        // Get target event categories for remapping
        const targetCategories = await db.query.guestCategories.findMany({
          where: eq(guestCategories.eventId, targetEvent.id),
        })

        // Generate unique slug for the target event
        let newSlug = sourceForm.slug
        let counter = 1
        while (true) {
          const existing = await db.query.eventForms.findFirst({
            where: and(
              eq(eventForms.eventId, targetEvent.id),
              eq(eventForms.slug, newSlug)
            ),
          })
          if (!existing) break
          newSlug = `${sourceForm.slug}-${counter}`
          counter++
          if (counter > 100) {
            newSlug = `${sourceForm.slug}-${crypto.randomUUID().slice(0, 8)}`
            break
          }
        }

        // Generate unique short code
        let shortCode = generateShortCode()
        let attempts = 0
        while (attempts < 10) {
          const existing = await db.query.eventForms.findFirst({
            where: eq(eventForms.shortCode, shortCode),
          })
          if (!existing) break
          shortCode = generateShortCode()
          attempts++
        }

        // Remap category IDs by name
        const remappedVisibleToCategories = remapCategoryIdsByName(
          sourceForm.visibleToCategories,
          sourceCategories.map((c) => ({ id: c.id, name: c.name })),
          targetCategories.map((c) => ({ id: c.id, name: c.name }))
        )

        // Remap categories within formConfig
        const remappedFormConfig = remapFormConfigCategories(
          sourceForm.formConfig as FormConfig,
          sourceCategories.map((c) => ({ id: c.id, name: c.name })),
          targetCategories.map((c) => ({ id: c.id, name: c.name }))
        )

        // Insert the new form
        const [newForm] = await db
          .insert(eventForms)
          .values({
            eventId: targetEvent.id,
            workspaceId: targetEvent.workspaceId,
            name: sourceForm.name,
            slug: newSlug,
            description: sourceForm.description,
            purpose: sourceForm.purpose,
            formConfig: remappedFormConfig,
            accessType: sourceForm.accessType,
            visibleToCategories: remappedVisibleToCategories,
            allowMultipleSubmissions: sourceForm.allowMultipleSubmissions,
            allowAmendments: sourceForm.allowAmendments,
            expiresAt: sourceForm.expiresAt,
            shortCode,
            isPublished: false, // Always create as draft
            createdBy: ctx.user.id,
          })
          .returning()

        results.push({
          eventId: targetEvent.id,
          eventName: targetEvent.name,
          formId: newForm.id,
          formSlug: newForm.slug,
        })
      }

      return {
        copiedCount: results.length,
        results,
      }
    }),

  // Publish form
  publish: protectedProcedure
    .input(z.object({ formId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const form = await db.query.eventForms.findFirst({
        where: eq(eventForms.id, input.formId),
      })

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" })
      }

      const event = await db.query.events.findFirst({
        where: eq(events.id, form.eventId),
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

      const [updated] = await db
        .update(eventForms)
        .set({
          isPublished: true,
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(eventForms.id, input.formId))
        .returning()

      return updated
    }),

  // Unpublish form
  unpublish: protectedProcedure
    .input(z.object({ formId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const form = await db.query.eventForms.findFirst({
        where: eq(eventForms.id, input.formId),
      })

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" })
      }

      const event = await db.query.events.findFirst({
        where: eq(events.id, form.eventId),
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

      const [updated] = await db
        .update(eventForms)
        .set({
          isPublished: false,
          updatedAt: new Date(),
        })
        .where(eq(eventForms.id, input.formId))
        .returning()

      return updated
    }),

  // Regenerate short code
  regenerateShortCode: protectedProcedure
    .input(z.object({ formId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const form = await db.query.eventForms.findFirst({
        where: eq(eventForms.id, input.formId),
      })

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" })
      }

      const event = await db.query.events.findFirst({
        where: eq(events.id, form.eventId),
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

      // Generate unique short code
      let shortCode = generateShortCode()
      let attempts = 0
      while (attempts < 10) {
        const existing = await db.query.eventForms.findFirst({
          where: eq(eventForms.shortCode, shortCode),
        })
        if (!existing) break
        shortCode = generateShortCode()
        attempts++
      }

      const [updated] = await db
        .update(eventForms)
        .set({
          shortCode,
          updatedAt: new Date(),
        })
        .where(eq(eventForms.id, input.formId))
        .returning()

      return updated
    }),

  // Get responses for a form
  getResponses: protectedProcedure
    .input(
      z.object({
        formId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const form = await db.query.eventForms.findFirst({
        where: eq(eventForms.id, input.formId),
      })

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" })
      }

      const event = await db.query.events.findFirst({
        where: eq(events.id, form.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, event.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" })
      }

      // Get responses with guest info
      const responses = await db
        .select({
          response: formResponses,
          guest: {
            id: guests.id,
            firstName: guests.firstName,
            lastName: guests.lastName,
            email: guests.email,
            categoryId: guests.categoryId,
          },
        })
        .from(formResponses)
        .leftJoin(guests, eq(formResponses.guestId, guests.id))
        .where(eq(formResponses.formId, input.formId))
        .orderBy(desc(formResponses.submittedAt))
        .limit(input.limit)
        .offset(input.offset)

      // Get total count
      const [totalCount] = await db
        .select({ count: count() })
        .from(formResponses)
        .where(eq(formResponses.formId, input.formId))

      // Get category names
      const categoryIds = [...new Set(responses.map((r) => r.guest?.categoryId).filter(Boolean))]
      const categories =
        categoryIds.length > 0
          ? await db.query.guestCategories.findMany({
              where: sql`${guestCategories.id} IN ${categoryIds}`,
            })
          : []

      const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

      return {
        responses: responses.map((r) => ({
          ...r.response,
          guest: r.guest
            ? {
                ...r.guest,
                categoryName: r.guest.categoryId ? categoryMap.get(r.guest.categoryId) : undefined,
              }
            : null,
        })),
        total: totalCount?.count ?? 0,
        hasMore: input.offset + responses.length < (totalCount?.count ?? 0),
      }
    }),

  // Get response summary stats
  getResponseSummary: protectedProcedure
    .input(z.object({ formId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const form = await db.query.eventForms.findFirst({
        where: eq(eventForms.id, input.formId),
      })

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" })
      }

      const event = await db.query.events.findFirst({
        where: eq(events.id, form.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, event.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" })
      }

      // Get total count
      const [totalCount] = await db
        .select({ count: count() })
        .from(formResponses)
        .where(eq(formResponses.formId, input.formId))

      // Get count by category
      const categoryStats = await db
        .select({
          categoryId: guests.categoryId,
          count: count(),
        })
        .from(formResponses)
        .leftJoin(guests, eq(formResponses.guestId, guests.id))
        .where(eq(formResponses.formId, input.formId))
        .groupBy(guests.categoryId)

      // Get category names
      const categoryIds = categoryStats.map((s) => s.categoryId).filter(Boolean) as string[]
      const categories =
        categoryIds.length > 0
          ? await db.query.guestCategories.findMany({
              where: sql`${guestCategories.id} IN ${categoryIds}`,
            })
          : []

      const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

      // Get recent responses count (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const [recentCount] = await db
        .select({ count: count() })
        .from(formResponses)
        .where(
          and(
            eq(formResponses.formId, input.formId),
            sql`${formResponses.submittedAt} >= ${oneDayAgo}`
          )
        )

      return {
        total: totalCount?.count ?? 0,
        byCategory: categoryStats.map((s) => ({
          categoryId: s.categoryId,
          categoryName: s.categoryId ? categoryMap.get(s.categoryId) ?? "Unknown" : "No Category",
          count: s.count,
        })),
        recentResponses: recentCount?.count ?? 0,
      }
    }),

  // ============================================================================
  // Token-Based Form Access (Stage 35)
  // ============================================================================

  // Get token-mode forms for an event (for dropdown selection)
  getTokenModeForms: protectedProcedure
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

      // Get only token-mode forms that are published
      const forms = await db.query.eventForms.findMany({
        where: and(
          eq(eventForms.eventId, input.eventId),
          eq(eventForms.accessType, "token"),
          eq(eventForms.isPublished, true)
        ),
        orderBy: [desc(eventForms.createdAt)],
      })

      return forms.map((form) => ({
        id: form.id,
        name: form.name,
        slug: form.slug,
        description: form.description,
        purpose: form.purpose,
        expiresAt: form.expiresAt,
      }))
    }),

  // Get or create a token for a guest + form pair
  getGuestFormToken: protectedProcedure
    .input(
      z.object({
        formId: z.string().uuid(),
        guestId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the form
      const form = await db.query.eventForms.findFirst({
        where: eq(eventForms.id, input.formId),
      })

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" })
      }

      // Verify form is token-mode
      if (form.accessType !== "token") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This form does not use token-based access",
        })
      }

      // Get the event
      const event = await db.query.events.findFirst({
        where: eq(events.id, form.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      // Check permission
      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.SEND_EMAILS, // Reuse email permission for form link access
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to generate form links",
        })
      }

      // Get the guest and verify they belong to this event
      const guest = await db.query.guests.findFirst({
        where: and(eq(guests.id, input.guestId), eq(guests.eventId, form.eventId)),
      })

      if (!guest) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Guest not found in this event" })
      }

      // Check if token already exists
      const existingToken = await db.query.guestFormTokens.findFirst({
        where: and(
          eq(guestFormTokens.guestId, input.guestId),
          eq(guestFormTokens.formId, input.formId)
        ),
      })

      if (existingToken) {
        return {
          token: existingToken.token,
          expiresAt: existingToken.expiresAt,
          guest: {
            id: guest.id,
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email,
          },
          form: {
            id: form.id,
            name: form.name,
          },
        }
      }

      // Create new token
      const [newToken] = await db
        .insert(guestFormTokens)
        .values({
          guestId: input.guestId,
          formId: input.formId,
          token: generateFormToken(),
          expiresAt: form.expiresAt, // Inherit from form
        })
        .returning()

      return {
        token: newToken.token,
        expiresAt: newToken.expiresAt,
        guest: {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
        },
        form: {
          id: form.id,
          name: form.name,
        },
      }
    }),
})
