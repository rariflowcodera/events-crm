import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, desc, and, inArray } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"
import { protectedProcedure, createTRPCRouter } from "@/trpc/init"
import { db } from "@/server/db/config/database"
import {
  bulkEmailJobs,
  emailTemplates,
  events,
  guests,
} from "@/server/db/schemas"
import { addBulkEmailJob } from "@/lib/queue/queues"
import { emailTemplateTypeValues } from "@/lib/schemas"

export const bulkEmailRouter = createTRPCRouter({
  /**
   * Start a bulk email job for selected guests
   */
  sendBulk: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        templateId: z.string().uuid(),
        emailType: z.enum(emailTemplateTypeValues),
        guestIds: z.array(z.string().uuid()).min(1, "Select at least one guest"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { eventId, templateId, emailType, guestIds } = input

      // Verify event exists and user has access
      const event = await db.query.events.findFirst({
        where: eq(events.id, eventId),
        columns: { id: true, workspaceId: true },
      })

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        })
      }

      // Verify template exists and belongs to this event
      const template = await db.query.emailTemplates.findFirst({
        where: and(
          eq(emailTemplates.id, templateId),
          eq(emailTemplates.eventId, eventId)
        ),
        columns: { id: true, name: true, type: true },
      })

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email template not found",
        })
      }

      // Verify guests exist and belong to this event
      const validGuests = await db.query.guests.findMany({
        where: and(
          inArray(guests.id, guestIds),
          eq(guests.eventId, eventId)
        ),
        columns: { id: true, email: true },
      })

      const guestsWithEmail = validGuests.filter(
        (g) => g.email && g.email.includes("@")
      )

      if (guestsWithEmail.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No guests with valid email addresses selected",
        })
      }

      // Create bulk job record
      const bulkJobId = uuidv4()
      const [bulkJob] = await db
        .insert(bulkEmailJobs)
        .values({
          id: bulkJobId,
          eventId,
          templateId,
          emailType,
          status: "pending",
          totalEmails: guestsWithEmail.length,
          guestIds: guestsWithEmail.map((g) => g.id),
          createdBy: ctx.user.id,
          createdAt: new Date(),
        })
        .returning()

      // Add job to BullMQ queue
      await addBulkEmailJob({
        type: "bulk",
        bulkJobId,
        eventId,
        templateId,
        emailType,
        guestIds: guestsWithEmail.map((g) => g.id),
      })

      return {
        bulkJobId,
        totalEmails: guestsWithEmail.length,
        skippedCount: guestIds.length - guestsWithEmail.length,
      }
    }),

  /**
   * Send to all guests (uses default template for the email type)
   */
  sendToAll: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        emailType: z.enum(emailTemplateTypeValues),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { eventId, emailType } = input

      // Get the default template for this email type
      const template = await db.query.emailTemplates.findFirst({
        where: and(
          eq(emailTemplates.eventId, eventId),
          eq(emailTemplates.type, emailType),
          eq(emailTemplates.isDefault, true),
          eq(emailTemplates.isActive, true)
        ),
        columns: { id: true },
      })

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `No default ${emailType} template configured. Please set a default template in Event Settings.`,
        })
      }

      // Get all guests with emails for this event
      const allGuests = await db.query.guests.findMany({
        where: eq(guests.eventId, eventId),
        columns: { id: true, email: true },
      })

      const guestsWithEmail = allGuests.filter(
        (g) => g.email && g.email.includes("@")
      )

      if (guestsWithEmail.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No guests with valid email addresses",
        })
      }

      // Create bulk job record
      const bulkJobId = uuidv4()
      await db.insert(bulkEmailJobs).values({
        id: bulkJobId,
        eventId,
        templateId: template.id,
        emailType,
        status: "pending",
        totalEmails: guestsWithEmail.length,
        guestIds: guestsWithEmail.map((g) => g.id),
        createdBy: ctx.user.id,
        createdAt: new Date(),
      })

      // Add job to BullMQ queue
      await addBulkEmailJob({
        type: "bulk",
        bulkJobId,
        eventId,
        templateId: template.id,
        emailType,
        guestIds: guestsWithEmail.map((g) => g.id),
      })

      return {
        bulkJobId,
        totalEmails: guestsWithEmail.length,
      }
    }),

  /**
   * Get status of a bulk email job
   */
  getJobStatus: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ input }) => {
      const job = await db.query.bulkEmailJobs.findFirst({
        where: eq(bulkEmailJobs.id, input.jobId),
        with: {
          template: {
            columns: { name: true, type: true },
          },
        },
      })

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        })
      }

      return {
        id: job.id,
        status: job.status,
        templateName: job.template.name,
        emailType: job.emailType,
        totalEmails: job.totalEmails,
        sentCount: job.sentCount,
        failedCount: job.failedCount,
        progress:
          job.totalEmails > 0
            ? Math.round(
                ((job.sentCount + job.failedCount) / job.totalEmails) * 100
              )
            : 0,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      }
    }),

  /**
   * List recent bulk email jobs for an event
   */
  listJobs: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      const jobs = await db.query.bulkEmailJobs.findMany({
        where: eq(bulkEmailJobs.eventId, input.eventId),
        orderBy: [desc(bulkEmailJobs.createdAt)],
        limit: input.limit,
        with: {
          template: {
            columns: { name: true },
          },
        },
      })

      return jobs.map((job) => ({
        id: job.id,
        status: job.status,
        templateName: job.template.name,
        emailType: job.emailType,
        totalEmails: job.totalEmails,
        sentCount: job.sentCount,
        failedCount: job.failedCount,
        progress:
          job.totalEmails > 0
            ? Math.round(
                ((job.sentCount + job.failedCount) / job.totalEmails) * 100
              )
            : 0,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      }))
    }),

  /**
   * Cancel a pending or processing job
   */
  cancelJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const job = await db.query.bulkEmailJobs.findFirst({
        where: eq(bulkEmailJobs.id, input.jobId),
        columns: { id: true, status: true },
      })

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        })
      }

      if (job.status === "completed" || job.status === "cancelled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot cancel a completed or already cancelled job",
        })
      }

      // Mark as cancelled (worker will check this and skip remaining emails)
      await db
        .update(bulkEmailJobs)
        .set({
          status: "cancelled",
          completedAt: new Date(),
        })
        .where(eq(bulkEmailJobs.id, input.jobId))

      return { success: true }
    }),
})
