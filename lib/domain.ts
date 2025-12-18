import { redis } from "@/lib/redis"
import { db } from "@/server/db/config/database"
import { events } from "@/server/db/schemas"
import { eq, and } from "drizzle-orm"

const DOMAIN_CACHE_PREFIX = "domain:"
const DOMAIN_CACHE_TTL = parseInt(process.env.DOMAIN_CACHE_TTL || "300", 10) // 5 minutes default

export interface DomainLookupResult {
  eventId: string
  workspaceId: string
  eventName: string
  customDomain: string
  verified: boolean
}

/**
 * Look up event by custom domain with Redis caching
 * Returns null if domain not found or not verified
 */
export async function getEventByCustomDomain(
  domain: string
): Promise<DomainLookupResult | null> {
  const normalizedDomain = domain.toLowerCase().trim()
  const cacheKey = `${DOMAIN_CACHE_PREFIX}${normalizedDomain}`

  // Try cache first
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      const parsed = JSON.parse(cached)
      // Handle cached "not found" results
      if (parsed === null) return null
      return parsed as DomainLookupResult
    }
  } catch (error) {
    console.error("Redis cache read error:", error)
    // Continue to database lookup on cache error
  }

  // Query database - only return verified domains
  const event = await db.query.events.findFirst({
    where: and(
      eq(events.customDomain, normalizedDomain),
      eq(events.customDomainVerified, true)
    ),
    columns: {
      id: true,
      workspaceId: true,
      name: true,
      customDomain: true,
      customDomainVerified: true,
    },
  })

  const result: DomainLookupResult | null = event
    ? {
        eventId: event.id,
        workspaceId: event.workspaceId,
        eventName: event.name,
        customDomain: event.customDomain!,
        verified: event.customDomainVerified ?? false,
      }
    : null

  // Cache result (including null for "not found" to prevent DB hammering)
  try {
    await redis.setex(cacheKey, DOMAIN_CACHE_TTL, JSON.stringify(result))
  } catch (error) {
    console.error("Redis cache write error:", error)
  }

  return result
}

/**
 * Check if a custom domain is valid (verified by at least one event)
 * Used when multiple events can share the same domain
 */
export async function isCustomDomainValid(domain: string): Promise<boolean> {
  const normalizedDomain = domain.toLowerCase().trim()
  const cacheKey = `${DOMAIN_CACHE_PREFIX}valid:${normalizedDomain}`

  // Try cache first
  try {
    const cached = await redis.get(cacheKey)
    if (cached !== null) {
      return cached === "1"
    }
  } catch (error) {
    console.error("Redis cache read error:", error)
  }

  // Query database - check if ANY event has this domain verified
  const event = await db.query.events.findFirst({
    where: and(
      eq(events.customDomain, normalizedDomain),
      eq(events.customDomainVerified, true)
    ),
    columns: { id: true },
  })

  const isValid = !!event

  // Cache result
  try {
    await redis.setex(cacheKey, DOMAIN_CACHE_TTL, isValid ? "1" : "0")
  } catch (error) {
    console.error("Redis cache write error:", error)
  }

  return isValid
}

/**
 * Look up event by custom domain without requiring verification
 * Used during the verification process itself
 */
export async function getEventByCustomDomainUnverified(
  domain: string
): Promise<(DomainLookupResult & { verificationToken: string | null }) | null> {
  const normalizedDomain = domain.toLowerCase().trim()

  const event = await db.query.events.findFirst({
    where: eq(events.customDomain, normalizedDomain),
    columns: {
      id: true,
      workspaceId: true,
      name: true,
      customDomain: true,
      customDomainVerified: true,
      customDomainVerificationToken: true,
    },
  })

  if (!event) return null

  return {
    eventId: event.id,
    workspaceId: event.workspaceId,
    eventName: event.name,
    customDomain: event.customDomain!,
    verified: event.customDomainVerified ?? false,
    verificationToken: event.customDomainVerificationToken,
  }
}

/**
 * Invalidate domain cache when domain is updated or removed
 */
export async function invalidateDomainCache(domain: string): Promise<void> {
  const normalizedDomain = domain.toLowerCase().trim()
  const cacheKey = `${DOMAIN_CACHE_PREFIX}${normalizedDomain}`
  const validityCacheKey = `${DOMAIN_CACHE_PREFIX}valid:${normalizedDomain}`

  try {
    await redis.del(cacheKey, validityCacheKey)
  } catch (error) {
    console.error("Redis cache invalidation error:", error)
  }
}

/**
 * Check if a host is the main application domain
 * Used to distinguish between main app and custom domain requests
 */
export function isMainAppDomain(host: string): boolean {
  const mainDomains = getMainAppDomains()
  const normalizedHost = host.toLowerCase().trim()

  return mainDomains.some(
    (domain) =>
      normalizedHost === domain || normalizedHost.endsWith(`.${domain}`)
  )
}

/**
 * Get list of main application domains from environment
 */
export function getMainAppDomains(): string[] {
  const domains: string[] = []

  // Add domains from MAIN_APP_DOMAINS env var
  if (process.env.MAIN_APP_DOMAINS) {
    domains.push(
      ...process.env.MAIN_APP_DOMAINS.split(",").map((d) => d.trim().toLowerCase())
    )
  }

  // Add domain from NEXT_PUBLIC_APP_URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_APP_URL)
      domains.push(url.host.toLowerCase())
    } catch {
      // Invalid URL, skip
    }
  }

  // Always include localhost for development
  domains.push("localhost:3000", "localhost")

  // Remove duplicates
  return [...new Set(domains)]
}

/**
 * Validate domain format
 * Returns true if the domain appears to be a valid hostname
 */
export function isValidDomainFormat(domain: string): boolean {
  // Domain regex: allows subdomains, must have at least one dot, valid TLD
  const domainRegex =
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/

  return domainRegex.test(domain.toLowerCase().trim())
}
