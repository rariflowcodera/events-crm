"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { formatEventDateTime } from "@/lib/date-utils"
import { createRoute } from "@/lib/routes"
import { useDeleteEvent } from "@/trpc/hooks/events-hooks"
import { useExportGuests } from "@/trpc/hooks/guests-hooks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Icons } from "@/components/global/icons"
import { DuplicateEventDialog } from "@/components/events/duplicate-event-dialog"

type EventStatus = "draft" | "planning" | "invitations_sent" | "rsvp_open" | "rsvp_closed" | "in_progress" | "completed" | "cancelled"

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
  startTime: string | null
  endTime: string | null
  status: EventStatus
  createdAt: Date
}

interface EventHeaderProps {
  event: Event
  workspaceSlug: string
}

const statusConfig: Record<
  EventStatus,
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

export function EventHeader({ event, workspaceSlug }: EventHeaderProps) {
  const t = useTranslations("event")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const { label, variant } = statusConfig[event.status]

  // Dialog states
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)

  const { mutate: deleteEvent, isPending: isDeleting } = useDeleteEvent({
    onSuccess: () => {
      router.push(createRoute("events", { slug: workspaceSlug }).href)
    },
  })

  const { exportGuests, isExporting } = useExportGuests(event.id, event.slug)

  const handleDelete = () => {
    deleteEvent({ eventId: event.id })
  }

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href={createRoute("events", { slug: workspaceSlug }).href}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
      >
        <Icons.arrowLeft className="h-4 w-4" />
        <span>Events</span>
      </Link>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{event.name}</h1>
            <Badge variant={variant}>
              {t(`status.${event.status}`) || label}
            </Badge>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {event.startDate && (
              <div className="flex items-center gap-1">
                <Icons.calendar className="h-4 w-4" />
                <span>
                  {formatEventDateTime({
                    startDate: new Date(event.startDate),
                    endDate: event.endDate ? new Date(event.endDate) : null,
                    startTime: event.startTime,
                    endTime: event.endTime,
                  })}
                </span>
              </div>
            )}
            {event.venue && (
              <div className="flex items-center gap-1">
                <Icons.mapPin className="h-4 w-4" />
                <span>{event.venue}</span>
              </div>
            )}
            {event.eventType && (
              <div className="flex items-center gap-1">
                <Icons.layers className="h-4 w-4" />
                <span>{event.eventType}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Dedicated Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={exportGuests}
            disabled={isExporting}
          >
            {isExporting ? (
              <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.download className="mr-2 h-4 w-4" />
            )}
            {tCommon("export")}
          </Button>

          <AlertDialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Icons.actions className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setDuplicateDialogOpen(true)}>
                  <Icons.copy className="mr-2 h-4 w-4" />
                  Duplicate Event
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={exportGuests} disabled={isExporting}>
                  <Icons.download className="mr-2 h-4 w-4" />
                  Export Guests
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem className="text-destructive">
                    <Icons.trash className="mr-2 h-4 w-4" />
                    Delete Event
                  </DropdownMenuItem>
                </AlertDialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Event</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{event.name}"? This will also delete all
                  guests, categories, and RSVP data associated with this event. This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Event"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Duplicate Event Dialog */}
      <DuplicateEventDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        event={{ id: event.id, name: event.name }}
        workspaceSlug={workspaceSlug}
      />
    </div>
  )
}
