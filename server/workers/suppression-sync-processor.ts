import { Job } from "bullmq"
import { db } from "@/server/db/config/database"
import { emailSuppressions, emailLogs } from "@/server/db/schemas"
import { listAllSuppressions, isOciConfigured } from "@/lib/oci/email-client"
import { eq, and, inArray } from "drizzle-orm"
import type {
  SuppressionSyncJobData,
  SuppressionSyncResult,
} from "@/lib/queue/suppression-sync-types"

/**
 * Process a suppression sync job
 * 1. Fetch all suppressions from OCI
 * 2. Upsert into local email_suppression table
 * 3. Update email_log entries where toEmail matches suppression
 */
export async function processSuppressionSync(
  job: Job<SuppressionSyncJobData>
): Promise<SuppressionSyncResult> {
  const startTime = Date.now()
  const isManual = job.data.manual

  console.log(
    `Starting suppression sync (${isManual ? "manual" : "scheduled"})...`
  )

  // Check if OCI is configured
  if (!isOciConfigured()) {
    console.log("OCI not configured, skipping suppression sync")
    return { synced: 0, emailLogsUpdated: 0, duration: 0 }
  }

  // 1. Fetch all suppressions from OCI
  const ociSuppressions = await listAllSuppressions()
  console.log(`Fetched ${ociSuppressions.length} suppressions from OCI`)

  if (ociSuppressions.length === 0) {
    const duration = Date.now() - startTime
    return { synced: 0, emailLogsUpdated: 0, duration }
  }

  // 2. Upsert into local cache
  const now = new Date()
  let syncedCount = 0

  for (const suppression of ociSuppressions) {
    // Ensure timeCreated is a proper Date object
    const ociCreatedAt = suppression.timeCreated instanceof Date
      ? suppression.timeCreated
      : new Date(suppression.timeCreated)

    await db
      .insert(emailSuppressions)
      .values({
        id: suppression.id,
        email: suppression.emailAddress,
        reason: suppression.reason,
        errorDetail: suppression.errorDetail,
        errorSource: suppression.errorSource,
        ociCreatedAt,
        syncedAt: now,
      })
      .onConflictDoUpdate({
        target: emailSuppressions.id,
        set: {
          reason: suppression.reason,
          errorDetail: suppression.errorDetail,
          errorSource: suppression.errorSource,
          syncedAt: now,
        },
      })
    syncedCount++

    // Update job progress
    if (syncedCount % 100 === 0) {
      await job.updateProgress(
        Math.round((syncedCount / ociSuppressions.length) * 50)
      )
    }
  }

  // 3. Get all suppressed emails for lookup
  const suppressedEmails = ociSuppressions.map((s) => s.emailAddress)

  // 4. Update email_log entries that match suppressed emails
  // Only update emails that are currently "sent" (not already bounced/failed)
  let emailLogsUpdated = 0
  const BATCH_SIZE = 500

  for (let i = 0; i < suppressedEmails.length; i += BATCH_SIZE) {
    const batch = suppressedEmails.slice(i, i + BATCH_SIZE)

    const result = await db
      .update(emailLogs)
      .set({
        status: "bounced",
        bouncedAt: now,
        providerResponse: { reason: "SUPPRESSION_LIST_SYNC", syncedAt: now.toISOString() },
      })
      .where(
        and(
          inArray(emailLogs.toEmail, batch),
          eq(emailLogs.status, "sent") // Only update sent emails
        )
      )
      .returning({ id: emailLogs.id })

    emailLogsUpdated += result.length

    // Update job progress (50-100% for email log updates)
    await job.updateProgress(
      50 + Math.round(((i + BATCH_SIZE) / suppressedEmails.length) * 50)
    )
  }

  const duration = Date.now() - startTime
  console.log(
    `Suppression sync complete: ${syncedCount} synced, ${emailLogsUpdated} email logs updated (${duration}ms)`
  )

  return {
    synced: syncedCount,
    emailLogsUpdated,
    duration,
  }
}
