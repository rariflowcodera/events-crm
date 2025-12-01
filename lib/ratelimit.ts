import { RateLimiterRedis } from "rate-limiter-flexible"

import { redis } from "@/lib/redis"

// Default rate limiter: 100 requests per 10 seconds (sliding window)
const rateLimiterRedis = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "ratelimit",
  points: 100, // Number of requests
  duration: 10, // Per 10 seconds
})

// Helper function with same interface as Upstash ratelimit
export const ratelimit = {
  async limit(identifier: string): Promise<{ success: boolean; remaining: number }> {
    try {
      const result = await rateLimiterRedis.consume(identifier)
      return {
        success: true,
        remaining: result.remainingPoints,
      }
    } catch (error) {
      // Rate limit exceeded
      return {
        success: false,
        remaining: 0,
      }
    }
  },
}

// Factory function to create custom rate limiters
export function createRateLimiter(points: number, durationSeconds: number) {
  const limiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: "ratelimit",
    points,
    duration: durationSeconds,
  })

  return {
    async limit(identifier: string): Promise<{ success: boolean; remaining: number }> {
      try {
        const result = await limiter.consume(identifier)
        return {
          success: true,
          remaining: result.remainingPoints,
        }
      } catch (error) {
        return {
          success: false,
          remaining: 0,
        }
      }
    },
  }
}
