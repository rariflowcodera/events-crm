import { GOOGLE_MAPS_API_KEY_ENV } from "@/env"

/**
 * Builds a clickable static map HTML for email templates
 */
export function buildStaticMapHtml(event: {
  latitude?: string | null
  longitude?: string | null
  venue?: string | null
}): string {
  if (!event.latitude || !event.longitude) {
    return ""
  }

  const lat = event.latitude
  const lng = event.longitude
  const alt = event.venue || "Event Location"

  const mapUrl = buildStaticMapUrl(lat, lng)
  const linkUrl = buildGoogleMapsLink(lat, lng)

  return `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" style="display: block;"><img src="${mapUrl}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 8px; display: block;" /></a>`
}

/**
 * Builds a Google Maps link for the given coordinates
 */
export function buildGoogleMapsLink(
  lat?: string | null,
  lng?: string | null
): string {
  if (!lat || !lng) return ""
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

/**
 * Builds a static map URL (without HTML wrapper)
 */
export function buildStaticMapUrl(
  lat: string,
  lng: string,
  options?: {
    width?: number
    height?: number
    zoom?: number
  }
): string {
  const { width = 600, height = 300, zoom = 15 } = options || {}

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: zoom.toString(),
    size: `${width}x${height}`,
    scale: "2", // Retina support
    markers: `color:red|${lat},${lng}`,
    key: GOOGLE_MAPS_API_KEY_ENV,
  })

  return `https://maps.googleapis.com/maps/api/staticmap?${params}`
}
