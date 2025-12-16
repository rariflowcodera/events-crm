"use client"

import { useSearchParams } from "next/navigation"

import { EventOverviewTab } from "@/components/events/event-overview-tab"
import { EventGuestsTab } from "@/components/events/event-guests-tab"
import { EventCategoriesTab } from "@/components/events/event-categories-tab"
import { EventEmailsTab } from "@/components/email-templates/event-emails-tab"
import { EventReportsTab } from "@/components/events/event-reports-tab"
import { EventSettingsTab } from "@/components/events/event-settings-tab"
import { EventFormsTab } from "@/components/events/event-forms-tab"
import { EventBrandingTab } from "@/components/events/event-branding-tab"

type EventStatus = "draft" | "planning" | "invitations_sent" | "rsvp_open" | "rsvp_closed" | "in_progress" | "completed" | "cancelled"

interface GuestCategory {
  id: string
  name: string
  code: string
  description: string | null
  color: string | null
  sortOrder: number
  defaultEmailTemplateId: string | null
}

interface Event {
  id: string
  name: string
  slug: string
  description: string | null
  eventType: string | null
  venue: string | null
  venueAddress: string | null
  // Location coordinates from Google Places
  latitude: string | null
  longitude: string | null
  placeId: string | null
  city: string | null
  country: string | null
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
  // Custom domain fields
  customDomain: string | null
  customDomainVerified: boolean | null
  customDomainVerificationToken: string | null
}

interface EventTabsProps {
  event: Event
  workspaceSlug: string
  fullHeight?: boolean
}

type TabValue = "overview" | "guests" | "categories" | "forms" | "branding" | "emails" | "reports" | "settings"

const validTabs: TabValue[] = ["overview", "guests", "categories", "forms", "branding", "emails", "reports", "settings"]

/**
 * EventContent - Renders event tab content based on URL query parameter.
 * Navigation is now handled by the sidebar (NavEvent component).
 * This component only renders the appropriate content based on the ?tab= URL parameter.
 */
export function EventTabs({ event, workspaceSlug, fullHeight = false }: EventTabsProps) {
  const searchParams = useSearchParams()

  // Read tab from URL params, default to "overview"
  const tabFromUrl = searchParams.get("tab") as TabValue | null
  const activeTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : "overview"

  // Render the appropriate content based on the active tab
  switch (activeTab) {
    case "overview":
      return <EventOverviewTab event={event} workspaceSlug={workspaceSlug} />
    case "guests":
      return <EventGuestsTab event={event} workspaceSlug={workspaceSlug} fullHeight={fullHeight} />
    case "categories":
      return <EventCategoriesTab event={event} workspaceSlug={workspaceSlug} />
    case "forms":
      return <EventFormsTab event={event} workspaceSlug={workspaceSlug} />
    case "branding":
      return <EventBrandingTab event={event} workspaceSlug={workspaceSlug} />
    case "emails":
      return <EventEmailsTab event={event} workspaceSlug={workspaceSlug} />
    case "reports":
      return <EventReportsTab event={event} workspaceSlug={workspaceSlug} />
    case "settings":
      return <EventSettingsTab event={event} workspaceSlug={workspaceSlug} />
    default:
      return <EventOverviewTab event={event} workspaceSlug={workspaceSlug} />
  }
}
