import { db } from "@/server/db/config/database"
import {
  emailMasterTemplates,
  events,
  workspaces,
  workspaceMembers,
} from "@/server/db/schemas"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import {
  createMasterTemplateSchema,
  updateMasterTemplateSchema,
} from "@/lib/schemas"
import {
  defaultMasterTemplate,
  defaultMasterTemplateStructure,
} from "@/lib/email/master-templates/default"
import {
  renderPreview,
  getSamplePreviewData,
} from "@/lib/email/render-structured"
import { TRPCError } from "@trpc/server"
import { and, desc, eq, isNull, or } from "drizzle-orm"
import { z } from "zod"

export const emailMasterTemplatesRouter = createTRPCRouter({
  // Get master templates for a workspace (optionally filtered by event)
  getMany: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        eventId: z.string().uuid().optional(),
        includeWorkspaceLevel: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check membership
      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, input.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this workspace",
        })
      }

      // Build conditions
      const conditions = [eq(emailMasterTemplates.workspaceId, input.workspaceId)]

      if (input.eventId) {
        if (input.includeWorkspaceLevel) {
          // Get both workspace-level and event-level templates
          conditions.push(
            or(
              isNull(emailMasterTemplates.eventId),
              eq(emailMasterTemplates.eventId, input.eventId)
            )!
          )
        } else {
          // Get only event-level templates
          conditions.push(eq(emailMasterTemplates.eventId, input.eventId))
        }
      } else {
        // Get only workspace-level templates
        conditions.push(isNull(emailMasterTemplates.eventId))
      }

      return db.query.emailMasterTemplates.findMany({
        where: and(...conditions),
        with: {
          creator: {
            columns: { id: true, name: true, image: true },
          },
        },
        orderBy: [desc(emailMasterTemplates.isDefault), desc(emailMasterTemplates.createdAt)],
      })
    }),

  // Get single master template
  getOne: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const template = await db.query.emailMasterTemplates.findFirst({
        where: eq(emailMasterTemplates.id, input.templateId),
        with: {
          workspace: true,
          event: true,
          creator: {
            columns: { id: true, name: true, image: true },
          },
        },
      })

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Master template not found" })
      }

      // Check membership
      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, template.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this workspace",
        })
      }

      return template
    }),

  // Get resolved/effective master template for an event
  // Returns event-level default if exists, otherwise workspace-level default
  getResolved: protectedProcedure
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
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this workspace",
        })
      }

      // First try to find event-level default
      let template = await db.query.emailMasterTemplates.findFirst({
        where: and(
          eq(emailMasterTemplates.eventId, input.eventId),
          eq(emailMasterTemplates.isDefault, true),
          eq(emailMasterTemplates.isActive, true)
        ),
      })

      // Fall back to workspace-level default
      if (!template) {
        template = await db.query.emailMasterTemplates.findFirst({
          where: and(
            eq(emailMasterTemplates.workspaceId, event.workspaceId),
            isNull(emailMasterTemplates.eventId),
            eq(emailMasterTemplates.isDefault, true),
            eq(emailMasterTemplates.isActive, true)
          ),
        })
      }

      // Return built-in default if no custom template
      if (!template) {
        return {
          id: null,
          name: "Built-in Default",
          description: "Standard email template with bilingual support",
          htmlTemplate: defaultMasterTemplate,
          structure: defaultMasterTemplateStructure,
          isBuiltIn: true,
        }
      }

      return {
        ...template,
        isBuiltIn: false,
      }
    }),

  // Create master template
  create: protectedProcedure
    .input(createMasterTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify workspace exists and user has permission
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, input.workspaceId),
      })

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: input.workspaceId,
        permissionName: PERMISSIONS.MANAGE_TEMPLATES,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage templates",
        })
      }

      // If eventId is provided, verify it belongs to this workspace
      if (input.eventId) {
        const event = await db.query.events.findFirst({
          where: and(
            eq(events.id, input.eventId),
            eq(events.workspaceId, input.workspaceId)
          ),
        })

        if (!event) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Event not found in this workspace",
          })
        }
      }

      // If marking as default, unset other defaults at the same level
      if (input.isDefault) {
        const conditions = [
          eq(emailMasterTemplates.workspaceId, input.workspaceId),
          eq(emailMasterTemplates.isDefault, true),
        ]

        if (input.eventId) {
          conditions.push(eq(emailMasterTemplates.eventId, input.eventId))
        } else {
          conditions.push(isNull(emailMasterTemplates.eventId))
        }

        await db
          .update(emailMasterTemplates)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(and(...conditions))
      }

      const [template] = await db
        .insert(emailMasterTemplates)
        .values({
          ...input,
          createdBy: ctx.user.id,
        })
        .returning()

      return template
    }),

  // Update master template
  update: protectedProcedure
    .input(updateMasterTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const template = await db.query.emailMasterTemplates.findFirst({
        where: eq(emailMasterTemplates.id, input.templateId),
      })

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Master template not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: template.workspaceId,
        permissionName: PERMISSIONS.MANAGE_TEMPLATES,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage templates",
        })
      }

      // If marking as default, unset other defaults at the same level
      if (input.isDefault) {
        const conditions = [
          eq(emailMasterTemplates.workspaceId, template.workspaceId),
          eq(emailMasterTemplates.isDefault, true),
        ]

        if (template.eventId) {
          conditions.push(eq(emailMasterTemplates.eventId, template.eventId))
        } else {
          conditions.push(isNull(emailMasterTemplates.eventId))
        }

        await db
          .update(emailMasterTemplates)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(and(...conditions))
      }

      const { templateId, ...updateData } = input

      const [updated] = await db
        .update(emailMasterTemplates)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(emailMasterTemplates.id, templateId))
        .returning()

      return updated
    }),

  // Delete master template
  delete: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const template = await db.query.emailMasterTemplates.findFirst({
        where: eq(emailMasterTemplates.id, input.templateId),
      })

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Master template not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: template.workspaceId,
        permissionName: PERMISSIONS.MANAGE_TEMPLATES,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage templates",
        })
      }

      await db
        .delete(emailMasterTemplates)
        .where(eq(emailMasterTemplates.id, input.templateId))

      return { success: true }
    }),

  // Set a template as default
  setDefault: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        eventId: z.string().uuid().optional(),
        templateId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: input.workspaceId,
        permissionName: PERMISSIONS.MANAGE_TEMPLATES,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage templates",
        })
      }

      // Verify template exists and belongs to this workspace/event
      const template = await db.query.emailMasterTemplates.findFirst({
        where: eq(emailMasterTemplates.id, input.templateId),
      })

      if (!template || template.workspaceId !== input.workspaceId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        })
      }

      // Unset current defaults at the same level
      const conditions = [
        eq(emailMasterTemplates.workspaceId, input.workspaceId),
        eq(emailMasterTemplates.isDefault, true),
      ]

      if (input.eventId) {
        conditions.push(eq(emailMasterTemplates.eventId, input.eventId))
      } else {
        conditions.push(isNull(emailMasterTemplates.eventId))
      }

      await db
        .update(emailMasterTemplates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(...conditions))

      // Set new default
      await db
        .update(emailMasterTemplates)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(emailMasterTemplates.id, input.templateId))

      return { success: true }
    }),

  // Duplicate master template
  duplicate: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        name: z.string().min(1).optional(),
        targetEventId: z.string().uuid().optional(), // Optional: create copy at event level
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await db.query.emailMasterTemplates.findFirst({
        where: eq(emailMasterTemplates.id, input.templateId),
      })

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Master template not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: template.workspaceId,
        permissionName: PERMISSIONS.MANAGE_TEMPLATES,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage templates",
        })
      }

      // If targeting an event, verify it belongs to this workspace
      if (input.targetEventId) {
        const event = await db.query.events.findFirst({
          where: and(
            eq(events.id, input.targetEventId),
            eq(events.workspaceId, template.workspaceId)
          ),
        })

        if (!event) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Event not found in this workspace",
          })
        }
      }

      const [duplicated] = await db
        .insert(emailMasterTemplates)
        .values({
          workspaceId: template.workspaceId,
          eventId: input.targetEventId || template.eventId,
          name: input.name || `${template.name} (Copy)`,
          description: template.description,
          htmlTemplate: template.htmlTemplate,
          structure: template.structure,
          isDefault: false, // Duplicates are not default
          isActive: true,
          createdBy: ctx.user.id,
        })
        .returning()

      return duplicated
    }),

  // Preview a master template with sample data
  preview: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid().optional(),
        htmlTemplate: z.string().optional(), // For live preview during editing
        structure: z
          .object({
            showLogo: z.boolean(),
            showAccentStrip: z.boolean(),
            showEnglishSection: z.boolean(),
            showArabicSection: z.boolean(),
            showDivider: z.boolean(),
            showFooter: z.boolean(),
            showBannerFooter: z.boolean(),
            sectionOrder: z.array(z.enum(["en", "ar"])),
          })
          .optional(),
        workspaceId: z.string().uuid(),
        eventId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check membership
      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, input.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this workspace",
        })
      }

      // Get workspace and event branding
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, input.workspaceId),
      })

      let eventBranding = null
      if (input.eventId) {
        const event = await db.query.events.findFirst({
          where: eq(events.id, input.eventId),
        })
        eventBranding = event?.branding || null
      }

      // Determine template to use
      let htmlTemplate = defaultMasterTemplate
      let structure = defaultMasterTemplateStructure

      if (input.htmlTemplate) {
        htmlTemplate = input.htmlTemplate
      } else if (input.templateId) {
        const template = await db.query.emailMasterTemplates.findFirst({
          where: eq(emailMasterTemplates.id, input.templateId),
        })
        if (template) {
          htmlTemplate = template.htmlTemplate
          structure = template.structure || defaultMasterTemplateStructure
        }
      }

      if (input.structure) {
        structure = input.structure
      }

      // Sample structured content for preview
      const sampleContent = {
        en: {
          subject: "You're Invited to Annual Gala 2025",
          greeting: "Dear Dr. John Smith,",
          heading: "You Are Cordially Invited",
          subheading: "Annual Gala 2025",
          bodyParagraphs: [
            { content: "We are pleased to invite you to our prestigious Annual Gala 2025, an evening of celebration and networking." },
            { content: "The event will feature keynote speakers, a gourmet dinner, and live entertainment." },
            { content: "Please confirm your attendance by March 10, 2025." },
          ],
          cta: {
            text: "Confirm Your Attendance",
            url: "https://example.com/rsvp",
          },
          postCtaText: "We look forward to seeing you there!",
        },
        ar: {
          subject: "دعوة لحضور الحفل السنوي 2025",
          greeting: "الدكتور جون سميث المحترم،",
          heading: "دعوة كريمة لحضور",
          subheading: "الحفل السنوي 2025",
          bodyParagraphs: [
            { content: "يسعدنا دعوتكم لحضور الحفل السنوي 2025، أمسية من الاحتفال والتواصل." },
            { content: "سيتضمن الحدث متحدثين بارزين وعشاء فاخر وترفيه حي." },
            { content: "يرجى تأكيد حضوركم قبل 10 مارس 2025." },
          ],
          cta: {
            text: "تأكيد الحضور",
            url: "https://example.com/rsvp",
          },
          postCtaText: "نتطلع لرؤيتكم هناك!",
        },
      }

      // Render preview
      const result = renderPreview(
        sampleContent,
        { id: input.templateId || "preview", name: "Preview", htmlTemplate, structure },
        workspace?.branding,
        eventBranding
      )

      return {
        html: result.html,
        subject: result.subject,
        text: result.text,
      }
    }),

  // Seed default master template for a workspace
  seedDefault: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: input.workspaceId,
        permissionName: PERMISSIONS.MANAGE_TEMPLATES,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage templates",
        })
      }

      // Check if a default already exists
      const existing = await db.query.emailMasterTemplates.findFirst({
        where: and(
          eq(emailMasterTemplates.workspaceId, input.workspaceId),
          isNull(emailMasterTemplates.eventId),
          eq(emailMasterTemplates.isDefault, true)
        ),
      })

      if (existing) {
        return { created: false, templateId: existing.id }
      }

      // Create default template
      const [template] = await db
        .insert(emailMasterTemplates)
        .values({
          workspaceId: input.workspaceId,
          name: "Default Email Template",
          description: "Standard bilingual email template with logo, accent strip, and footer",
          htmlTemplate: defaultMasterTemplate,
          structure: defaultMasterTemplateStructure,
          isDefault: true,
          isActive: true,
          createdBy: ctx.user.id,
        })
        .returning()

      return { created: true, templateId: template.id }
    }),
})
