"use client"

import { useTranslations } from "next-intl"

import { CreateEventButton } from "@/components/events/create-event-button"

interface EventsHeaderProps {
  slug: string
}

export function EventsHeader({ slug }: EventsHeaderProps) {
  const t = useTranslations("event")

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold">{t("events")}</h1>
        <p className="text-muted-foreground text-sm">
          Manage your events and track RSVPs
        </p>
      </div>
      <CreateEventButton slug={slug} />
    </div>
  )
}
