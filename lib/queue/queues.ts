import { Queue } from "bullmq"
import { getQueueConnection } from "./connection"
import type { EmailJobData } from "./types"
import type { SuppressionSyncJobData } from "./suppression-sync-types"

export const QUEUE_NAMES = {
  EMAIL: "email-queue",
  SUPPRESSION_SYNC: "suppression-sync-queue",
} as const

// Rate limit from environment or default
const SMTP_RATE_LIMIT = parseInt(process.env.SMTP_RATE_LIMIT || "10", 10)

/**
 * Email queue for sending invitations, reminders, etc.
 * Rate limited to prevent SMTP provider throttling.
 */
export const emailQueue = new Queue<EmailJobData>(QUEUE_NAMES.EMAIL, {
  connection: getQueueConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000, // Start with 1 second, doubles each retry
    },
    removeOnComplete: {
      age: 24 * 60 * 60, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
    },
  },
})

/**
 * Add a bulk email job to the queue
 */
export async function addBulkEmailJob(data: EmailJobData & { type: "bulk" }) {
  return emailQueue.add(`bulk-${data.emailType}-${data.bulkJobId}`, data, {
    priority: 2, // Lower priority than single sends
  })
}

/**
 * Add a single email job to the queue
 */
export async function addSingleEmailJob(
  data: EmailJobData & { type: "single" },
  options?: { delay?: number }
) {
  return emailQueue.add(`email-${data.guestId}`, data, {
    priority: 1, // Higher priority for individual sends
    ...options,
  })
}

/**
 * Get queue stats for monitoring
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
  ])

  return { waiting, active, completed, failed, delayed }
}

/**
 * Suppression sync queue - syncs OCI suppression list hourly
 */
export const suppressionSyncQueue = new Queue<SuppressionSyncJobData>(
  QUEUE_NAMES.SUPPRESSION_SYNC,
  {
    connection: getQueueConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000, // Start with 5 seconds for API calls
      },
      removeOnComplete: {
        count: 24, // Keep last 24 runs (1 day of hourly syncs)
      },
      removeOnFail: {
        count: 100, // Keep last 100 failed jobs for debugging
      },
    },
  }
)

/**
 * Schedule the hourly suppression sync job
 * Call this once when the worker starts
 */
export async function scheduleSuppressionSync() {
  // Remove any existing repeat jobs first
  const repeatableJobs = await suppressionSyncQueue.getRepeatableJobs()
  for (const job of repeatableJobs) {
    await suppressionSyncQueue.removeRepeatableByKey(job.key)
  }

  // Add new hourly repeat job
  await suppressionSyncQueue.add(
    "sync",
    { manual: false },
    {
      repeat: {
        pattern: "0 * * * *", // Every hour at minute 0
      },
      jobId: "suppression-sync-hourly",
    }
  )

  console.log("Suppression sync scheduled (hourly at :00)")
}

/**
 * Trigger a manual suppression sync
 */
export async function triggerManualSuppressionSync() {
  return suppressionSyncQueue.add(
    "manual-sync",
    { manual: true },
    { priority: 1 } // Higher priority than scheduled syncs
  )
}
