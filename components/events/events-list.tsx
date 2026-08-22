"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"

import { createRoute } from "@/lib/routes"
import { EventCard } from "@/components/events/event-card"
import { EmptyPlaceholder } from "@/components/global/empty-placeholder"
import { CreateEventButton } from "@/components/events/create-event-button"

interface Event {
  id: string
  name: string
  slug: string
  description: string | null
  coverImage: string | null
  eventType: string | null
  venue: string | null
  startDate: Date | null
  endDate: Date | null
  startTime: string | null
  endTime: string | null
  status: "draft" | "planning" | "invitations_sent" | "rsvp_open" | "rsvp_closed" | "in_progress" | "completed" | "cancelled"
  createdAt: Date
  creator: {
    id: string
    name: string | null
    image: string | null
  } | null
}

interface EventsListProps {
  events: Event[]
  slug: string
}

export function EventsList({ events, slug }: EventsListProps) {
  const t = useTranslations("event")

  if (events.length === 0) {
    return (
      <EmptyPlaceholder>
        <EmptyPlaceholder.Icon name="calendar" />
        <EmptyPlaceholder.Title>No events yet</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          Create your first event to start managing guests and RSVPs.
        </EmptyPlaceholder.Description>
        <CreateEventButton slug={slug} />
      </EmptyPlaceholder>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <Link
          key={event.id}
          href={createRoute("event-detail", { slug, eventSlug: event.slug }).href}
        >
          <EventCard event={event} />
        </Link>
      ))}
    </div>
  )
}
