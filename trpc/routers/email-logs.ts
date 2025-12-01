import { db } from "@/server/db/config/database"
import { events, emailLogs, guests, emailTemplates, workspaceMembers } from "@/server/db/schemas"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import { and, desc, eq, sql, gte, lte } from "drizzle-orm"
import { z } from "zod"

const emailStatusValues = [
  "pending",
  "queued",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "failed",
] as const

export const emailLogsRouter = createTRPCRouter({
  // Get email logs for an event with pagination
  getMany: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        status: z.enum(emailStatusValues).optional(),
        guestId: z.string().uuid().optional(),
        templateId: z.string().uuid().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
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

      // Check permission to view guests (email logs are part of guest communication)
      const canView = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.VIEW_GUESTS,
      })

      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view email logs",
        })
      }

      // Build conditions
      const conditions = [eq(emailLogs.eventId, input.eventId)]

      if (input.status) {
        conditions.push(eq(emailLogs.status, input.status))
      }

      if (input.guestId) {
        conditions.push(eq(emailLogs.guestId, input.guestId))
      }

      if (input.templateId) {
        conditions.push(eq(emailLogs.templateId, input.templateId))
      }

      if (input.dateFrom) {
        conditions.push(gte(emailLogs.createdAt, input.dateFrom))
      }

      if (input.dateTo) {
        conditions.push(lte(emailLogs.createdAt, input.dateTo))
      }

      const logs = await db.query.emailLogs.findMany({
        where: and(...conditions),
        with: {
          guest: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          template: {
            columns: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: [desc(emailLogs.createdAt)],
        limit: input.limit,
        offset: input.offset,
      })

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(emailLogs)
        .where(and(...conditions))

      return {
        logs,
        total: count,
        hasMore: input.offset + logs.length < count,
      }
    }),

  // Get single email log
  getOne: protectedProcedure
    .input(z.object({ logId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const log = await db.query.emailLogs.findFirst({
        where: eq(emailLogs.id, input.logId),
        with: {
          event: true,
          guest: true,
          template: true,
        },
      })

      if (!log) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email log not found" })
      }

      // Check permission
      const canView = await hasPermission({
        userId: ctx.user.id,
        workspaceId: log.event.workspaceId,
        permissionName: PERMISSIONS.VIEW_GUESTS,
      })

      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view email logs",
        })
      }

      return log
    }),

  // Get email statistics for an event
  getStats: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
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
        permissionName: PERMISSIONS.VIEW_REPORTS,
      })

      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view reports",
        })
      }

      // Build date conditions
      const dateConditions = [eq(emailLogs.eventId, input.eventId)]

      if (input.dateFrom) {
        dateConditions.push(gte(emailLogs.createdAt, input.dateFrom))
      }

      if (input.dateTo) {
        dateConditions.push(lte(emailLogs.createdAt, input.dateTo))
      }

      // Stats by status
      const statusStats = await db
        .select({
          status: emailLogs.status,
          count: sql<number>`count(*)::int`,
        })
        .from(emailLogs)
        .where(and(...dateConditions))
        .groupBy(emailLogs.status)

      // Stats by template type
      const templateStats = await db
        .select({
          templateType: emailTemplates.type,
          count: sql<number>`count(*)::int`,
        })
        .from(emailLogs)
        .innerJoin(emailTemplates, eq(emailLogs.templateId, emailTemplates.id))
        .where(and(...dateConditions))
        .groupBy(emailTemplates.type)

      // Calculate delivery metrics
      const totalSent = statusStats.find((s) => s.status === "sent")?.count || 0
      const totalDelivered = statusStats.find((s) => s.status === "delivered")?.count || 0
      const totalOpened = statusStats.find((s) => s.status === "opened")?.count || 0
      const totalClicked = statusStats.find((s) => s.status === "clicked")?.count || 0
      const totalBounced = statusStats.find((s) => s.status === "bounced")?.count || 0
      const totalFailed = statusStats.find((s) => s.status === "failed")?.count || 0

      // Total emails
      const total = statusStats.reduce((sum, s) => sum + s.count, 0)

      return {
        byStatus: statusStats,
        byTemplateType: templateStats,
        total,
        metrics: {
          sent: totalSent,
          delivered: totalDelivered,
          opened: totalOpened,
          clicked: totalClicked,
          bounced: totalBounced,
          failed: totalFailed,
          deliveryRate: totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(2) : "0",
          openRate: totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(2) : "0",
          clickRate: totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(2) : "0",
          bounceRate: totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(2) : "0",
        },
      }
    }),

  // Get email logs for a specific guest
  getByGuest: protectedProcedure
    .input(
      z.object({
        guestId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const guest = await db.query.guests.findFirst({
        where: eq(guests.id, input.guestId),
        with: { event: true },
      })

      if (!guest) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Guest not found" })
      }

      const canView = await hasPermission({
        userId: ctx.user.id,
        workspaceId: guest.event.workspaceId,
        permissionName: PERMISSIONS.VIEW_GUESTS,
      })

      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view email logs",
        })
      }

      return db.query.emailLogs.findMany({
        where: eq(emailLogs.guestId, input.guestId),
        with: {
          template: {
            columns: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: [desc(emailLogs.createdAt)],
        limit: input.limit,
      })
    }),
})
