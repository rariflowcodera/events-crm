import { db } from "@/server/db/config/database"
import { events, workspaces, workspaceMembers } from "@/server/db/schemas"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import {
  rsvpFormConfigSchema,
  bilingualTextSchema,
  customFieldDefinitionSchema,
  standardFieldConfigSchema,
} from "@/lib/schemas"
import {
  STANDARD_FIELDS,
  SECTION_DEFINITIONS,
  getFieldsForSection,
  createDefaultFormConfig,
  createMinimalFormConfig,
} from "@/lib/rsvp"
import type { RsvpFormConfig, RsvpFormSectionId } from "@/server/db/schemas/event"

const sectionIdSchema = z.enum(["personal_info", "logistics", "experience", "important_to_know"])

export const rsvpFormsRouter = createTRPCRouter({
  // Get form configuration for an event
  getFormConfig: protectedProcedure
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

      return {
        eventId: event.id,
        eventName: event.name,
        config: event.rsvpFormConfig ?? createDefaultFormConfig(),
      }
    }),

  // Update entire form configuration
  updateFormConfig: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        config: rsvpFormConfigSchema,
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

      const [updated] = await db
        .update(events)
        .set({
          rsvpFormConfig: input.config as RsvpFormConfig,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.eventId))
        .returning()

      return { success: true, event: updated }
    }),

  // Get standard fields library (for form builder)
  getStandardFields: protectedProcedure.query(async () => {
    return {
      fields: STANDARD_FIELDS,
      sections: SECTION_DEFINITIONS,
      fieldsBySection: {
        personal_info: getFieldsForSection("personal_info"),
        logistics: getFieldsForSection("logistics"),
        experience: getFieldsForSection("experience"),
        important_to_know: getFieldsForSection("important_to_know"),
      },
    }
  }),

  // Toggle section enabled/disabled
  toggleSection: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        sectionId: sectionIdSchema,
        enabled: z.boolean(),
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

      const config = event.rsvpFormConfig ?? createDefaultFormConfig()
      const sectionIndex = config.sections.findIndex((s) => s.id === input.sectionId)

      if (sectionIndex === -1) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" })
      }

      config.sections[sectionIndex].enabled = input.enabled

      const [updated] = await db
        .update(events)
        .set({
          rsvpFormConfig: config,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.eventId))
        .returning()

      return { success: true, config: updated.rsvpFormConfig }
    }),

  // Toggle standard field enabled/disabled
  toggleStandardField: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        sectionId: sectionIdSchema,
        fieldKey: z.string(),
        enabled: z.boolean(),
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

      const config = event.rsvpFormConfig ?? createDefaultFormConfig()
      const section = config.sections.find((s) => s.id === input.sectionId)

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" })
      }

      const fieldIndex = section.standardFields.findIndex((f) => f.fieldKey === input.fieldKey)

      if (fieldIndex === -1) {
        // Field doesn't exist in config, add it
        section.standardFields.push({
          fieldKey: input.fieldKey,
          enabled: input.enabled,
          required: false,
        })
      } else {
        section.standardFields[fieldIndex].enabled = input.enabled
      }

      const [updated] = await db
        .update(events)
        .set({
          rsvpFormConfig: config,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.eventId))
        .returning()

      return { success: true, config: updated.rsvpFormConfig }
    }),

  // Update standard field configuration
  updateStandardField: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        sectionId: sectionIdSchema,
        fieldKey: z.string(),
        config: standardFieldConfigSchema.partial(),
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

      const formConfig = event.rsvpFormConfig ?? createDefaultFormConfig()
      const section = formConfig.sections.find((s) => s.id === input.sectionId)

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" })
      }

      const fieldIndex = section.standardFields.findIndex((f) => f.fieldKey === input.fieldKey)

      if (fieldIndex === -1) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Field not found" })
      }

      section.standardFields[fieldIndex] = {
        ...section.standardFields[fieldIndex],
        ...input.config,
      }

      const [updated] = await db
        .update(events)
        .set({
          rsvpFormConfig: formConfig,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.eventId))
        .returning()

      return { success: true, config: updated.rsvpFormConfig }
    }),

  // Add custom field to a section
  addCustomField: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        sectionId: sectionIdSchema,
        field: customFieldDefinitionSchema,
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

      const config = event.rsvpFormConfig ?? createDefaultFormConfig()
      const section = config.sections.find((s) => s.id === input.sectionId)

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" })
      }

      // Generate ID and set sort order
      const newField = {
        ...input.field,
        id: input.field.id || crypto.randomUUID(),
        sortOrder: input.field.sortOrder ?? section.customFields.length,
      }

      section.customFields.push(newField)

      const [updated] = await db
        .update(events)
        .set({
          rsvpFormConfig: config,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.eventId))
        .returning()

      return { success: true, fieldId: newField.id, config: updated.rsvpFormConfig }
    }),

  // Update custom field
  updateCustomField: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        sectionId: sectionIdSchema,
        fieldId: z.string(),
        field: customFieldDefinitionSchema.partial(),
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

      const config = event.rsvpFormConfig ?? createDefaultFormConfig()
      const section = config.sections.find((s) => s.id === input.sectionId)

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" })
      }

      const fieldIndex = section.customFields.findIndex((f) => f.id === input.fieldId)

      if (fieldIndex === -1) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Custom field not found" })
      }

      section.customFields[fieldIndex] = {
        ...section.customFields[fieldIndex],
        ...input.field,
      }

      const [updated] = await db
        .update(events)
        .set({
          rsvpFormConfig: config,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.eventId))
        .returning()

      return { success: true, config: updated.rsvpFormConfig }
    }),

  // Delete custom field
  deleteCustomField: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        sectionId: sectionIdSchema,
        fieldId: z.string(),
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

      const config = event.rsvpFormConfig ?? createDefaultFormConfig()
      const section = config.sections.find((s) => s.id === input.sectionId)

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" })
      }

      const fieldIndex = section.customFields.findIndex((f) => f.id === input.fieldId)

      if (fieldIndex === -1) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Custom field not found" })
      }

      section.customFields.splice(fieldIndex, 1)

      // Re-order remaining fields
      section.customFields.forEach((f, i) => {
        f.sortOrder = i
      })

      const [updated] = await db
        .update(events)
        .set({
          rsvpFormConfig: config,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.eventId))
        .returning()

      return { success: true, config: updated.rsvpFormConfig }
    }),

  // Reorder sections
  reorderSections: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        sectionIds: z.array(sectionIdSchema),
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

      const config = event.rsvpFormConfig ?? createDefaultFormConfig()

      // Create a map of sections by ID
      const sectionMap = new Map(config.sections.map((s) => [s.id, s]))

      // Reorder sections based on input
      config.sections = input.sectionIds.map((id, index) => {
        const section = sectionMap.get(id)
        if (!section) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Section ${id} not found` })
        }
        return { ...section, sortOrder: index }
      })

      const [updated] = await db
        .update(events)
        .set({
          rsvpFormConfig: config,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.eventId))
        .returning()

      return { success: true, config: updated.rsvpFormConfig }
    }),

  // Reorder custom fields within a section
  reorderCustomFields: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        sectionId: sectionIdSchema,
        fieldIds: z.array(z.string()),
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

      const config = event.rsvpFormConfig ?? createDefaultFormConfig()
      const section = config.sections.find((s) => s.id === input.sectionId)

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" })
      }

      // Create a map of fields by ID
      const fieldMap = new Map(section.customFields.map((f) => [f.id, f]))

      // Reorder fields based on input
      section.customFields = input.fieldIds.map((id, index) => {
        const field = fieldMap.get(id)
        if (!field) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Field ${id} not found` })
        }
        return { ...field, sortOrder: index }
      })

      const [updated] = await db
        .update(events)
        .set({
          rsvpFormConfig: config,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.eventId))
        .returning()

      return { success: true, config: updated.rsvpFormConfig }
    }),

  // Update form settings
  updateSettings: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        settings: z.object({
          allowAmendments: z.boolean().optional(),
          showProgressIndicator: z.boolean().optional(),
          confirmationMessage: bilingualTextSchema.optional(),
          declineMessage: bilingualTextSchema.optional(),
          maybeMessage: bilingualTextSchema.optional(),
          submitButtonText: bilingualTextSchema.optional(),
        }),
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

      const config = event.rsvpFormConfig ?? createDefaultFormConfig()
      config.settings = {
        ...config.settings,
        ...input.settings,
      }

      const [updated] = await db
        .update(events)
        .set({
          rsvpFormConfig: config,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.eventId))
        .returning()

      return { success: true, config: updated.rsvpFormConfig }
    }),

  // Initialize form with default config
  initializeDefault: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        template: z.enum(["default", "minimal"]).default("default"),
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

      const config =
        input.template === "minimal" ? createMinimalFormConfig() : createDefaultFormConfig()

      const [updated] = await db
        .update(events)
        .set({
          rsvpFormConfig: config,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.eventId))
        .returning()

      return { success: true, config: updated.rsvpFormConfig }
    }),
})
