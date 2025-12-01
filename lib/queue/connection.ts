import { REDIS_URL_ENV } from "@/env"
import IORedis from "ioredis"

/**
 * Create a new Redis connection for BullMQ.
 * BullMQ requires specific settings that differ from standard Redis usage:
 * - maxRetriesPerRequest: null (required for blocking commands)
 * - enableReadyCheck: false (faster connection)
 */
export const createQueueConnection = () => {
  return new IORedis(REDIS_URL_ENV, {
    maxRetriesPerRequest: null, // Required for BullMQ blocking commands
    enableReadyCheck: false,
    retryStrategy: (times) => {
      if (times > 10) {
        console.error("Redis connection failed after 10 retries")
        return null
      }
      return Math.min(times * 100, 3000)
    },
  })
}

// Singleton connection for queue operations (used by Next.js API routes)
let queueConnection: IORedis | null = null

export const getQueueConnection = () => {
  if (!queueConnection) {
    queueConnection = createQueueConnection()

    queueConnection.on("error", (error) => {
      console.error("Queue Redis connection error:", error.message)
    })

    queueConnection.on("connect", () => {
      console.log("Queue Redis connected successfully")
    })
  }
  return queueConnection
}

// For cleanup during shutdown
export const closeQueueConnection = async () => {
  if (queueConnection) {
    await queueConnection.quit()
    queueConnection = null
  }
}
