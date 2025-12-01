import { db } from "@/server/db/config/database"
import {
  events,
  rsvpFormTemplates,
  workspaces,
  workspaceMembers,
} from "@/server/db/schemas"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import { and, desc, eq, isNull, or } from "drizzle-orm"
import { z } from "zod"

import { rsvpFormConfigSchema } from "@/lib/schemas"
import type { RsvpFormConfig, RsvpFormTemplateCategory } from "@/server/db/schemas"

const templateCategorySchema = z.enum([
  "corporate",
  "conference",
  "gala",
  "sports",
  "government",
  "wedding",
  "custom",
])

export const rsvpTemplatesRouter = createTRPCRouter({
  // Get all templates (system + workspace)
  getMany: protectedProcedure
    .input(
      z.object({
        workspaceSlug: z.string(),
        category: templateCategorySchema.optional(),
        includeSystem: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, input.workspaceSlug),
      })

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" })
      }

      // Check membership
      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, workspace.id),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" })
      }

      // Build conditions for query
      const conditions = [
        eq(rsvpFormTemplates.isActive, true),
        or(
          eq(rsvpFormTemplates.workspaceId, workspace.id),
          input.includeSystem ? eq(rsvpFormTemplates.isSystem, true) : undefined
        ),
      ].filter(Boolean)

      if (input.category) {
        conditions.push(eq(rsvpFormTemplates.category, input.category))
      }

      return db.query.rsvpFormTemplates.findMany({
        where: and(...conditions),
        orderBy: [desc(rsvpFormTemplates.isSystem), desc(rsvpFormTemplates.createdAt)],
        with: {
          creator: {
            columns: { id: true, name: true, image: true },
          },
        },
      })
    }),

  // Get single template
  getOne: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const template = await db.query.rsvpFormTemplates.findFirst({
        where: eq(rsvpFormTemplates.id, input.templateId),
        with: {
          workspace: true,
          creator: {
            columns: { id: true, name: true, image: true },
          },
        },
      })

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
      }

      // System templates are available to everyone
      if (template.isSystem) {
        return template
      }

      // Check membership for workspace templates
      if (template.workspaceId) {
        const isMember = await db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.workspaceId, template.workspaceId),
            eq(workspaceMembers.userId, ctx.user.id)
          ),
        })

        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" })
        }
      }

      return template
    }),

  // Create new template
  create: protectedProcedure
    .input(
      z.object({
        workspaceSlug: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        config: rsvpFormConfigSchema,
        category: templateCategorySchema.default("custom"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, input.workspaceSlug),
      })

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: workspace.id,
        permissionName: PERMISSIONS.MANAGE_TEMPLATES,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage templates",
        })
      }

      const [template] = await db
        .insert(rsvpFormTemplates)
        .values({
          workspaceId: workspace.id,
          name: input.name,
          description: input.description,
          config: input.config as RsvpFormConfig,
          category: input.category as RsvpFormTemplateCategory,
          isSystem: false,
          isActive: true,
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
        description: z.string().optional(),
        config: rsvpFormConfigSchema.optional(),
        category: templateCategorySchema.optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await db.query.rsvpFormTemplates.findFirst({
        where: eq(rsvpFormTemplates.id, input.templateId),
      })

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
      }

      // Cannot modify system templates
      if (template.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "System templates cannot be modified",
        })
      }

      if (!template.workspaceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Template has no associated workspace",
        })
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

      const { templateId, ...updateData } = input

      const cleanedData: Record<string, unknown> = { updatedAt: new Date() }
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          cleanedData[key] = value
        }
      }

      const [updated] = await db
        .update(rsvpFormTemplates)
        .set(cleanedData)
        .where(eq(rsvpFormTemplates.id, templateId))
        .returning()

      return updated
    }),

  // Delete template
  delete: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const template = await db.query.rsvpFormTemplates.findFirst({
        where: eq(rsvpFormTemplates.id, input.templateId),
      })

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
      }

      // Cannot delete system templates
      if (template.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "System templates cannot be deleted",
        })
      }

      if (!template.workspaceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Template has no associated workspace",
        })
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

      await db.delete(rsvpFormTemplates).where(eq(rsvpFormTemplates.id, input.templateId))

      return { success: true }
    }),

  // Duplicate template
  duplicate: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        workspaceSlug: z.string(),
        name: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sourceTemplate = await db.query.rsvpFormTemplates.findFirst({
        where: eq(rsvpFormTemplates.id, input.templateId),
      })

      if (!sourceTemplate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
      }

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, input.workspaceSlug),
      })

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: workspace.id,
        permissionName: PERMISSIONS.MANAGE_TEMPLATES,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage templates",
        })
      }

      const [template] = await db
        .insert(rsvpFormTemplates)
        .values({
          workspaceId: workspace.id,
          name: input.name || `${sourceTemplate.name} (Copy)`,
          description: sourceTemplate.description,
          config: sourceTemplate.config,
          category: sourceTemplate.category,
          isSystem: false,
          isActive: true,
          createdBy: ctx.user.id,
        })
        .returning()

      return template
    }),

  // Apply template to an event
  applyToEvent: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        eventId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await db.query.rsvpFormTemplates.findFirst({
        where: eq(rsvpFormTemplates.id, input.templateId),
      })

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
      }

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

      const [updated] = await db
        .update(events)
        .set({
          rsvpFormConfig: template.config,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.eventId))
        .returning()

      return { success: true, event: updated }
    }),

  // Save event's current form as a template
  saveFromEvent: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        name: z.string().min(1),
        description: z.string().optional(),
        category: templateCategorySchema.default("custom"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
        with: {
          workspace: true,
        },
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      if (!event.rsvpFormConfig) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Event does not have a form configuration",
        })
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

      const [template] = await db
        .insert(rsvpFormTemplates)
        .values({
          workspaceId: event.workspaceId,
          name: input.name,
          description: input.description,
          config: event.rsvpFormConfig,
          category: input.category as RsvpFormTemplateCategory,
          isSystem: false,
          isActive: true,
          createdBy: ctx.user.id,
        })
        .returning()

      return template
    }),
})
