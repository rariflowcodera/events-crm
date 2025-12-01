import { REDIS_URL_ENV } from "@/env"
import Redis from "ioredis"

export const redis = new Redis(REDIS_URL_ENV, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      return null // Stop retrying after 3 attempts
    }
    return Math.min(times * 100, 3000) // Exponential backoff, max 3s
  },
  lazyConnect: true,
})

// Handle connection errors gracefully
redis.on("error", (error) => {
  console.error("Redis connection error:", error.message)
})

redis.on("connect", () => {
  console.log("Redis connected successfully")
})
