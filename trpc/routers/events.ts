import { db } from "@/server/db/config/database"
import {
  events,
  workspaces,
  workspaceMembers,
  users,
  guestCategories,
  emailTemplates,
  guestListViews,
  eventForms,
  eventDocuments,
  itineraryTemplates,
  itineraryItems,
  inventoryTypes,
  workflows,
  workflowSteps,
  emailMasterTemplates,
  type EventBranding,
  type EmailBrandingConfig,
} from "@/server/db/schemas"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/email/default-templates"
import { GUEST_COLUMNS, type GuestListViewConfig } from "@/lib/guest-columns"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import { and, desc, eq, getTableColumns, sql, isNotNull } from "drizzle-orm"
import { z } from "zod"
import { randomBytes } from "crypto"
import dns from "dns/promises"

import { slugify } from "@/lib/utils"
import { resolveBranding } from "@/lib/branding"
import { eventBrandingSchema } from "@/lib/schemas"
import { invalidateDomainCache, isValidDomainFormat } from "@/lib/domain"
import {
  createEmptyMapping,
  createEmptyStats,
  generateUniqueEventSlug,
  generateUniqueFormSlug,
  remapCategoryId,
  remapCategoryIds,
  remapDocumentReferences,
  remapGuestListViewConfig,
  remapWorkflowTriggerConditions,
  remapWorkflowStepActionConfig,
  enforceDependencies,
  type DuplicationMapping,
  type DuplicationStats,
} from "@/lib/event-duplication"

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
        nameAr: z.string().max(100).optional(),
        slug: z.string().min(3).optional(),
        description: z.string().optional(),
        eventType: z.string().optional(),
        venue: z.string().optional(),
        venueAddress: z.string().optional(),
        // Location coordinates from Google Places
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        placeId: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        isSingleDay: z.boolean().optional(),
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
          nameAr: input.nameAr,
          slug: eventSlug,
          description: input.description,
          eventType: input.eventType,
          venue: input.venue,
          venueAddress: input.venueAddress,
          latitude: input.latitude,
          longitude: input.longitude,
          placeId: input.placeId,
          city: input.city,
          country: input.country,
          startDate: input.startDate,
          endDate: input.endDate,
          startTime: input.startTime,
          endTime: input.endTime,
          isSingleDay: input.isSingleDay,
          rsvpDeadline: input.rsvpDeadline,
          maxGuests: input.maxGuests,
          createdBy: ctx.user.id,
        })
        .returning()

      // Create default email templates for the new event (using structured content)
      const templateInserts = DEFAULT_EMAIL_TEMPLATES.map((template) => ({
        eventId: event.id,
        name: template.name,
        type: template.type,
        // Placeholder content for backwards compatibility
        content: {
          en: {
            subject: template.structuredContent.en.subject,
            htmlContent: "<p>This template uses structured content mode.</p>",
          },
          ar: template.structuredContent.ar
            ? {
                subject: template.structuredContent.ar.subject,
                htmlContent: "<p>هذا القالب يستخدم وضع المحتوى المنظم.</p>",
              }
            : undefined,
        },
        // Structured content takes precedence during rendering
        structuredContent: template.structuredContent,
        defaultLanguage: "en" as const,
        isDefault: true,
        isActive: true,
        createdBy: ctx.user.id,
      }))

      await db.insert(emailTemplates).values(templateInserts)

      // Create default Attendance view for the new event
      const attendanceViewConfig: GuestListViewConfig = {
        columns: [
          { id: "select", visible: true, width: 48 },
          { id: "attended", visible: true, width: 90 },
          { id: "fullName", visible: true, width: 180 },
          { id: "category", visible: true, width: 100 },
          { id: "status", visible: true, width: 110 },
          { id: "entity", visible: true, width: 150 },
          { id: "attendedAt", visible: true, width: 140 },
          // Include all other columns as hidden
          ...GUEST_COLUMNS
            .filter(c => !["select", "attended", "fullName", "category", "status", "entity", "attendedAt", "actions"].includes(c.id))
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
        name: "Attendance",
        description: "On-site attendance view for event day operations",
        config: attendanceViewConfig,
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
        nameAr: z.string().max(100).nullable().optional(),
        description: z.string().optional(),
        eventType: z.string().optional(),
        venue: z.string().optional(),
        venueAddress: z.string().optional(),
        // Location coordinates from Google Places
        latitude: z.string().nullable().optional(),
        longitude: z.string().nullable().optional(),
        placeId: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
        startDate: z.date().nullable().optional(),
        endDate: z.date().nullable().optional(),
        startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable().optional(),
        endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable().optional(),
        isSingleDay: z.boolean().nullable().optional(),
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
            vapp: z
              .object({
                enabled: z.boolean().optional(),
                venueCode: z.string().max(10).optional(),
                matchCode: z.string().max(10).optional(),
                nextSequence: z.number().int().positive().optional(),
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

      // Merge settings with existing settings to prevent overwriting nested objects
      // (e.g., saving VAPP settings should not wipe out emailSettings)
      if (updateData.settings !== undefined) {
        cleanedData.settings = {
          ...event.settings,
          ...updateData.settings,
          // Handle nested objects that need merging
          vapp:
            updateData.settings.vapp !== undefined
              ? { ...event.settings?.vapp, ...updateData.settings.vapp }
              : event.settings?.vapp,
          emailSettings:
            updateData.settings.emailSettings !== undefined
              ? updateData.settings.emailSettings // Allow explicit override/null
              : event.settings?.emailSettings,
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

      // If branding is null, reset to workspace defaults
      if (branding === null) {
        const [updated] = await db
          .update(events)
          .set({ branding: null, updatedAt: new Date() })
          .where(eq(events.id, eventId))
          .returning({ id: events.id, branding: events.branding })

        return {
          message: "Event branding reset to workspace defaults",
          branding: updated.branding,
        }
      }

      // Merge with existing branding to prevent losing existing settings
      const existingBranding = (event.branding ?? {}) as EventBranding
      const mergedEmailBranding: EmailBrandingConfig | undefined =
        branding.emailBranding !== undefined
          ? { ...existingBranding.emailBranding, ...branding.emailBranding }
          : existingBranding.emailBranding

      const mergedBranding: EventBranding = {
        ...existingBranding,
        ...branding,
        // Deep merge emailBranding to preserve existing email settings
        emailBranding: mergedEmailBranding,
      }

      const [updated] = await db
        .update(events)
        .set({
          branding: mergedBranding,
          updatedAt: new Date(),
        })
        .where(eq(events.id, eventId))
        .returning({
          id: events.id,
          branding: events.branding,
        })

      return {
        message: "Event branding updated successfully",
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

  // ============================================================================
  // Event Duplication
  // ============================================================================

  // Duplicate an event with all its configuration
  duplicate: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        options: z
          .object({
            includeCategories: z.boolean().default(true),
            includeEmailTemplates: z.boolean().default(true),
            includeGuestListViews: z.boolean().default(true),
            includeEventForms: z.boolean().default(true),
            includeDocuments: z.boolean().default(true),
            includeItineraries: z.boolean().default(true),
            includeInventoryTypes: z.boolean().default(true),
            includeWorkflows: z.boolean().default(true),
            includeMasterTemplates: z.boolean().default(true),
          })
          .default({}),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get source event
      const sourceEvent = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!sourceEvent) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      // Check permission to create events in this workspace
      const canCreate = await hasPermission({
        userId: ctx.user.id,
        workspaceId: sourceEvent.workspaceId,
        permissionName: PERMISSIONS.CREATE_EVENT,
      })

      if (!canCreate) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to create events in this workspace",
        })
      }

      // Enforce dependencies (e.g., categories required for templates)
      const options = enforceDependencies(input.options)

      // Generate new event name and slug
      const newName = input.name || `${sourceEvent.name} (Copy)`
      const newSlug = await generateUniqueEventSlug(sourceEvent.workspaceId, sourceEvent.slug)

      // Execute all operations in a transaction
      const result = await db.transaction(async (tx) => {
        const mapping = createEmptyMapping()
        const stats = createEmptyStats()

        // 1. Create the new event
        const [newEvent] = await tx
          .insert(events)
          .values({
            workspaceId: sourceEvent.workspaceId,
            name: newName,
            nameAr: sourceEvent.nameAr,
            slug: newSlug,
            description: sourceEvent.description,
            eventType: sourceEvent.eventType,
            venue: sourceEvent.venue,
            venueAddress: sourceEvent.venueAddress,
            latitude: sourceEvent.latitude,
            longitude: sourceEvent.longitude,
            placeId: sourceEvent.placeId,
            city: sourceEvent.city,
            country: sourceEvent.country,
            startDate: sourceEvent.startDate,
            endDate: sourceEvent.endDate,
            timezone: sourceEvent.timezone,
            startTime: sourceEvent.startTime,
            endTime: sourceEvent.endTime,
            isSingleDay: sourceEvent.isSingleDay,
            rsvpDeadline: sourceEvent.rsvpDeadline,
            rsvpFormConfig: sourceEvent.rsvpFormConfig,
            maxGuests: sourceEvent.maxGuests,
            branding: sourceEvent.branding,
            settings: sourceEvent.settings,
            status: "draft", // Always start as draft
            customDomain: null, // Reset custom domain
            customDomainVerified: false,
            customDomainVerifiedAt: null,
            customDomainVerificationToken: null,
            createdBy: ctx.user.id,
          })
          .returning()

        // 2. Duplicate guest categories (if included)
        if (options.includeCategories) {
          const sourceCategories = await tx.query.guestCategories.findMany({
            where: eq(guestCategories.eventId, sourceEvent.id),
            orderBy: [guestCategories.sortOrder],
          })

          for (const category of sourceCategories) {
            const [newCategory] = await tx
              .insert(guestCategories)
              .values({
                eventId: newEvent.id,
                name: category.name,
                code: category.code,
                description: category.description,
                sortOrder: category.sortOrder,
                color: category.color,
                serviceAllocations: category.serviceAllocations,
                rsvpPageConfig: category.rsvpPageConfig,
                isActive: category.isActive,
                // Don't copy defaultEmailTemplateId - it will be remapped later if needed
              })
              .returning()

            mapping.categoryIdMap.set(category.id, newCategory.id)
            stats.categoriesCopied++
          }
        }

        // 3. Duplicate event documents (if included) - MUST come before email templates
        // so document IDs can be remapped in template content
        if (options.includeDocuments) {
          const sourceDocs = await tx.query.eventDocuments.findMany({
            where: eq(eventDocuments.eventId, sourceEvent.id),
          })

          for (const doc of sourceDocs) {
            const [newDoc] = await tx
              .insert(eventDocuments)
              .values({
                eventId: newEvent.id,
                name: doc.name,
                fileName: doc.fileName,
                url: doc.url, // URL points to same file - documents are shared
                mimeType: doc.mimeType,
                fileSize: doc.fileSize,
                type: doc.type,
                categoryIds: remapCategoryIds(doc.categoryIds, mapping),
                createdBy: ctx.user.id,
              })
              .returning()

            // Track document ID mapping for remapping references in email templates
            mapping.documentIdMap.set(doc.id, newDoc.id)
            stats.documentsCopied++
          }
        }

        // 4. Duplicate email templates (if included)
        if (options.includeEmailTemplates) {
          const sourceTemplates = await tx.query.emailTemplates.findMany({
            where: eq(emailTemplates.eventId, sourceEvent.id),
          })

          for (const template of sourceTemplates) {
            // Remap document references in structured content if documents were duplicated
            const remappedStructuredContent = options.includeDocuments
              ? remapDocumentReferences(template.structuredContent, mapping)
              : template.structuredContent

            const [newTemplate] = await tx
              .insert(emailTemplates)
              .values({
                eventId: newEvent.id,
                name: template.name,
                type: template.type,
                categoryId: remapCategoryId(template.categoryId, mapping),
                content: template.content,
                structuredContent: remappedStructuredContent,
                masterTemplateId: template.masterTemplateId, // Will be remapped if master templates are duplicated
                defaultLanguage: template.defaultLanguage,
                fromName: template.fromName,
                fromEmail: template.fromEmail,
                replyTo: template.replyTo,
                attachments: template.attachments,
                availableVariables: template.availableVariables,
                isActive: template.isActive,
                isDefault: template.isDefault,
                createdBy: ctx.user.id,
              })
              .returning()

            mapping.emailTemplateIdMap.set(template.id, newTemplate.id)
            stats.emailTemplatesCopied++
          }
        }

        // 5. Duplicate master templates (event-level only, if included)
        if (options.includeMasterTemplates) {
          const sourceMasterTemplates = await tx.query.emailMasterTemplates.findMany({
            where: and(
              eq(emailMasterTemplates.workspaceId, sourceEvent.workspaceId),
              eq(emailMasterTemplates.eventId, sourceEvent.id)
            ),
          })

          for (const masterTemplate of sourceMasterTemplates) {
            const [newMasterTemplate] = await tx
              .insert(emailMasterTemplates)
              .values({
                workspaceId: sourceEvent.workspaceId,
                eventId: newEvent.id,
                name: masterTemplate.name,
                description: masterTemplate.description,
                htmlTemplate: masterTemplate.htmlTemplate,
                structure: masterTemplate.structure,
                isDefault: masterTemplate.isDefault,
                isActive: masterTemplate.isActive,
                createdBy: ctx.user.id,
              })
              .returning()

            mapping.masterTemplateIdMap.set(masterTemplate.id, newMasterTemplate.id)
            stats.masterTemplatesCopied++
          }

          // Update email templates to use new master template IDs
          if (stats.emailTemplatesCopied > 0 && stats.masterTemplatesCopied > 0) {
            for (const [oldId, newId] of mapping.masterTemplateIdMap) {
              await tx
                .update(emailTemplates)
                .set({ masterTemplateId: newId })
                .where(
                  and(
                    eq(emailTemplates.eventId, newEvent.id),
                    eq(emailTemplates.masterTemplateId, oldId)
                  )
                )
            }
          }
        }

        // 6. Duplicate guest list views (if included)
        if (options.includeGuestListViews) {
          const sourceViews = await tx.query.guestListViews.findMany({
            where: eq(guestListViews.eventId, sourceEvent.id),
          })

          for (const view of sourceViews) {
            await tx.insert(guestListViews).values({
              eventId: newEvent.id,
              name: view.name,
              description: view.description,
              config: remapGuestListViewConfig(view.config, mapping),
              visibleToRoles: view.visibleToRoles,
              color: view.color,
              isPinned: view.isPinned,
              pinOrder: view.pinOrder,
              isSystem: view.isSystem,
              isDefault: view.isDefault,
              createdBy: ctx.user.id,
            })

            stats.guestListViewsCopied++
          }
        }

        // 7. Duplicate event forms (if included)
        if (options.includeEventForms) {
          const sourceForms = await tx.query.eventForms.findMany({
            where: eq(eventForms.eventId, sourceEvent.id),
          })

          for (const form of sourceForms) {
            // Generate unique slug for the new event
            const newFormSlug = await generateUniqueFormSlug(newEvent.id, form.slug, tx)

            await tx.insert(eventForms).values({
              eventId: newEvent.id,
              workspaceId: sourceEvent.workspaceId,
              name: form.name,
              slug: newFormSlug,
              description: form.description,
              purpose: form.purpose,
              formConfig: form.formConfig,
              accessType: form.accessType,
              visibleToCategories: remapCategoryIds(form.visibleToCategories, mapping),
              allowMultipleSubmissions: form.allowMultipleSubmissions,
              allowAmendments: form.allowAmendments,
              isPublished: false, // Don't auto-publish duplicated forms
              shortCode: null, // Generate new short code when published
              createdBy: ctx.user.id,
            })

            stats.eventFormsCopied++
          }
        }

        // 8. Duplicate itinerary templates and items (if included)
        if (options.includeItineraries) {
          const sourceItinTemplates = await tx.query.itineraryTemplates.findMany({
            where: eq(itineraryTemplates.eventId, sourceEvent.id),
          })

          for (const template of sourceItinTemplates) {
            const [newTemplate] = await tx
              .insert(itineraryTemplates)
              .values({
                eventId: newEvent.id,
                categoryId: remapCategoryId(template.categoryId, mapping),
                name: template.name,
                description: template.description,
                isDefault: template.isDefault,
                isActive: template.isActive,
              })
              .returning()

            mapping.itineraryTemplateIdMap.set(template.id, newTemplate.id)
            stats.itineraryTemplatesCopied++

            // Duplicate items for this template
            const sourceItems = await tx.query.itineraryItems.findMany({
              where: eq(itineraryItems.templateId, template.id),
            })

            for (const item of sourceItems) {
              await tx.insert(itineraryItems).values({
                templateId: newTemplate.id,
                eventId: newEvent.id,
                title: item.title,
                description: item.description,
                itemType: item.itemType,
                dayNumber: item.dayNumber,
                startTime: item.startTime,
                endTime: item.endTime,
                duration: item.duration,
                location: item.location,
                locationDetails: item.locationDetails,
                visibleToCategories: remapCategoryIds(item.visibleToCategories, mapping),
                dresscode: item.dresscode,
                notes: item.notes,
                attachments: item.attachments,
                sortOrder: item.sortOrder,
                isOptional: item.isOptional,
                requiresRsvp: item.requiresRsvp,
              })

              stats.itineraryItemsCopied++
            }
          }
        }

        // 9. Duplicate inventory types (if included) - types only, not items
        if (options.includeInventoryTypes) {
          const sourceInvTypes = await tx.query.inventoryTypes.findMany({
            where: eq(inventoryTypes.eventId, sourceEvent.id),
          })

          for (const invType of sourceInvTypes) {
            const [newInvType] = await tx
              .insert(inventoryTypes)
              .values({
                eventId: newEvent.id,
                name: invType.name,
                category: invType.category,
                description: invType.description,
                settings: invType.settings,
                isActive: invType.isActive,
              })
              .returning()

            mapping.inventoryTypeIdMap.set(invType.id, newInvType.id)
            stats.inventoryTypesCopied++
          }
        }

        // 10. Duplicate workflows and steps (event-level only, if included)
        if (options.includeWorkflows) {
          const sourceWorkflows = await tx.query.workflows.findMany({
            where: eq(workflows.eventId, sourceEvent.id),
          })

          for (const workflow of sourceWorkflows) {
            const [newWorkflow] = await tx
              .insert(workflows)
              .values({
                workspaceId: sourceEvent.workspaceId,
                eventId: newEvent.id,
                name: workflow.name,
                description: workflow.description,
                trigger: workflow.trigger,
                triggerConditions: remapWorkflowTriggerConditions(
                  workflow.triggerConditions,
                  mapping
                ),
                isActive: false, // Don't auto-activate duplicated workflows
                isGlobal: false,
                createdBy: ctx.user.id,
              })
              .returning()

            mapping.workflowIdMap.set(workflow.id, newWorkflow.id)
            stats.workflowsCopied++

            // Duplicate workflow steps
            const sourceSteps = await tx.query.workflowSteps.findMany({
              where: eq(workflowSteps.workflowId, workflow.id),
            })

            for (const step of sourceSteps) {
              await tx.insert(workflowSteps).values({
                workflowId: newWorkflow.id,
                stepOrder: step.stepOrder,
                action: step.action,
                actionConfig: remapWorkflowStepActionConfig(step.actionConfig, mapping),
                continueOnError: step.continueOnError,
              })

              stats.workflowStepsCopied++
            }
          }
        }

        return { event: newEvent, stats }
      })

      return result
    }),
})
