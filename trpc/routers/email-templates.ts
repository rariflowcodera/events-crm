import { db } from "@/server/db/config/database"
import { events, emailTemplates, guestCategories, workspaceMembers } from "@/server/db/schemas"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import {
  emailTemplateTypeValues,
  bilingualEmailContentSchema,
} from "@/lib/schemas"
import { TRPCError } from "@trpc/server"
import { and, desc, eq, isNull } from "drizzle-orm"
import { z } from "zod"

export const emailTemplatesRouter = createTRPCRouter({
  // Get templates for an event
  getMany: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        type: z.enum(emailTemplateTypeValues).optional(),
        categoryId: z.string().uuid().optional(),
      })
    )
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

      // Build conditions
      const conditions = [eq(emailTemplates.eventId, input.eventId)]

      if (input.type) {
        conditions.push(eq(emailTemplates.type, input.type))
      }

      if (input.categoryId) {
        conditions.push(eq(emailTemplates.categoryId, input.categoryId))
      }

      return db.query.emailTemplates.findMany({
        where: and(...conditions),
        with: {
          category: {
            columns: { id: true, name: true, code: true, color: true },
          },
          creator: {
            columns: { id: true, name: true, image: true },
          },
        },
        orderBy: [desc(emailTemplates.createdAt)],
      })
    }),

  // Get single template
  getOne: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const template = await db.query.emailTemplates.findFirst({
        where: eq(emailTemplates.id, input.templateId),
        with: {
          event: true,
          category: true,
          creator: {
            columns: { id: true, name: true, image: true },
          },
        },
      })

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
      }

      // Check membership
      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, template.event.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" })
      }

      return template
    }),

  // Create template
  create: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        name: z.string().min(1),
        type: z.enum(emailTemplateTypeValues),
        categoryId: z.string().uuid().optional(),
        content: bilingualEmailContentSchema,
        defaultLanguage: z.enum(["en", "ar"]).default("en"),
        fromName: z.string().optional(),
        fromEmail: z.string().email().optional().or(z.literal("")),
        replyTo: z.string().email().optional().or(z.literal("")),
        attachments: z
          .array(
            z.object({
              name: z.string(),
              url: z.string(),
              type: z.string(),
            })
          )
          .optional(),
        availableVariables: z.array(z.string()).optional(),
        isDefault: z.boolean().optional(),
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
        permissionName: PERMISSIONS.MANAGE_TEMPLATES,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage templates",
        })
      }

      // If categoryId is provided, verify it belongs to this event
      if (input.categoryId) {
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
      }

      // If marking as default, unset other defaults of the same type
      if (input.isDefault) {
        const conditions = [
          eq(emailTemplates.eventId, input.eventId),
          eq(emailTemplates.type, input.type),
          eq(emailTemplates.isDefault, true),
        ]

        if (input.categoryId) {
          conditions.push(eq(emailTemplates.categoryId, input.categoryId))
        }

        await db
          .update(emailTemplates)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(and(...conditions))
      }

      const [template] = await db
        .insert(emailTemplates)
        .values({
          ...input,
          createdBy: ctx.user.id,
        })
        .returning()

      return template
    }),

  // Update template
  update: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        name: z.string().min(1).optional(),
        type: z.enum(emailTemplateTypeValues).optional(),
        categoryId: z.string().uuid().nullable().optional(),
        content: bilingualEmailContentSchema.optional(),
        defaultLanguage: z.enum(["en", "ar"]).optional(),
        fromName: z.string().nullable().optional(),
        fromEmail: z.string().email().nullable().optional().or(z.literal("")),
        replyTo: z.string().email().nullable().optional().or(z.literal("")),
        attachments: z
          .array(
            z.object({
              name: z.string(),
              url: z.string(),
              type: z.string(),
            })
          )
          .optional(),
        availableVariables: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await db.query.emailTemplates.findFirst({
        where: eq(emailTemplates.id, input.templateId),
        with: { event: true },
      })

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: template.event.workspaceId,
        permissionName: PERMISSIONS.MANAGE_TEMPLATES,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage templates",
        })
      }

      // If categoryId is changing, verify it belongs to this event
      if (input.categoryId && input.categoryId !== template.categoryId) {
        const category = await db.query.guestCategories.findFirst({
          where: and(
            eq(guestCategories.id, input.categoryId),
            eq(guestCategories.eventId, template.eventId)
          ),
        })

        if (!category) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid category for this event",
          })
        }
      }

      // If marking as default, unset other defaults
      if (input.isDefault) {
        const templateType = input.type || template.type
        const categoryId = input.categoryId !== undefined ? input.categoryId : template.categoryId

        const conditions = [
          eq(emailTemplates.eventId, template.eventId),
          eq(emailTemplates.type, templateType),
          eq(emailTemplates.isDefault, true),
        ]

        if (categoryId) {
          conditions.push(eq(emailTemplates.categoryId, categoryId))
        }

        await db
          .update(emailTemplates)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(and(...conditions))
      }

      const { templateId, ...updateData } = input

      const [updated] = await db
        .update(emailTemplates)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(emailTemplates.id, templateId))
        .returning()

      return updated
    }),

  // Delete template
  delete: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const template = await db.query.emailTemplates.findFirst({
        where: eq(emailTemplates.id, input.templateId),
        with: { event: true },
      })

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: template.event.workspaceId,
        permissionName: PERMISSIONS.MANAGE_TEMPLATES,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage templates",
        })
      }

      await db.delete(emailTemplates).where(eq(emailTemplates.id, input.templateId))

      return { success: true }
    }),

  // Duplicate template
  duplicate: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        name: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await db.query.emailTemplates.findFirst({
        where: eq(emailTemplates.id, input.templateId),
        with: { event: true },
      })

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: template.event.workspaceId,
        permissionName: PERMISSIONS.MANAGE_TEMPLATES,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage templates",
        })
      }

      const [duplicated] = await db
        .insert(emailTemplates)
        .values({
          eventId: template.eventId,
          name: input.name || `${template.name} (Copy)`,
          type: template.type,
          categoryId: template.categoryId,
          content: template.content,
          defaultLanguage: template.defaultLanguage,
          fromName: template.fromName,
          fromEmail: template.fromEmail,
          replyTo: template.replyTo,
          attachments: template.attachments,
          availableVariables: template.availableVariables,
          isDefault: false, // Duplicates are not default
          createdBy: ctx.user.id,
        })
        .returning()

      return duplicated
    }),

  // Get available template variables
  getVariables: protectedProcedure
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

      // Return available template variables
      return {
        guest: [
          { key: "{{guest.firstName}}", description: "Guest's first name" },
          { key: "{{guest.lastName}}", description: "Guest's last name" },
          { key: "{{guest.fullName}}", description: "Guest's full name" },
          { key: "{{guest.title}}", description: "Guest's title (Mr., Mrs., etc.)" },
          { key: "{{guest.salutation}}", description: "Guest's salutation" },
          { key: "{{guest.email}}", description: "Guest's email address" },
          { key: "{{guest.position}}", description: "Guest's job position" },
          { key: "{{guest.entity}}", description: "Guest's organization/company" },
          { key: "{{guest.category}}", description: "Guest's category name" },
        ],
        event: [
          { key: "{{event.name}}", description: "Event name" },
          { key: "{{event.venue}}", description: "Event venue" },
          { key: "{{event.venueAddress}}", description: "Venue address" },
          { key: "{{event.startDate}}", description: "Event start date" },
          { key: "{{event.endDate}}", description: "Event end date" },
          { key: "{{event.rsvpDeadline}}", description: "RSVP deadline" },
        ],
        links: [
          { key: "{{rsvp.link}}", description: "Personalized RSVP link" },
          { key: "{{rsvp.confirmLink}}", description: "Direct confirmation link" },
          { key: "{{rsvp.declineLink}}", description: "Direct decline link" },
        ],
        category: [
          { key: "{{category.name}}", description: "Category name" },
          { key: "{{category.services}}", description: "Category service summary" },
        ],
      }
    }),

  // Get default templates for each email type (event-level, no category)
  getDefaultTemplates: protectedProcedure
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

      // Get all default templates for this event (event-level only, no category)
      const templates = await db.query.emailTemplates.findMany({
        where: and(
          eq(emailTemplates.eventId, input.eventId),
          eq(emailTemplates.isDefault, true),
          isNull(emailTemplates.categoryId)
        ),
        columns: {
          id: true,
          name: true,
          type: true,
          content: true,
          updatedAt: true,
        },
      })

      // Return as a map: { invitation: template, reminder: template, ... }
      return Object.fromEntries(
        templates.map((t) => [t.type, t])
      ) as Record<string, typeof templates[0]>
    }),

  // Set a template as the default for its type (event-level)
  setDefaultTemplate: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        type: z.enum(emailTemplateTypeValues),
        templateId: z.string().uuid().nullable(),
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
        permissionName: PERMISSIONS.MANAGE_TEMPLATES,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage templates",
        })
      }

      // If templateId provided, verify it belongs to this event and matches the type
      if (input.templateId) {
        const template = await db.query.emailTemplates.findFirst({
          where: and(
            eq(emailTemplates.id, input.templateId),
            eq(emailTemplates.eventId, input.eventId)
          ),
        })

        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template not found",
          })
        }

        if (template.type !== input.type) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Template type "${template.type}" does not match expected type "${input.type}"`,
          })
        }
      }

      // Unset current default for this type (event-level only)
      await db
        .update(emailTemplates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(emailTemplates.eventId, input.eventId),
            eq(emailTemplates.type, input.type),
            isNull(emailTemplates.categoryId),
            eq(emailTemplates.isDefault, true)
          )
        )

      // Set new default if provided
      if (input.templateId) {
        await db
          .update(emailTemplates)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(emailTemplates.id, input.templateId))
      }

      return { success: true }
    }),
})
