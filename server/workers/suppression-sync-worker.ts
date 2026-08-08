/**
 * Suppression Sync Worker Process
 *
 * This file is the entry point for the BullMQ worker that syncs
 * the OCI Email Delivery suppression list.
 *
 * Run with: pnpm worker:suppression
 *
 * The worker syncs hourly and updates:
 * 1. Local email_suppression cache table
 * 2. email_log status for bounced addresses
 */

import { config } from "dotenv"
config({ path: ".env.local" })
import { Worker } from "bullmq"
import { createQueueConnection } from "@/lib/queue/connection"
import {
  QUEUE_NAMES,
  scheduleSuppressionSync,
} from "@/lib/queue/queues"
import { processSuppressionSync } from "./suppression-sync-processor"
import type { SuppressionSyncJobData } from "@/lib/queue/suppression-sync-types"

console.log("Starting suppression sync worker...")

// Create a fresh connection for the worker
const connection = createQueueConnection()

// Create the worker
const worker = new Worker<SuppressionSyncJobData>(
  QUEUE_NAMES.SUPPRESSION_SYNC,
  processSuppressionSync,
  {
    connection,
    concurrency: 1, // Only one sync at a time
  }
)

// Event handlers for monitoring
worker.on("completed", (job, result) => {
  console.log(`Suppression sync completed:`, result)
})

worker.on("failed", (job, error) => {
  console.error(`Suppression sync failed:`, error.message)
})

worker.on("error", (error) => {
  console.error("Worker error:", error)
})

worker.on("active", (job) => {
  console.log(
    `Suppression sync started (${job.data.manual ? "manual" : "scheduled"})`
  )
})

// Schedule the hourly sync job
scheduleSuppressionSync().catch((error) => {
  console.error("Failed to schedule suppression sync:", error)
})

// Graceful shutdown handlers
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing worker...`)

  // Close the worker (waits for active jobs to complete)
  await worker.close()

  // Close the connection
  await connection.quit()

  console.log("Suppression sync worker shut down gracefully")
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

console.log("Suppression sync worker started successfully")
