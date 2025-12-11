import { db } from "@/server/db/config/database"
import { emailLogs, emailSuppressions, events } from "@/server/db/schemas"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import { and, desc, eq, sql, ilike } from "drizzle-orm"
import { z } from "zod"
import { triggerManualSuppressionSync } from "@/lib/queue/queues"
import {
  deleteSuppression,
  createSuppression,
  isOciConfigured,
} from "@/lib/oci/email-client"

export const emailDeliveryRouter = createTRPCRouter({
  /**
   * Get delivery stats for an event
   */
  getStats: protectedProcedure
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

      // Get status counts
      const statusCounts = await db
        .select({
          status: emailLogs.status,
          count: sql<number>`count(*)::int`,
        })
        .from(emailLogs)
        .where(eq(emailLogs.eventId, input.eventId))
        .groupBy(emailLogs.status)

      const stats = {
        pending: 0,
        queued: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        failed: 0,
      }

      for (const row of statusCounts) {
        stats[row.status as keyof typeof stats] = row.count
      }

      const total = Object.values(stats).reduce((a, b) => a + b, 0)
      const totalAttempted = stats.sent + stats.bounced + stats.failed

      return {
        ...stats,
        total,
        bounceRate:
          totalAttempted > 0
            ? ((stats.bounced / totalAttempted) * 100).toFixed(2)
            : "0.00",
        failureRate:
          totalAttempted > 0
            ? ((stats.failed / totalAttempted) * 100).toFixed(2)
            : "0.00",
      }
    }),

  /**
   * Get recent bounces for an event
   */
  getRecentBounces: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(10),
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

      return db.query.emailLogs.findMany({
        where: and(
          eq(emailLogs.eventId, input.eventId),
          eq(emailLogs.status, "bounced")
        ),
        with: {
          guest: {
            columns: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: [desc(emailLogs.bouncedAt)],
        limit: input.limit,
      })
    }),

  /**
   * Get suppression list stats
   */
  getSuppressionStats: protectedProcedure.query(async () => {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailSuppressions)

    const byCause = await db
      .select({
        reason: emailSuppressions.reason,
        count: sql<number>`count(*)::int`,
      })
      .from(emailSuppressions)
      .groupBy(emailSuppressions.reason)

    // Get last sync time
    const [latest] = await db
      .select({ syncedAt: emailSuppressions.syncedAt })
      .from(emailSuppressions)
      .orderBy(desc(emailSuppressions.syncedAt))
      .limit(1)

    return {
      total: totalResult?.count || 0,
      byCause,
      lastSyncAt: latest?.syncedAt || null,
    }
  }),

  /**
   * List suppressed emails (paginated with search)
   */
  listSuppressions: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const conditions = []

      if (input.search) {
        conditions.push(ilike(emailSuppressions.email, `%${input.search}%`))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const suppressions = await db.query.emailSuppressions.findMany({
        where: whereClause,
        orderBy: [desc(emailSuppressions.ociCreatedAt)],
        limit: input.limit,
        offset: input.offset,
      })

      const [{ count: total }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(emailSuppressions)
        .where(whereClause)

      return {
        suppressions,
        total,
        hasMore: input.offset + suppressions.length < total,
      }
    }),

  /**
   * Trigger a manual suppression sync
   */
  triggerSync: protectedProcedure.mutation(async () => {
    await triggerManualSuppressionSync()
    return { success: true, message: "Suppression sync triggered" }
  }),

  /**
   * Remove an email from the suppression list
   * This removes from both OCI and local cache
   */
  removeFromSuppression: protectedProcedure
    .input(z.object({ suppressionId: z.string() }))
    .mutation(async ({ input }) => {
      // Get the suppression from local DB first
      const suppression = await db.query.emailSuppressions.findFirst({
        where: eq(emailSuppressions.id, input.suppressionId),
      })

      if (!suppression) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Suppression not found",
        })
      }

      // Delete from OCI if configured
      if (isOciConfigured()) {
        try {
          await deleteSuppression(input.suppressionId)
        } catch (error) {
          // Log but continue - OCI suppression may already be removed
          console.warn("Failed to delete suppression from OCI:", error)
        }
      }

      // Delete from local cache
      await db
        .delete(emailSuppressions)
        .where(eq(emailSuppressions.id, input.suppressionId))

      return { success: true, email: suppression.email }
    }),

  /**
   * Manually add an email to the suppression list
   * This adds to both OCI and local cache
   */
  addToSuppression: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const emailLower = input.email.toLowerCase()

      // Check if already suppressed
      const existing = await db.query.emailSuppressions.findFirst({
        where: eq(emailSuppressions.email, emailLower),
      })

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email is already suppressed",
        })
      }

      // Add to OCI if configured
      if (isOciConfigured()) {
        try {
          const ociSuppression = await createSuppression(emailLower)

          // Add to local cache with OCI data
          await db.insert(emailSuppressions).values({
            id: ociSuppression.id,
            email: ociSuppression.emailAddress,
            reason: ociSuppression.reason,
            errorDetail: ociSuppression.errorDetail,
            errorSource: ociSuppression.errorSource,
            ociCreatedAt: ociSuppression.timeCreated,
            syncedAt: new Date(),
          })

          return { success: true, id: ociSuppression.id }
        } catch (error) {
          console.error("Failed to create suppression in OCI:", error)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to add email to suppression list",
          })
        }
      } else {
        // No OCI configured - just add to local cache with a generated ID
        const id = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        await db.insert(emailSuppressions).values({
          id,
          email: emailLower,
          reason: "MANUAL",
          syncedAt: new Date(),
        })

        return { success: true, id }
      }
    }),
})
