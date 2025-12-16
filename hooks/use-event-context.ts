"use client"

import { usePathname } from "next/navigation"

/**
 * Hook to detect if the user is viewing an event based on the URL pathname.
 * Returns event context information including the event slug and workspace slug.
 *
 * URL Pattern: /[locale]/[slug]/events/[eventSlug]
 */
export function useEventContext() {
  const pathname = usePathname()

  // Split pathname into segments
  const segments = pathname.split("/").filter(Boolean)
  const eventsIndex = segments.indexOf("events")

  // Check if we're in event context (not create page or other non-event routes)
  const isEventContext =
    eventsIndex !== -1 &&
    segments[eventsIndex + 1] !== undefined &&
    !["create"].includes(segments[eventsIndex + 1])

  // Extract the event slug if in event context
  const eventSlug = isEventContext ? segments[eventsIndex + 1] : null

  // Extract workspace slug (after locale, which is at index 0)
  const workspaceSlug = segments[1] ?? null

  // Get the current tab from query params (this is read-only, state managed elsewhere)
  const currentTab = isEventContext ? "overview" : null // Will be overridden by URL params

  return {
    isEventContext,
    eventSlug,
    workspaceSlug,
    currentTab,
  }
}
