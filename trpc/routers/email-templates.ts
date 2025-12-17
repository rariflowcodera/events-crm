import { db } from "@/server/db/config/database"
import {
  events,
  emailTemplates,
  emailMasterTemplates,
  guestCategories,
  workspaceMembers,
  workspaces,
  eventDocuments,
  guests,
} from "@/server/db/schemas"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import {
  emailTemplateTypeValues,
  bilingualEmailContentSchema,
  bilingualStructuredContentSchema,
} from "@/lib/schemas"
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/email/default-templates"
import {
  renderStructuredEmail,
  getSamplePreviewData,
} from "@/lib/email/render-structured"
import {
  defaultMasterTemplate,
  defaultMasterTemplateStructure,
} from "@/lib/email/master-templates/default"
import { TRPCError } from "@trpc/server"
import { and, asc, desc, eq, isNull } from "drizzle-orm"
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

      // Fetch documents for this event
      const documents = await db.query.eventDocuments.findMany({
        where: eq(eventDocuments.eventId, input.eventId),
        orderBy: [asc(eventDocuments.name)],
      })

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
          { key: "{{event.nameAr}}", description: "Arabic event name" },
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
        map: event.latitude && event.longitude ? [
          { key: "{{event.mapImage}}", description: "Static map image (clickable)" },
          { key: "{{event.mapLink}}", description: "Link to Google Maps" },
        ] : [],
        documents: documents.map((doc) => ({
          key: `{{document.${doc.id}}}`,
          description: `${doc.name} (${doc.type})`,
          url: doc.url,
          name: doc.name,
          type: doc.type,
        })),
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

  // Import default templates for existing events
  importDefaults: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
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

      // Get existing default template types (event-level only, no category)
      const existingTypes = await db.query.emailTemplates.findMany({
        where: and(
          eq(emailTemplates.eventId, input.eventId),
          eq(emailTemplates.isDefault, true),
          isNull(emailTemplates.categoryId)
        ),
        columns: { type: true },
      })

      const existingTypeSet = new Set(existingTypes.map((t) => t.type))

      // Filter to templates that don't exist
      const templatesToCreate = DEFAULT_EMAIL_TEMPLATES.filter(
        (t) => !existingTypeSet.has(t.type)
      )

      if (templatesToCreate.length === 0) {
        return { created: 0, skipped: DEFAULT_EMAIL_TEMPLATES.length }
      }

      // Insert missing templates
      await db.insert(emailTemplates).values(
        templatesToCreate.map((template) => ({
          eventId: input.eventId,
          name: template.name,
          type: template.type,
          content: template.content,
          defaultLanguage: "en" as const,
          isDefault: true,
          isActive: true,
          createdBy: ctx.user.id,
        }))
      )

      return {
        created: templatesToCreate.length,
        skipped: existingTypeSet.size,
      }
    }),

  // ============================================================================
  // Structured Content Endpoints
  // ============================================================================

  // Create template with structured content
  createStructured: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        name: z.string().min(1),
        type: z.enum(emailTemplateTypeValues),
        categoryId: z.string().uuid().optional(),
        structuredContent: bilingualStructuredContentSchema,
        masterTemplateId: z.string().uuid().optional(),
        defaultLanguage: z.enum(["en", "ar"]).default("en"),
        fromName: z.string().optional(),
        fromEmail: z.string().email().optional().or(z.literal("")),
        replyTo: z.string().email().optional().or(z.literal("")),
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

      // Verify category if provided
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

      // Verify master template if provided
      if (input.masterTemplateId) {
        const masterTemplate = await db.query.emailMasterTemplates.findFirst({
          where: eq(emailMasterTemplates.id, input.masterTemplateId),
        })

        if (!masterTemplate || masterTemplate.workspaceId !== event.workspaceId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid master template",
          })
        }
      }

      // Handle default logic
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

      // Create with structured content - also create a placeholder legacy content
      const placeholderContent = {
        en: {
          subject: input.structuredContent.en.subject,
          htmlContent: "<p>This template uses structured content mode.</p>",
        },
      }

      const [template] = await db
        .insert(emailTemplates)
        .values({
          eventId: input.eventId,
          name: input.name,
          type: input.type,
          categoryId: input.categoryId,
          content: placeholderContent,
          structuredContent: input.structuredContent,
          masterTemplateId: input.masterTemplateId,
          defaultLanguage: input.defaultLanguage,
          fromName: input.fromName || null,
          fromEmail: input.fromEmail || null,
          replyTo: input.replyTo || null,
          isDefault: input.isDefault || false,
          createdBy: ctx.user.id,
        })
        .returning()

      return template
    }),

  // Update structured content only
  updateStructuredContent: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        structuredContent: bilingualStructuredContentSchema,
        masterTemplateId: z.string().uuid().nullable().optional(),
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

      // Verify master template if provided
      if (input.masterTemplateId) {
        const masterTemplate = await db.query.emailMasterTemplates.findFirst({
          where: eq(emailMasterTemplates.id, input.masterTemplateId),
        })

        if (!masterTemplate || masterTemplate.workspaceId !== template.event.workspaceId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid master template",
          })
        }
      }

      const updateData: Record<string, unknown> = {
        structuredContent: input.structuredContent,
        updatedAt: new Date(),
      }

      if (input.masterTemplateId !== undefined) {
        updateData.masterTemplateId = input.masterTemplateId
      }

      const [updated] = await db
        .update(emailTemplates)
        .set(updateData)
        .where(eq(emailTemplates.id, input.templateId))
        .returning()

      return updated
    }),

  // Preview rendered email
  previewRendered: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        guestId: z.string().uuid().optional(), // Use real guest data if provided
      })
    )
    .query(async ({ ctx, input }) => {
      const template = await db.query.emailTemplates.findFirst({
        where: eq(emailTemplates.id, input.templateId),
        with: {
          event: true,
          masterTemplate: true,
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
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this workspace",
        })
      }

      // Check if template has structured content
      if (!template.structuredContent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Template does not have structured content. Use legacy preview instead.",
        })
      }

      // Get workspace branding
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, template.event.workspaceId),
      })

      // Get event documents
      const documents = await db.query.eventDocuments.findMany({
        where: eq(eventDocuments.eventId, template.eventId),
      })

      // Get guest data (real or sample)
      let guest
      let event

      if (input.guestId) {
        const guestRecord = await db.query.guests.findFirst({
          where: eq(guests.id, input.guestId),
          with: { category: true },
        })
        if (guestRecord) {
          guest = {
            id: guestRecord.id,
            firstName: guestRecord.firstName,
            lastName: guestRecord.lastName,
            title: guestRecord.title,
            salutation: guestRecord.salutation,
            email: guestRecord.email,
            position: guestRecord.position,
            entity: guestRecord.entity,
            rsvpToken: guestRecord.rsvpToken,
            categoryId: guestRecord.categoryId,
            category: guestRecord.category
              ? { name: guestRecord.category.name, code: guestRecord.category.code }
              : null,
          }
        }
      }

      if (!guest) {
        const sampleData = getSamplePreviewData()
        guest = sampleData.guest
      }

      event = {
        id: template.event.id,
        name: template.event.name,
        nameAr: template.event.nameAr,
        slug: template.event.slug,
        venue: template.event.venue,
        venueAddress: template.event.venueAddress,
        latitude: template.event.latitude,
        longitude: template.event.longitude,
        startDate: template.event.startDate,
        endDate: template.event.endDate,
        rsvpDeadline: template.event.rsvpDeadline,
        customDomain: template.event.customDomain,
        customDomainVerified: template.event.customDomainVerified,
      }

      // Determine master template to use
      let masterTemplate = null
      if (template.masterTemplate) {
        masterTemplate = {
          id: template.masterTemplate.id,
          htmlTemplate: template.masterTemplate.htmlTemplate,
          structure: template.masterTemplate.structure,
        }
      } else {
        // Try to get workspace default
        const workspaceDefault = await db.query.emailMasterTemplates.findFirst({
          where: and(
            eq(emailMasterTemplates.workspaceId, template.event.workspaceId),
            isNull(emailMasterTemplates.eventId),
            eq(emailMasterTemplates.isDefault, true),
            eq(emailMasterTemplates.isActive, true)
          ),
        })

        if (workspaceDefault) {
          masterTemplate = {
            id: workspaceDefault.id,
            htmlTemplate: workspaceDefault.htmlTemplate,
            structure: workspaceDefault.structure,
          }
        } else {
          // Use built-in default
          masterTemplate = {
            id: "built-in",
            htmlTemplate: defaultMasterTemplate,
            structure: defaultMasterTemplateStructure,
          }
        }
      }

      // Render the email
      const result = renderStructuredEmail({
        template: {
          id: template.id,
          name: template.name,
          structuredContent: template.structuredContent,
          defaultLanguage: template.defaultLanguage,
          fromName: template.fromName,
          fromEmail: template.fromEmail,
          replyTo: template.replyTo,
        },
        masterTemplate,
        guest,
        event,
        workspaceBranding: workspace?.branding,
        eventBranding: template.event.branding,
        documents: documents.map((d) => ({
          id: d.id,
          name: d.name,
          url: d.url,
          categoryIds: d.categoryIds,
        })),
      })

      return {
        subject: result.subject,
        html: result.html,
        text: result.text,
        from: result.from,
        replyTo: result.replyTo,
      }
    }),

  // Convert legacy HTML template to structured content (best-effort)
  convertToStructured: protectedProcedure
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

      if (template.structuredContent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Template already has structured content",
        })
      }

      // Best-effort conversion: extract text from HTML
      const enContent = template.content.en
      const arContent = template.content.ar

      const stripHtml = (html: string) => {
        return html
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/\n{3,}/g, "\n\n")
          .trim()
      }

      const extractParagraphs = (html: string) => {
        const stripped = stripHtml(html)
        return stripped.split(/\n\n+/).filter((p) => p.trim().length > 0)
      }

      const structuredContent = {
        en: {
          subject: enContent.subject,
          heading: template.name,
          bodyParagraphs: extractParagraphs(enContent.htmlContent),
        },
        ar: arContent
          ? {
              subject: arContent.subject,
              heading: template.name,
              bodyParagraphs: arContent.htmlContent
                ? extractParagraphs(arContent.htmlContent)
                : undefined,
            }
          : undefined,
      }

      const [updated] = await db
        .update(emailTemplates)
        .set({
          structuredContent,
          updatedAt: new Date(),
        })
        .where(eq(emailTemplates.id, input.templateId))
        .returning()

      return {
        template: updated,
        structuredContent,
        note: "Conversion is best-effort. Please review and adjust the structured content.",
      }
    }),

  // Preview unsaved structured content (for drafts during editing)
  previewStructuredDraft: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        structuredContent: bilingualStructuredContentSchema,
        masterTemplateId: z.string().uuid().optional().nullable(),
        language: z.enum(["en", "ar"]).optional(),
        guestId: z.string().uuid().optional(), // Use real guest data if provided
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get event
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
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this workspace",
        })
      }

      // Get workspace branding
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, event.workspaceId),
      })

      // Get master template (provided or default)
      let masterTemplate = null
      if (input.masterTemplateId) {
        masterTemplate = await db.query.emailMasterTemplates.findFirst({
          where: eq(emailMasterTemplates.id, input.masterTemplateId),
        })
      }
      if (!masterTemplate) {
        // Get workspace default
        masterTemplate = await db.query.emailMasterTemplates.findFirst({
          where: and(
            eq(emailMasterTemplates.workspaceId, event.workspaceId),
            eq(emailMasterTemplates.isDefault, true),
            isNull(emailMasterTemplates.eventId)
          ),
        })
      }

      // Get event documents
      const documents = await db.query.eventDocuments.findMany({
        where: eq(eventDocuments.eventId, input.eventId),
      })

      // Get guest data (real or sample)
      let guest
      if (input.guestId) {
        const guestRecord = await db.query.guests.findFirst({
          where: eq(guests.id, input.guestId),
          with: { category: true },
        })
        if (guestRecord) {
          guest = {
            id: guestRecord.id,
            firstName: guestRecord.firstName,
            lastName: guestRecord.lastName,
            title: guestRecord.title,
            salutation: guestRecord.salutation,
            email: guestRecord.email,
            position: guestRecord.position,
            entity: guestRecord.entity,
            rsvpToken: guestRecord.rsvpToken || "preview-token",
            categoryId: guestRecord.categoryId,
            category: guestRecord.category
              ? { name: guestRecord.category.name, code: guestRecord.category.code }
              : null,
          }
        }
      }

      // Use sample guest if no real guest provided
      if (!guest) {
        guest = {
          id: "sample-guest-id",
          firstName: "John",
          lastName: "Doe",
          title: "Mr.",
          salutation: "Dear Mr. Doe",
          email: "john.doe@example.com",
          position: "Guest",
          entity: "Sample Organization",
          rsvpToken: "preview-token",
          categoryId: null,
          category: null,
        }
      }

      // Render the email
      const result = renderStructuredEmail({
        template: {
          id: "draft",
          name: "Draft Template",
          structuredContent: input.structuredContent,
          defaultLanguage: input.language || "en",
          fromName: null,
          fromEmail: null,
          replyTo: null,
        },
        masterTemplate: masterTemplate
          ? {
              id: masterTemplate.id,
              htmlTemplate: masterTemplate.htmlTemplate,
              structure: masterTemplate.structure,
            }
          : null,
        guest,
        event: {
          id: event.id,
          name: event.name,
          nameAr: event.nameAr,
          slug: event.slug,
          venue: event.venue,
          venueAddress: event.venueAddress,
          latitude: event.latitude,
          longitude: event.longitude,
          startDate: event.startDate,
          endDate: event.endDate,
          rsvpDeadline: event.rsvpDeadline,
          customDomain: event.customDomain,
          customDomainVerified: event.customDomainVerified,
        },
        workspaceBranding: workspace?.branding,
        eventBranding: event.branding,
        documents: documents.map((d) => ({
          id: d.id,
          name: d.name,
          url: d.url,
          categoryIds: d.categoryIds,
        })),
      })

      return {
        subject: result.subject,
        html: result.html,
        text: result.text,
      }
    }),
})
