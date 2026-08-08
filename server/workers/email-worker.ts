/**
 * Email Worker Process
 *
 * This file is the entry point for the BullMQ worker that processes email jobs.
 * Run with: pnpm worker:email
 *
 * The worker handles both bulk email jobs (which create child jobs) and
 * single email jobs (which send individual emails).
 */

import { config } from "dotenv"
config({ path: ".env.local" })
import { Worker } from "bullmq"
import { createQueueConnection } from "@/lib/queue/connection"
import { QUEUE_NAMES } from "@/lib/queue/queues"
import { processEmailJob } from "./email-processor"
import type { EmailJobData } from "@/lib/queue/types"

// Rate limit from environment or default
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || "5", 10)
const SMTP_RATE_LIMIT = parseInt(process.env.SMTP_RATE_LIMIT || "10", 10)

console.log("Starting email worker...")
console.log(`Concurrency: ${WORKER_CONCURRENCY}`)
console.log(`Rate limit: ${SMTP_RATE_LIMIT} emails/second`)

// Create a fresh connection for the worker
const connection = createQueueConnection()

// Create the worker
const worker = new Worker<EmailJobData>(
  QUEUE_NAMES.EMAIL,
  processEmailJob,
  {
    connection,
    concurrency: WORKER_CONCURRENCY,
    limiter: {
      max: SMTP_RATE_LIMIT,
      duration: 1000, // 1 second
    },
  }
)

// Event handlers for monitoring
worker.on("completed", (job, result) => {
  console.log(`Job ${job.id} completed:`, result)
})

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message)
})

worker.on("error", (error) => {
  console.error("Worker error:", error)
})

worker.on("active", (job) => {
  console.log(`Job ${job.id} started (${job.data.type})`)
})

worker.on("stalled", (jobId) => {
  console.warn(`Job ${jobId} stalled`)
})

// Graceful shutdown handlers
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing worker...`)

  // Close the worker (waits for active jobs to complete)
  await worker.close()

  // Close the connection
  await connection.quit()

  console.log("Worker shut down gracefully")
  process.exit(0)
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error)
  process.exit(1)
})

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason)
  process.exit(1)
})

console.log("Email worker started successfully")
