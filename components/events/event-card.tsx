"use client"

import { useTranslations } from "next-intl"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Icons } from "@/components/global/icons"

interface Event {
  id: string
  name: string
  slug: string
  description: string | null
  eventType: string | null
  venue: string | null
  startDate: Date | null
  endDate: Date | null
  status: "draft" | "planning" | "invitations_sent" | "rsvp_open" | "rsvp_closed" | "in_progress" | "completed" | "cancelled"
  createdAt: Date
  creator: {
    id: string
    name: string | null
    image: string | null
  } | null
}

interface EventCardProps {
  event: Event
}

const statusConfig: Record<
  Event["status"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  planning: { label: "Planning", variant: "outline" },
  invitations_sent: { label: "Invitations Sent", variant: "default" },
  rsvp_open: { label: "RSVP Open", variant: "default" },
  rsvp_closed: { label: "RSVP Closed", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
}

export function EventCard({ event }: EventCardProps) {
  const t = useTranslations("event")
  const { label, variant } = statusConfig[event.status]

  return (
    <Card className="group h-full transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1 text-lg">{event.name}</CardTitle>
          <Badge variant={variant} className="shrink-0">
            {t(`status.${event.status}`) || label}
          </Badge>
        </div>
        {event.eventType && (
          <p className="text-muted-foreground text-sm">{event.eventType}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {event.startDate && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Icons.calendar className="h-4 w-4" />
            <span>
              {format(new Date(event.startDate), "MMM d, yyyy")}
              {event.endDate && event.endDate !== event.startDate && (
                <> - {format(new Date(event.endDate), "MMM d, yyyy")}</>
              )}
            </span>
          </div>
        )}
        {event.venue && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Icons.mapPin className="h-4 w-4" />
            <span className="line-clamp-1">{event.venue}</span>
          </div>
        )}
        {event.description && (
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {event.description}
          </p>
        )}
        {!event.startDate && !event.venue && !event.description && (
          <p className="text-muted-foreground text-sm italic">
            No details added yet
          </p>
        )}
      </CardContent>
    </Card>
  )
}
