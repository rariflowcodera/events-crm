import { Job } from "bullmq"
import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import { db } from "@/server/db/config/database"
import {
  bulkEmailJobs,
  emailLogs,
  emailSuppressions,
  emailMasterTemplates,
  emailTemplates,
  eventDocuments,
  eventForms,
  events,
  guestFormTokens,
  guests,
  workspaces,
} from "@/server/db/schemas"
import { SMTP_FROM_ENV } from "@/env"
import { email, resolveEmailSender } from "@/lib/email"
import { addSingleEmailJob } from "@/lib/queue/queues"
import { renderEmailTemplate, guestHasEmail } from "@/lib/queue/email-job"
import { getStatusOnEmailSend } from "@/lib/guest-status"
import type {
  EmailJobData,
  BulkEmailJobData,
  SingleEmailJobData,
  EmailJobResult,
} from "@/lib/queue/types"

/**
 * Main job processor - routes to bulk or single handlers
 */
export async function processEmailJob(job: Job<EmailJobData>): Promise<EmailJobResult> {
  if (job.data.type === "bulk") {
    return processBulkJob(job as Job<BulkEmailJobData>)
  }
  return processSingleJob(job as Job<SingleEmailJobData>)
}

/**
 * Process a bulk email job - creates child jobs for each guest
 */
async function processBulkJob(job: Job<BulkEmailJobData>): Promise<EmailJobResult> {
  const { bulkJobId, eventId, templateId, emailType, guestIds } = job.data

  console.log(`Processing bulk email job ${bulkJobId} for ${guestIds.length} guests`)

  // Update bulk job status to processing
  await db
    .update(bulkEmailJobs)
    .set({ status: "processing", startedAt: new Date() })
    .where(eq(bulkEmailJobs.id, bulkJobId))

  try {
    if (emailType === "invitation") {
      const event = await db.query.events.findFirst({
        where: eq(events.id, eventId),
        columns: { status: true },
      })

      if (event?.status === "draft") {
        await db
          .update(bulkEmailJobs)
          .set({
            status: "failed",
            errorMessage: "Event was moved back to draft status before invitations could be sent",
            completedAt: new Date(),
          })
          .where(eq(bulkEmailJobs.id, bulkJobId))

        return { success: false, error: "Event is in draft status" }
      }
    }

    // Fetch guests with emails
    const guestsToEmail = await db.query.guests.findMany({
      where: inArray(guests.id, guestIds),
      columns: { id: true, email: true },
    })

    // Filter to only guests with valid emails
    const validGuests = guestsToEmail.filter(guestHasEmail)

    if (validGuests.length === 0) {
      // No valid guests to email
      await db
        .update(bulkEmailJobs)
        .set({
          status: "completed",
          completedAt: new Date(),
          totalEmails: 0,
        })
        .where(eq(bulkEmailJobs.id, bulkJobId))

      return { success: true }
    }

    // Update total count (may differ from initial if some guests lack emails)
    await db
      .update(bulkEmailJobs)
      .set({ totalEmails: validGuests.length })
      .where(eq(bulkEmailJobs.id, bulkJobId))

    // Create child jobs for each guest with staggered delays
    const childJobPromises = validGuests.map((guest, index) =>
      addSingleEmailJob(
        {
          type: "single",
          guestId: guest.id,
          eventId,
          templateId,
          emailType,
          bulkJobId,
          language: "en", // Could be per-guest in future
        },
        {
          delay: index * 100, // Stagger by 100ms to smooth rate limiting
        }
      )
    )

    await Promise.all(childJobPromises)

    console.log(`Created ${validGuests.length} child jobs for bulk job ${bulkJobId}`)

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    // Update bulk job as failed
    await db
      .update(bulkEmailJobs)
      .set({
        status: "failed",
        errorMessage,
        completedAt: new Date(),
      })
      .where(eq(bulkEmailJobs.id, bulkJobId))

    throw error
  }
}

/**
 * Process a single email job - sends one email to one guest
 */
async function processSingleJob(job: Job<SingleEmailJobData>): Promise<EmailJobResult> {
  const { guestId, eventId, templateId, bulkJobId, language } = job.data

  console.log(`Processing single email job for guest ${guestId}`)

  // Fetch all required data in parallel
  const [guest, template, eventWithWorkspace, documents, tokenModeForms] = await Promise.all([
    db.query.guests.findFirst({
      where: eq(guests.id, guestId),
      with: {
        category: {
          columns: { id: true, name: true, code: true },
        },
      },
    }),
    db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.id, templateId),
    }),
    db.query.events.findFirst({
      where: eq(events.id, eventId),
      with: {
        workspace: true, // Include workspace for branding inheritance
      },
    }),
    db.query.eventDocuments.findMany({
      where: eq(eventDocuments.eventId, eventId),
    }),
    // Fetch token-mode forms for the event
    db.query.eventForms.findMany({
      where: and(
        eq(eventForms.eventId, eventId),
        eq(eventForms.accessType, "token"),
        eq(eventForms.isPublished, true)
      ),
      columns: {
        id: true,
        name: true,
        expiresAt: true,
      },
    }),
  ])

  // Extract event from the result (for compatibility with existing code)
  const event = eventWithWorkspace

  // Validate required data exists
  if (!guest) {
    await incrementFailedCount(bulkJobId)
    throw new Error(`Guest ${guestId} not found`)
  }

  if (!template) {
    await incrementFailedCount(bulkJobId)
    throw new Error(`Template ${templateId} not found`)
  }

  if (!event) {
    await incrementFailedCount(bulkJobId)
    throw new Error(`Event ${eventId} not found`)
  }

  if (!guest.email) {
    await incrementFailedCount(bulkJobId)
    throw new Error(`Guest ${guestId} has no email address`)
  }

  // Check if recipient is on suppression list (bounced/complained)
  const suppression = await db.query.emailSuppressions.findFirst({
    where: eq(emailSuppressions.email, guest.email.toLowerCase()),
  })

  if (suppression) {
    console.log(
      `Skipping email to ${guest.email}: on suppression list (${suppression.reason})`
    )

    // Create email log entry marked as bounced
    const [emailLog] = await db
      .insert(emailLogs)
      .values({
        guestId,
        eventId,
        templateId,
        toEmail: guest.email,
        subject: "(Blocked - Suppressed Address)",
        status: "bounced",
        bouncedAt: new Date(),
        errorMessage: `Recipient on suppression list (${suppression.reason})`,
        providerResponse: {
          suppressionId: suppression.id,
          reason: suppression.reason,
          errorDetail: suppression.errorDetail,
          blockedBySuppression: true,
        },
      })
      .returning()

    // Increment failed count on bulk job
    await incrementFailedCount(bulkJobId)

    // Update job progress
    await job.updateProgress({
      guestId,
      status: "bounced",
      reason: "suppressed",
      emailLogId: emailLog.id,
    })

    return {
      success: false,
      guestId,
      emailLogId: emailLog.id,
      reason: "suppressed",
    }
  }

  // Get or create tokens for each token-mode form
  const formTokens = await Promise.all(
    tokenModeForms.map(async (form) => {
      // Check for existing token
      let existingToken = await db.query.guestFormTokens.findFirst({
        where: and(
          eq(guestFormTokens.guestId, guestId),
          eq(guestFormTokens.formId, form.id)
        ),
      })

      if (!existingToken) {
        // Create new token
        const [newToken] = await db
          .insert(guestFormTokens)
          .values({
            guestId,
            formId: form.id,
            token: crypto.randomUUID(),
            expiresAt: form.expiresAt,
          })
          .returning()
        existingToken = newToken
      }

      return {
        form: { id: form.id, name: form.name },
        token: existingToken.token,
      }
    })
  )

  // Create email log entry (status: pending)
  const [emailLog] = await db
    .insert(emailLogs)
    .values({
      guestId,
      eventId,
      templateId,
      toEmail: guest.email,
      subject: "Sending...", // Will be updated after rendering
      status: "pending",
    })
    .returning()

  try {
    // Resolve master template: template's masterTemplateId → workspace default → null (falls back to built-in)
    let resolvedMasterTemplate = null
    if (template.masterTemplateId) {
      resolvedMasterTemplate = await db.query.emailMasterTemplates.findFirst({
        where: eq(emailMasterTemplates.id, template.masterTemplateId),
      }) ?? null
    }
    if (!resolvedMasterTemplate && eventWithWorkspace?.workspaceId) {
      resolvedMasterTemplate = await db.query.emailMasterTemplates.findFirst({
        where: and(
          eq(emailMasterTemplates.workspaceId, eventWithWorkspace.workspaceId),
          eq(emailMasterTemplates.isDefault, true),
          isNull(emailMasterTemplates.eventId)
        ),
      }) ?? null
    }

    // Build branding context for email rendering
    const branding = {
      workspaceBranding: eventWithWorkspace?.workspace?.branding || null,
      eventBranding: eventWithWorkspace?.branding || null,
      masterTemplate: resolvedMasterTemplate ? {
        id: resolvedMasterTemplate.id,
        name: resolvedMasterTemplate.name,
        htmlTemplate: resolvedMasterTemplate.htmlTemplate,
        structure: resolvedMasterTemplate.structure,
      } : null,
    }

    // Render template with variables (including document links, form links, and branding)
    const rendered = renderEmailTemplate(template, guest, event, language, documents, branding, formTokens)

    // Update email log with rendered subject
    await db
      .update(emailLogs)
      .set({ subject: rendered.subject, status: "queued" })
      .where(eq(emailLogs.id, emailLog.id))

    // Resolve email sender with fallback chain:
    // 1. Template fromEmail (highest priority)
    // 2. Event emailSettings
    // 3. SMTP_FROM env (default)
    const fromAddress = resolveEmailSender({
      explicitFrom: rendered.from,
      levelSettings: event.settings?.emailSettings,
      defaultFrom: SMTP_FROM_ENV,
    })

    // Send email via nodemailer
    const result = await email.send({
      to: guest.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      from: fromAddress,
    })

    if (result.error) {
      throw new Error(result.error.message)
    }

    // Update email log to sent
    await db
      .update(emailLogs)
      .set({
        status: "sent",
        sentAt: new Date(),
        providerMessageId: result.data?.id,
      })
      .where(eq(emailLogs.id, emailLog.id))

    // Update guest last email sent timestamp and status
    // Only update status if guest hasn't already responded (confirmed/declined/maybe/etc.)
    const newStatus = getStatusOnEmailSend(guest.status, template.type)
    await db
      .update(guests)
      .set({
        lastEmailSentAt: new Date(),
        lastEmailTemplateName: template.name,
        ...(newStatus && { status: newStatus }),
      })
      .where(eq(guests.id, guestId))

    // Increment sent count on bulk job
    await incrementSentCount(bulkJobId)

    // Update job progress
    await job.updateProgress({
      guestId,
      status: "sent",
      emailLogId: emailLog.id,
    })

    console.log(`Email sent successfully to ${guest.email}`)

    return {
      success: true,
      guestId,
      emailLogId: emailLog.id,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    // Update email log to failed
    await db
      .update(emailLogs)
      .set({
        status: "failed",
        errorMessage,
      })
      .where(eq(emailLogs.id, emailLog.id))

    // Increment failed count on bulk job
    await incrementFailedCount(bulkJobId)

    // Update job progress
    await job.updateProgress({
      guestId,
      status: "failed",
      error: errorMessage,
    })

    console.error(`Failed to send email to ${guest.email}:`, errorMessage)

    // Re-throw to trigger BullMQ retry
    throw error
  }
}

/**
 * Increment the sent count and check if job is complete
 */
async function incrementSentCount(bulkJobId: string) {
  await db.execute(
    sql`UPDATE bulk_email_job
        SET sent_count = sent_count + 1
        WHERE id = ${bulkJobId}`
  )
  await checkBulkJobCompletion(bulkJobId)
}

/**
 * Increment the failed count and check if job is complete
 */
async function incrementFailedCount(bulkJobId: string) {
  await db.execute(
    sql`UPDATE bulk_email_job
        SET failed_count = failed_count + 1
        WHERE id = ${bulkJobId}`
  )
  await checkBulkJobCompletion(bulkJobId)
}

/**
 * Check if a bulk job is complete (all emails processed)
 */
async function checkBulkJobCompletion(bulkJobId: string) {
  const bulkJob = await db.query.bulkEmailJobs.findFirst({
    where: eq(bulkEmailJobs.id, bulkJobId),
    columns: {
      status: true,
      totalEmails: true,
      sentCount: true,
      failedCount: true,
    },
  })

  if (!bulkJob || bulkJob.status !== "processing") {
    return
  }

  const processed = bulkJob.sentCount + bulkJob.failedCount
  if (processed >= bulkJob.totalEmails) {
    // Job is complete
    await db
      .update(bulkEmailJobs)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(bulkEmailJobs.id, bulkJobId))

    console.log(
      `Bulk job ${bulkJobId} completed: ${bulkJob.sentCount} sent, ${bulkJob.failedCount} failed`
    )
  }
}
