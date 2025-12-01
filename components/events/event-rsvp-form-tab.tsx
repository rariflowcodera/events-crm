"use client"

import { RsvpFormBuilder } from "@/components/rsvp-form-builder"

type EventStatus = "draft" | "planning" | "invitations_sent" | "rsvp_open" | "rsvp_closed" | "in_progress" | "completed" | "cancelled"

interface GuestCategory {
  id: string
  name: string
  code: string
  description: string | null
  color: string | null
  sortOrder: number
}

interface Event {
  id: string
  name: string
  slug: string
  description: string | null
  eventType: string | null
  venue: string | null
  venueAddress: string | null
  startDate: Date | null
  endDate: Date | null
  rsvpDeadline: Date | null
  maxGuests: number | null
  status: EventStatus
  branding: {
    logo?: string
    primaryColor?: string
    secondaryColor?: string
  } | null
  settings: {
    allowPlusOne?: boolean
    maxPlusOnes?: number
    requireApproval?: boolean
    sendReminders?: boolean
    reminderDays?: number[]
  } | null
  guestCategories: GuestCategory[]
  createdAt: Date
}

interface EventRsvpFormTabProps {
  event: Event
  workspaceSlug: string
}

export function EventRsvpFormTab({ event, workspaceSlug }: EventRsvpFormTabProps) {
  return (
    <RsvpFormBuilder
      eventId={event.id}
      workspaceSlug={workspaceSlug}
      categories={event.guestCategories}
    />
  )
}
