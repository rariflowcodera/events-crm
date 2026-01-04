/**
 * Utility functions for generating RSVP URLs
 * Uses custom domain when configured and verified, otherwise falls back to app URL
 */

interface EventWithCustomDomain {
  customDomain: string | null
  customDomainVerified: boolean | null
}

/**
 * Guest token info - supports both short code and full token
 */
interface GuestRsvpTokens {
  rsvpToken: string
  rsvpShortCode?: string | null
}

/**
 * Get the base URL for RSVP links for an event
 * Uses custom domain if verified, otherwise falls back to app URL
 */
export function getRsvpBaseUrl(event: EventWithCustomDomain): string {
  if (event.customDomain && event.customDomainVerified) {
    return `https://${event.customDomain}`
  }
  // Client-side: use current origin (works regardless of build-time env vars)
  // Server-side: use env var with localhost fallback for development
  if (typeof window !== "undefined") {
    return window.location.origin
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
}

/**
 * Get full RSVP URL for a guest
 * Accepts either a token string (legacy) or guest object with both tokens
 * Prefers short code when available for cleaner URLs
 */
export function getRsvpUrl(
  event: EventWithCustomDomain,
  tokenOrGuest: string | GuestRsvpTokens
): string {
  const baseUrl = getRsvpBaseUrl(event)

  // Support legacy string format
  if (typeof tokenOrGuest === "string") {
    return `${baseUrl}/rsvp/${tokenOrGuest}`
  }

  // Prefer short code when available
  const token = tokenOrGuest.rsvpShortCode || tokenOrGuest.rsvpToken
  return `${baseUrl}/rsvp/${token}`
}

/**
 * Get the short RSVP URL specifically (for copy to clipboard)
 * Returns null if no short code is available
 */
export function getShortRsvpUrl(
  event: EventWithCustomDomain,
  guest: GuestRsvpTokens
): string | null {
  if (!guest.rsvpShortCode) {
    return null
  }
  const baseUrl = getRsvpBaseUrl(event)
  return `${baseUrl}/rsvp/${guest.rsvpShortCode}`
}

/**
 * Get the full (UUID) RSVP URL
 * Always uses the full UUID token
 */
export function getFullRsvpUrl(
  event: EventWithCustomDomain,
  guest: GuestRsvpTokens
): string {
  const baseUrl = getRsvpBaseUrl(event)
  return `${baseUrl}/rsvp/${guest.rsvpToken}`
}

/**
 * Get RSVP confirm link (direct confirmation)
 */
export function getRsvpConfirmUrl(event: EventWithCustomDomain, rsvpToken: string): string {
  return `${getRsvpUrl(event, rsvpToken)}?action=confirm`
}

/**
 * Get RSVP decline link (direct decline)
 */
export function getRsvpDeclineUrl(event: EventWithCustomDomain, rsvpToken: string): string {
  return `${getRsvpUrl(event, rsvpToken)}?action=decline`
}

/**
 * Get VAPP (Vehicle Access Parking Permit) URL for a guest
 * Custom domains use /vapp/{token} without locale prefix
 * Main app uses /en/vapp/{token} with locale prefix
 */
export function getVappUrl(event: EventWithCustomDomain, rsvpToken: string): string {
  const baseUrl = getRsvpBaseUrl(event)

  // Custom domains: no locale prefix (use ?lang=ar for Arabic)
  if (event.customDomain && event.customDomainVerified) {
    return `${baseUrl}/vapp/${rsvpToken}`
  }

  // Main app: include locale prefix
  return `${baseUrl}/en/vapp/${rsvpToken}`
}

/**
 * Get form URL for a guest token
 * Forms use /forms/t/{token} without locale prefix (same for custom domains and main app)
 */
export function getFormUrl(event: EventWithCustomDomain, formToken: string): string {
  const baseUrl = getRsvpBaseUrl(event)
  return `${baseUrl}/forms/t/${formToken}`
}
