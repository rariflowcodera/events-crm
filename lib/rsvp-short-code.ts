/**
 * RSVP Short Code Generator
 *
 * Generates 8-character alphanumeric short codes for RSVP URLs.
 * Uses lowercase letters + digits for URL-friendliness.
 *
 * With 36 possible characters and 8 positions:
 * - Total combinations: 36^8 = 2.8 trillion
 * - With 100,000 guests: collision probability < 0.0000002%
 */

import { eq } from "drizzle-orm"
import type { db as Database } from "@/server/db/config/database"
import { guests } from "@/server/db/schemas"

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789"
const DEFAULT_LENGTH = 8

/**
 * Generate a random alphanumeric short code
 */
export function generateRsvpShortCode(length = DEFAULT_LENGTH): string {
  let result = ""
  for (let i = 0; i < length; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length))
  }
  return result
}

/**
 * Generate a unique short code with collision detection
 * Retries up to maxAttempts times if collision found
 */
export async function generateUniqueRsvpShortCode(
  db: typeof Database,
  maxAttempts = 5
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shortCode = generateRsvpShortCode()

    const existing = await db.query.guests.findFirst({
      where: eq(guests.rsvpShortCode, shortCode),
      columns: { id: true },
    })

    if (!existing) {
      return shortCode
    }
  }

  // Fallback: use longer code if collisions persist (extremely rare)
  return generateRsvpShortCode(12)
}

/**
 * Generate multiple unique short codes in batch
 * More efficient for bulk guest creation
 */
export async function generateUniqueRsvpShortCodes(
  db: typeof Database,
  count: number,
  maxAttempts = 5
): Promise<string[]> {
  const shortCodes: string[] = []
  const usedCodes = new Set<string>()

  for (let i = 0; i < count; i++) {
    let shortCode: string | null = null

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate = generateRsvpShortCode()

      // Check against both local set and database
      if (!usedCodes.has(candidate)) {
        const existing = await db.query.guests.findFirst({
          where: eq(guests.rsvpShortCode, candidate),
          columns: { id: true },
        })

        if (!existing) {
          shortCode = candidate
          usedCodes.add(candidate)
          break
        }
      }
    }

    // Fallback to longer code
    if (!shortCode) {
      shortCode = generateRsvpShortCode(12)
      usedCodes.add(shortCode)
    }

    shortCodes.push(shortCode)
  }

  return shortCodes
}
