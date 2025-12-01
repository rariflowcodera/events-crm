import { db } from "@/server/db/config/database"
import { events, workspaces, workspaceMembers, users, guestCategories } from "@/server/db/schemas"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import { and, desc, eq, getTableColumns } from "drizzle-orm"
import { z } from "zod"

import { slugify } from "@/lib/utils"
import { resolveBranding } from "@/lib/branding"
import { eventBrandingSchema } from "@/lib/schemas"

const eventStatusValues = [
  "draft",
  "planning",
  "invitations_sent",
  "rsvp_open",
  "rsvp_closed",
  "in_progress",
  "completed",
  "cancelled",
] as const

export const eventsRouter = createTRPCRouter({
  // Get all events for a workspace
  getMany: protectedProcedure
    .input(z.object({ workspaceSlug: z.string() }))
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

      return db.query.events.findMany({
        where: eq(events.workspaceId, workspace.id),
        orderBy: [desc(events.createdAt)],
        with: {
          creator: {
            columns: { id: true, name: true, image: true },
          },
        },
      })
    }),

  // Get single event with categories
  getOne: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
        with: {
          workspace: true,
          creator: {
            columns: { id: true, name: true, image: true },
          },
        },
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

      // Get categories separately
      const categories = await db.query.guestCategories.findMany({
        where: eq(guestCategories.eventId, event.id),
        orderBy: [guestCategories.sortOrder],
      })

      return {
        ...event,
        guestCategories: categories,
      }
    }),

  // Get event by slug within a workspace
  getBySlug: protectedProcedure
    .input(
      z.object({
        workspaceSlug: z.string(),
        eventSlug: z.string(),
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

      const event = await db.query.events.findFirst({
        where: and(eq(events.workspaceId, workspace.id), eq(events.slug, input.eventSlug)),
        with: {
          workspace: true,
          creator: {
            columns: { id: true, name: true, image: true },
          },
        },
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      // Get categories
      const categories = await db.query.guestCategories.findMany({
        where: eq(guestCategories.eventId, event.id),
        orderBy: [guestCategories.sortOrder],
      })

      return {
        ...event,
        guestCategories: categories,
      }
    }),

  // Create event
  create: protectedProcedure
    .input(
      z.object({
        workspaceSlug: z.string(),
        name: z.string().min(1),
        slug: z.string().min(3).optional(),
        description: z.string().optional(),
        eventType: z.string().optional(),
        venue: z.string().optional(),
        venueAddress: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        rsvpDeadline: z.date().optional(),
        maxGuests: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, input.workspaceSlug),
      })

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" })
      }

      const canCreate = await hasPermission({
        userId: ctx.user.id,
        workspaceId: workspace.id,
        permissionName: PERMISSIONS.CREATE_EVENT,
      })

      if (!canCreate) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to create events",
        })
      }

      // Generate slug from name if not provided
      const eventSlug = input.slug ? slugify(input.slug) : slugify(input.name)

      // Check if slug already exists in this workspace
      const existingEvent = await db.query.events.findFirst({
        where: and(eq(events.workspaceId, workspace.id), eq(events.slug, eventSlug)),
      })

      if (existingEvent) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An event with this slug already exists in this workspace",
        })
      }

      const [event] = await db
        .insert(events)
        .values({
          workspaceId: workspace.id,
          name: input.name,
          slug: eventSlug,
          description: input.description,
          eventType: input.eventType,
          venue: input.venue,
          venueAddress: input.venueAddress,
          startDate: input.startDate,
          endDate: input.endDate,
          rsvpDeadline: input.rsvpDeadline,
          maxGuests: input.maxGuests,
          createdBy: ctx.user.id,
        })
        .returning()

      return event
    }),

  // Update event
  update: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        eventType: z.string().optional(),
        venue: z.string().optional(),
        venueAddress: z.string().optional(),
        startDate: z.date().nullable().optional(),
        endDate: z.date().nullable().optional(),
        rsvpDeadline: z.date().nullable().optional(),
        maxGuests: z.number().int().positive().nullable().optional(),
        status: z.enum(eventStatusValues).optional(),
        branding: z
          .object({
            logo: z.string().optional(),
            logoDark: z.string().optional(),
            primaryColor: z.string().optional(),
            secondaryColor: z.string().optional(),
            backgroundImage: z.string().optional(),
          })
          .optional(),
        settings: z
          .object({
            allowPlusOne: z.boolean().optional(),
            maxPlusOnes: z.number().optional(),
            requireApproval: z.boolean().optional(),
            sendReminders: z.boolean().optional(),
            reminderDays: z.array(z.number()).optional(),
          })
          .optional(),
        rsvpFormConfig: z
          .object({
            fields: z
              .array(
                z.object({
                  id: z.string(),
                  type: z.enum(["text", "select", "checkbox", "radio", "textarea", "date"]),
                  label: z.object({
                    en: z.string(),
                    ar: z.string().optional(),
                  }),
                  required: z.boolean(),
                  options: z
                    .array(
                      z.object({
                        value: z.string(),
                        label: z.object({
                          en: z.string(),
                          ar: z.string().optional(),
                        }),
                      })
                    )
                    .optional(),
                  conditionalOnCategory: z.array(z.string()).optional(),
                })
              )
              .optional(),
            confirmationMessage: z
              .object({
                en: z.string(),
                ar: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
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

      const { eventId, ...updateData } = input

      // Filter out undefined values and cast for Drizzle compatibility
      const cleanedData: Record<string, unknown> = { updatedAt: new Date() }
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          cleanedData[key] = value
        }
      }

      const [updated] = await db
        .update(events)
        .set(cleanedData)
        .where(eq(events.id, eventId))
        .returning()

      return updated
    }),

  // Get event branding with inheritance resolution
  getBranding: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
        with: {
          workspace: {
            columns: {
              id: true,
              name: true,
              branding: true,
              logo: true,
            },
          },
        },
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

      // Build workspace branding with legacy logo fallback
      const workspaceBranding = {
        ...event.workspace.branding,
        logo: event.workspace.branding?.logo ?? event.workspace.logo ?? undefined,
      }

      return {
        eventBranding: event.branding,
        workspaceBranding,
        workspaceName: event.workspace.name,
        resolved: resolveBranding(workspaceBranding, event.branding),
      }
    }),

  // Update event branding (null = reset to workspace defaults)
  updateBranding: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        branding: eventBrandingSchema.nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { eventId, branding } = input

      const event = await db.query.events.findFirst({
        where: eq(events.id, eventId),
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
          branding,
          updatedAt: new Date(),
        })
        .where(eq(events.id, eventId))
        .returning({
          id: events.id,
          branding: events.branding,
        })

      return {
        message:
          branding === null
            ? "Event branding reset to workspace defaults"
            : "Event branding updated successfully",
        branding: updated.branding,
      }
    }),

  // Delete event
  delete: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
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
        permissionName: PERMISSIONS.DELETE_EVENT,
      })

      if (!canDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this event",
        })
      }

      await db.delete(events).where(eq(events.id, input.eventId))

      return { success: true }
    }),
})
