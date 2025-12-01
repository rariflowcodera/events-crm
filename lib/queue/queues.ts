import { Queue } from "bullmq"
import { getQueueConnection } from "./connection"
import type { EmailJobData } from "./types"

export const QUEUE_NAMES = {
  EMAIL: "email-queue",
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
