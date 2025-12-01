import { trpc } from "@/trpc/client"

// Query hooks - RSVP Reports
export const useRsvpSummary = (eventId: string) => {
  return trpc.rsvpReports.getSummary.useQuery({ eventId }, { enabled: !!eventId })
}

export const useDietaryBreakdown = (eventId: string, enabled = true) => {
  return trpc.rsvpReports.getDietaryBreakdown.useQuery(
    { eventId },
    { enabled: !!eventId && enabled }
  )
}

export const useAccessibilityBreakdown = (eventId: string, enabled = true) => {
  return trpc.rsvpReports.getAccessibilityBreakdown.useQuery(
    { eventId },
    { enabled: !!eventId && enabled }
  )
}

export const useArrivalTimeline = (eventId: string, enabled = true) => {
  return trpc.rsvpReports.getArrivalTimeline.useQuery(
    { eventId },
    { enabled: !!eventId && enabled }
  )
}

export const useDepartureTimeline = (eventId: string, enabled = true) => {
  return trpc.rsvpReports.getDepartureTimeline.useQuery(
    { eventId },
    { enabled: !!eventId && enabled }
  )
}

export const useHotelRequirements = (eventId: string, enabled = true) => {
  return trpc.rsvpReports.getHotelRequirements.useQuery(
    { eventId },
    { enabled: !!eventId && enabled }
  )
}

export const useTransportRequirements = (eventId: string, enabled = true) => {
  return trpc.rsvpReports.getTransportRequirements.useQuery(
    { eventId },
    { enabled: !!eventId && enabled }
  )
}

export const useRsvpByCategory = (eventId: string, enabled = true) => {
  return trpc.rsvpReports.getByCategory.useQuery({ eventId }, { enabled: !!eventId && enabled })
}

export const useRsvpResponses = (
  eventId: string,
  filters?: {
    status?: "confirmed" | "declined" | "maybe"
    categoryId?: string
    dietaryType?: string
    accessibilityType?: string
    hotelRequired?: boolean
    transportRequired?: boolean
    limit?: number
    offset?: number
  }
) => {
  return trpc.rsvpReports.getResponses.useQuery(
    {
      eventId,
      ...filters,
    },
    { enabled: !!eventId }
  )
}

export const useExportRsvpData = (
  eventId: string,
  options?: {
    format?: "csv" | "json"
    includeCustomFields?: boolean
  },
  enabled = false
) => {
  return trpc.rsvpReports.exportData.useQuery(
    {
      eventId,
      format: options?.format ?? "json",
      includeCustomFields: options?.includeCustomFields ?? true,
    },
    { enabled: !!eventId && enabled }
  )
}
