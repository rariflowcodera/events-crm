import { db } from "@/server/db/config/database"
import { events, workspaces, workspaceMembers, users, guestCategories, emailTemplates, guestListViews } from "@/server/db/schemas"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/email/default-templates"
import { GUEST_COLUMNS, type GuestListViewConfig } from "@/lib/guest-columns"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import { and, desc, eq, ne, getTableColumns, sql } from "drizzle-orm"
import { z } from "zod"
import { randomBytes } from "crypto"
import dns from "dns/promises"

import { slugify } from "@/lib/utils"
import { resolveBranding } from "@/lib/branding"
import { eventBrandingSchema } from "@/lib/schemas"
import { invalidateDomainCache, isValidDomainFormat } from "@/lib/domain"

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
        orderBy: [sql`${events.startDate} ASC NULLS LAST`],
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

      // Create default email templates for the new event
      const templateInserts = DEFAULT_EMAIL_TEMPLATES.map((template) => ({
        eventId: event.id,
        name: template.name,
        type: template.type,
        content: template.content,
        defaultLanguage: "en" as const,
        isDefault: true,
        isActive: true,
        createdBy: ctx.user.id,
      }))

      await db.insert(emailTemplates).values(templateInserts)

      // Create default Check-in view for the new event
      const checkInViewConfig: GuestListViewConfig = {
        columns: [
          { id: "select", visible: true, width: 48 },
          { id: "checkedIn", visible: true, width: 90 },
          { id: "fullName", visible: true, width: 180 },
          { id: "category", visible: true, width: 100 },
          { id: "status", visible: true, width: 110 },
          { id: "entity", visible: true, width: 150 },
          { id: "checkedInAt", visible: true, width: 140 },
          // Include all other columns as hidden
          ...GUEST_COLUMNS
            .filter(c => !["select", "checkedIn", "fullName", "category", "status", "entity", "checkedInAt", "actions"].includes(c.id))
            .map(c => ({ id: c.id, visible: false, width: c.defaultWidth })),
          { id: "actions", visible: true, width: 50 },
        ],
        filters: {
          status: ["confirmed", "maybe", "reminded", "viewed", "invited"],
        },
        sorting: [{ column: "fullName", direction: "asc" }],
      }

      await db.insert(guestListViews).values({
        eventId: event.id,
        name: "Check-in",
        description: "On-site check-in view for event day operations",
        config: checkInViewConfig,
        visibleToRoles: ["owner", "admin", "manager", "member"],
        color: "orange",
        isPinned: true,
        pinOrder: 1,
        isSystem: true,
        createdBy: ctx.user.id,
      })

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
            emailSettings: z
              .object({
                fromEmail: z.string().email().optional(),
                fromName: z.string().max(100).optional(),
              })
              .optional(),
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

  // ============================================================================
  // Custom Domain Management
  // ============================================================================

  // Update custom domain for event
  updateCustomDomain: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        customDomain: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { eventId, customDomain } = input
      const normalizedDomain = customDomain.toLowerCase().trim()

      // Validate domain format
      if (!isValidDomainFormat(normalizedDomain)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid domain format. Please enter a valid domain (e.g., events.example.com)",
        })
      }

      // Get event and check permissions
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

      // Check if domain is already in use by another event
      const existingEvent = await db.query.events.findFirst({
        where: and(
          eq(events.customDomain, normalizedDomain),
          ne(events.id, eventId)
        ),
      })

      if (existingEvent) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This domain is already in use by another event",
        })
      }

      // Invalidate old domain cache if changing
      if (event.customDomain && event.customDomain !== normalizedDomain) {
        await invalidateDomainCache(event.customDomain)
      }

      // Generate verification token
      const verificationToken = randomBytes(32).toString("hex")

      const [updated] = await db
        .update(events)
        .set({
          customDomain: normalizedDomain,
          customDomainVerified: false,
          customDomainVerifiedAt: null,
          customDomainVerificationToken: verificationToken,
          updatedAt: new Date(),
        })
        .where(eq(events.id, eventId))
        .returning()

      return {
        customDomain: updated.customDomain,
        verificationToken,
        message: "Custom domain added. Please configure DNS and verify.",
      }
    }),

  // Verify custom domain DNS configuration
  verifyCustomDomain: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { eventId } = input

      const event = await db.query.events.findFirst({
        where: eq(events.id, eventId),
      })

      if (!event || !event.customDomain) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event or custom domain not found",
        })
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

      // Get main app domain for CNAME verification
      const mainAppDomain = process.env.NEXT_PUBLIC_APP_URL
        ? new URL(process.env.NEXT_PUBLIC_APP_URL).host
        : null

      if (!mainAppDomain) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Main app domain not configured",
        })
      }

      try {
        // Check CNAME or A record
        let hasValidDns = false
        let dnsError = ""

        // Try CNAME first
        try {
          const cnameRecords = await dns.resolveCname(event.customDomain)
          hasValidDns = cnameRecords.some((record) =>
            record.toLowerCase().includes(mainAppDomain.toLowerCase())
          )
          if (!hasValidDns) {
            dnsError = `CNAME record found but points to ${cnameRecords.join(", ")} instead of ${mainAppDomain}`
          }
        } catch (cnameErr) {
          // CNAME not found, try A record
          try {
            const aRecords = await dns.resolve4(event.customDomain)
            // For A records, we can't easily verify they point to us
            // Just check that the domain resolves
            if (aRecords.length > 0) {
              hasValidDns = true
            }
          } catch {
            dnsError = `No DNS records found for ${event.customDomain}. Please configure a CNAME record pointing to ${mainAppDomain}`
          }
        }

        if (!hasValidDns && dnsError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: dnsError,
          })
        }

        // Check TXT verification record
        const txtRecordName = `_events-verify.${event.customDomain}`
        let hasTxtRecord = false

        try {
          const txtRecords = await dns.resolveTxt(txtRecordName)
          hasTxtRecord = txtRecords.some((records) =>
            records.some((record) => record === event.customDomainVerificationToken)
          )
        } catch {
          // TXT record not found
        }

        if (!hasTxtRecord) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `TXT verification record not found. Please add a TXT record with name "_events-verify" and value "${event.customDomainVerificationToken}"`,
          })
        }

        // Mark as verified
        await db
          .update(events)
          .set({
            customDomainVerified: true,
            customDomainVerifiedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(events.id, eventId))

        // Invalidate cache to pick up verified status
        await invalidateDomainCache(event.customDomain)

        return { success: true, message: "Domain verified successfully!" }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "DNS verification failed",
        })
      }
    }),

  // Remove custom domain from event
  removeCustomDomain: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { eventId } = input

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

      // Invalidate cache before removing
      if (event.customDomain) {
        await invalidateDomainCache(event.customDomain)
      }

      await db
        .update(events)
        .set({
          customDomain: null,
          customDomainVerified: false,
          customDomainVerifiedAt: null,
          customDomainVerificationToken: null,
          updatedAt: new Date(),
        })
        .where(eq(events.id, eventId))

      return { success: true, message: "Custom domain removed" }
    }),
})
