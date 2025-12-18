import { db } from "@/server/db/config/database"
import {
  events,
  guests,
  guestCategories,
  rsvpResponses,
  workspaceMembers,
} from "@/server/db/schemas"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import { and, count, eq, isNotNull, ne, sql } from "drizzle-orm"
import { z } from "zod"

import type { RsvpSummary } from "@/lib/rsvp/types"

export const rsvpReportsRouter = createTRPCRouter({
  // Get RSVP summary stats for an event
  getSummary: protectedProcedure
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

      // Get total invited guests
      const [totalResult] = await db
        .select({ count: count() })
        .from(guests)
        .where(eq(guests.eventId, input.eventId))

      // Get response status counts
      const statusCounts = await db
        .select({
          status: rsvpResponses.responseStatus,
          count: count(),
        })
        .from(rsvpResponses)
        .where(eq(rsvpResponses.eventId, input.eventId))
        .groupBy(rsvpResponses.responseStatus)

      // Get dietary needs count
      const [dietaryResult] = await db
        .select({ count: count() })
        .from(rsvpResponses)
        .where(
          and(
            eq(rsvpResponses.eventId, input.eventId),
            isNotNull(rsvpResponses.dietaryType),
            ne(rsvpResponses.dietaryType, "none")
          )
        )

      // Get accessibility needs count
      const [accessibilityResult] = await db
        .select({ count: count() })
        .from(rsvpResponses)
        .where(
          and(
            eq(rsvpResponses.eventId, input.eventId),
            isNotNull(rsvpResponses.accessibilityType),
            ne(rsvpResponses.accessibilityType, "none")
          )
        )

      // Get hotel needs count
      const [hotelResult] = await db
        .select({ count: count() })
        .from(rsvpResponses)
        .where(and(eq(rsvpResponses.eventId, input.eventId), eq(rsvpResponses.hotelRequired, true)))

      // Get transport needs count
      const [transportResult] = await db
        .select({ count: count() })
        .from(rsvpResponses)
        .where(
          and(eq(rsvpResponses.eventId, input.eventId), eq(rsvpResponses.transportRequired, true))
        )

      // Calculate counts from status results
      const statusMap = new Map(statusCounts.map((s) => [s.status, s.count]))

      const totalResponses =
        (statusMap.get("confirmed") ?? 0) +
        (statusMap.get("declined") ?? 0) +
        (statusMap.get("maybe") ?? 0)

      const summary: RsvpSummary = {
        total: totalResult.count,
        confirmed: statusMap.get("confirmed") ?? 0,
        declined: statusMap.get("declined") ?? 0,
        maybe: statusMap.get("maybe") ?? 0,
        pending: totalResult.count - totalResponses,
        withDietaryNeeds: dietaryResult.count,
        withAccessibilityNeeds: accessibilityResult.count,
        needingHotel: hotelResult.count,
        needingTransport: transportResult.count,
      }

      return summary
    }),

  // Get RSVP response timeline for charts
  getResponseTimeline: protectedProcedure
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

      // Group responses by date
      const timeline = await db
        .select({
          date: sql<string>`DATE(${rsvpResponses.submittedAt})`.as("date"),
          confirmed: sql<number>`COUNT(CASE WHEN ${rsvpResponses.responseStatus} = 'confirmed' THEN 1 END)`.mapWith(
            Number
          ),
          declined: sql<number>`COUNT(CASE WHEN ${rsvpResponses.responseStatus} = 'declined' THEN 1 END)`.mapWith(
            Number
          ),
          maybe: sql<number>`COUNT(CASE WHEN ${rsvpResponses.responseStatus} = 'maybe' THEN 1 END)`.mapWith(
            Number
          ),
        })
        .from(rsvpResponses)
        .where(eq(rsvpResponses.eventId, input.eventId))
        .groupBy(sql`DATE(${rsvpResponses.submittedAt})`)
        .orderBy(sql`DATE(${rsvpResponses.submittedAt})`)

      return timeline
    }),

  // Get RSVP breakdown by category
  getByCategory: protectedProcedure
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
        permissionName: PERMISSIONS.VIEW_REPORTS,
      })

      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view reports",
        })
      }

      // Get all categories for the event
      const categories = await db.query.guestCategories.findMany({
        where: eq(guestCategories.eventId, input.eventId),
        orderBy: [guestCategories.sortOrder],
      })

      // Get response counts by category and status
      const responseCounts = await db
        .select({
          categoryId: guests.categoryId,
          status: rsvpResponses.responseStatus,
          count: count(),
        })
        .from(rsvpResponses)
        .innerJoin(guests, eq(rsvpResponses.guestId, guests.id))
        .where(eq(rsvpResponses.eventId, input.eventId))
        .groupBy(guests.categoryId, rsvpResponses.responseStatus)

      // Get total guest counts by category
      const guestCounts = await db
        .select({
          categoryId: guests.categoryId,
          count: count(),
        })
        .from(guests)
        .where(eq(guests.eventId, input.eventId))
        .groupBy(guests.categoryId)

      // Build results
      const results = categories.map((category) => {
        const guestCount = guestCounts.find((g) => g.categoryId === category.id)?.count ?? 0
        const categoryResponses = responseCounts.filter((r) => r.categoryId === category.id)

        const confirmed = categoryResponses.find((r) => r.status === "confirmed")?.count ?? 0
        const declined = categoryResponses.find((r) => r.status === "declined")?.count ?? 0
        const maybe = categoryResponses.find((r) => r.status === "maybe")?.count ?? 0
        const totalResponses = confirmed + declined + maybe

        return {
          categoryId: category.id,
          categoryName: category.name,
          total: guestCount,
          confirmed,
          declined,
          maybe,
          pending: guestCount - totalResponses,
          responseRate: guestCount > 0 ? Math.round((totalResponses / guestCount) * 100) : 0,
        }
      })

      return results
    }),

  // Get detailed RSVP responses with filtering
  getResponses: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        status: z.enum(["confirmed", "declined", "maybe"]).optional(),
        categoryId: z.string().uuid().optional(),
        dietaryType: z.string().optional(),
        accessibilityType: z.string().optional(),
        hotelRequired: z.boolean().optional(),
        transportRequired: z.boolean().optional(),
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

      const canView = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.VIEW_RSVPS,
      })

      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view RSVPs",
        })
      }

      // Build conditions
      const conditions = [eq(rsvpResponses.eventId, input.eventId)]

      if (input.status) {
        conditions.push(eq(rsvpResponses.responseStatus, input.status))
      }
      if (input.dietaryType) {
        conditions.push(eq(rsvpResponses.dietaryType, input.dietaryType as "none"))
      }
      if (input.accessibilityType) {
        conditions.push(eq(rsvpResponses.accessibilityType, input.accessibilityType as "none"))
      }
      if (input.hotelRequired !== undefined) {
        conditions.push(eq(rsvpResponses.hotelRequired, input.hotelRequired))
      }
      if (input.transportRequired !== undefined) {
        conditions.push(eq(rsvpResponses.transportRequired, input.transportRequired))
      }

      // Get total count for pagination
      const [countResult] = await db
        .select({ count: count() })
        .from(rsvpResponses)
        .innerJoin(guests, eq(rsvpResponses.guestId, guests.id))
        .where(
          and(
            ...conditions,
            input.categoryId ? eq(guests.categoryId, input.categoryId) : undefined
          )
        )

      // Get responses with guest info
      const responses = await db
        .select({
          response: rsvpResponses,
          guest: {
            id: guests.id,
            firstName: guests.firstName,
            lastName: guests.lastName,
            email: guests.email,
            phone: guests.phone,
            categoryId: guests.categoryId,
          },
          category: {
            id: guestCategories.id,
            name: guestCategories.name,
          },
        })
        .from(rsvpResponses)
        .innerJoin(guests, eq(rsvpResponses.guestId, guests.id))
        .leftJoin(guestCategories, eq(guests.categoryId, guestCategories.id))
        .where(
          and(
            ...conditions,
            input.categoryId ? eq(guests.categoryId, input.categoryId) : undefined
          )
        )
        .orderBy(rsvpResponses.submittedAt)
        .limit(input.limit)
        .offset(input.offset)

      return {
        responses,
        total: countResult.count,
        limit: input.limit,
        offset: input.offset,
      }
    }),

  // Export RSVP data (returns data formatted for CSV/Excel export)
  exportData: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        format: z.enum(["csv", "json"]).default("json"),
        includeCustomFields: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      const canExport = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.EXPORT_DATA,
      })

      if (!canExport) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to export data",
        })
      }

      // Get all responses with guest info
      const responses = await db
        .select({
          // Guest info
          guestId: guests.id,
          firstName: guests.firstName,
          lastName: guests.lastName,
          email: guests.email,
          phone: guests.phone,
          // Category
          category: guestCategories.name,
          // Response status
          status: rsvpResponses.responseStatus,
          submittedAt: rsvpResponses.submittedAt,
          // Personal info
          preferredLanguage: rsvpResponses.preferredLanguage,
          // Logistics
          arrivalDate: rsvpResponses.arrivalDate,
          departureDate: rsvpResponses.departureDate,
          arrivalFlight: rsvpResponses.arrivalFlight,
          departureFlight: rsvpResponses.departureFlight,
          hotelRequired: rsvpResponses.hotelRequired,
          hotelCheckin: rsvpResponses.hotelCheckin,
          hotelCheckout: rsvpResponses.hotelCheckout,
          transportRequired: rsvpResponses.transportRequired,
          // Important to know
          dietaryType: rsvpResponses.dietaryType,
          dietaryDetails: rsvpResponses.dietaryDetails,
          accessibilityType: rsvpResponses.accessibilityType,
          accessibilityDetails: rsvpResponses.accessibilityDetails,
          emergencyContactName: rsvpResponses.emergencyContactName,
          emergencyContactPhone: rsvpResponses.emergencyContactPhone,
          // Experience
          sessionsInterested: rsvpResponses.sessionsInterested,
          // Custom
          customResponses: rsvpResponses.customResponses,
        })
        .from(rsvpResponses)
        .innerJoin(guests, eq(rsvpResponses.guestId, guests.id))
        .leftJoin(guestCategories, eq(guests.categoryId, guestCategories.id))
        .where(eq(rsvpResponses.eventId, input.eventId))
        .orderBy(guests.lastName, guests.firstName)

      // Flatten custom responses if included
      const exportData = responses.map((row) => {
        const baseData = { ...row }

        if (!input.includeCustomFields) {
          delete (baseData as Record<string, unknown>).customResponses
        } else if (row.customResponses && typeof row.customResponses === "object") {
          // Flatten custom responses into the row
          for (const [key, value] of Object.entries(row.customResponses)) {
            ;(baseData as Record<string, unknown>)[`custom_${key}`] = value
          }
          delete (baseData as Record<string, unknown>).customResponses
        }

        return baseData
      })

      return {
        eventName: event.name,
        exportedAt: new Date(),
        totalRecords: exportData.length,
        data: exportData,
      }
    }),
})
