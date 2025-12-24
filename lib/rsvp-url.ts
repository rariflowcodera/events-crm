/**
 * Utility functions for generating RSVP URLs
 * Uses custom domain when configured and verified, otherwise falls back to app URL
 */

interface EventWithCustomDomain {
  customDomain: string | null
  customDomainVerified: boolean | null
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
 */
export function getRsvpUrl(event: EventWithCustomDomain, rsvpToken: string): string {
  const baseUrl = getRsvpBaseUrl(event)
  return `${baseUrl}/rsvp/${rsvpToken}`
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
 */
export function getVappUrl(event: EventWithCustomDomain, rsvpToken: string): string {
  const baseUrl = getRsvpBaseUrl(event)
  return `${baseUrl}/en/vapp/${rsvpToken}`
}
