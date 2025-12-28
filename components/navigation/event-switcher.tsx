"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { trpc } from "@/trpc/client"
import { ErrorBoundary } from "react-error-boundary"

import { createRoute } from "@/lib/routes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/global/alert"
import { Icons } from "@/components/global/icons"

type EventStatus =
  | "draft"
  | "planning"
  | "invitations_sent"
  | "rsvp_open"
  | "rsvp_closed"
  | "in_progress"
  | "completed"
  | "cancelled"

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

interface EventSwitcherProps {
  workspaceSlug: string
  currentEventSlug: string
}

export function EventSwitcher({ workspaceSlug, currentEventSlug }: EventSwitcherProps) {
  return (
    <Suspense fallback={<EventSwitcherSkeleton />}>
      <ErrorBoundary
        fallbackRender={({ error }) => (
          <Alert
            variant="error"
            title={error.message || "An error occurred"}
            icon="alertTriangle"
          />
        )}
      >
        <EventSwitcherSuspense
          workspaceSlug={workspaceSlug}
          currentEventSlug={currentEventSlug}
        />
      </ErrorBoundary>
    </Suspense>
  )
}

function EventSwitcherSuspense({ workspaceSlug, currentEventSlug }: EventSwitcherProps) {
  const t = useTranslations()
  const [events] = trpc.events.getMany.useSuspenseQuery({ workspaceSlug })
  const { state } = useSidebar()

  const currentEvent = events.find((e) => e.slug === currentEventSlug)

  // Get start of today for filtering
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Filter to upcoming events (startDate >= today), sort ASC (earliest first), limit to 10
  const upcomingEvents = events
    .filter((event) => event.startDate && new Date(event.startDate) >= today)
    .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())
    .slice(0, 10)

  // Ensure current event is always included (even if past) so user sees their selection
  const displayEvents =
    currentEvent && !upcomingEvents.some((e) => e.id === currentEvent.id)
      ? [currentEvent, ...upcomingEvents].slice(0, 10)
      : upcomingEvents

  return (
    <SidebarMenu aria-label="Event switcher">
      <SidebarMenuItem className="w-full" aria-label="Event switcher">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size={state === "collapsed" ? "lg" : "default"}
              className="group/event text-primary/95 ring-ring hover:bg-primary/[0.03] hover:text-accent-foreground data-[state=open]:bg-primary/[0.075] dark:hover:bg-primary/5 px-2 transition-all group-data-[state=collapsed]:p-0 focus-visible:ring-2 focus-visible:outline-hidden"
              tooltip={currentEvent ? `Event: ${currentEvent.name}` : t("nav.selectEvent")}
            >
              <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-md">
                <Icons.calendar className="text-primary size-4" />
              </div>
              <span className="truncate text-left text-sm leading-tight font-medium">
                {currentEvent?.name ?? t("nav.selectEvent")}
              </span>
              <Icons.chevronsUpDown className="text-muted-foreground group-hover/event:text-primary ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="ml-1 w-72" side="bottom" align="start">
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {t("nav.switchEvent")}
            </DropdownMenuLabel>
            <ScrollArea className="max-h-64 flex-1">
              <div className="flex flex-col gap-y-0.5 py-1">
                {displayEvents.map((event) => {
                  const status = statusConfig[event.status as EventStatus]
                  const isActive = event.slug === currentEventSlug

                  return (
                    <DropdownMenuItem
                      key={event.id}
                      asChild
                      className={`cursor-pointer ${isActive ? "bg-accent" : ""}`}
                    >
                      <Link
                        prefetch
                        href={createRoute("event-detail", {
                          slug: workspaceSlug,
                          eventSlug: event.slug,
                        }).href}
                        className="flex w-full items-center justify-between gap-2"
                      >
                        <span className="truncate">{event.name}</span>
                        <Badge variant={status.variant} className="shrink-0 text-xs">
                          {t(`event.status.${event.status}`) || status.label}
                        </Badge>
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </div>
            </ScrollArea>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link
                  prefetch
                  href={createRoute("events", { slug: workspaceSlug }).href}
                >
                  <Icons.layoutGrid className="text-muted-foreground mr-2 size-4" />
                  {t("nav.viewAllEvents")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function EventSwitcherSkeleton() {
  return (
    <div className="flex w-full items-center px-2 py-1.5 group-data-[collapsible=icon]:px-0">
      <div className="flex items-center gap-x-2">
        <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-md">
          <Icons.calendar className="text-primary/40 size-4" />
        </div>
        <div className="grid flex-1 gap-y-1.5 group-data-[collapsible=icon]:hidden">
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Icons.chevronsUpDown className="text-primary/60 ml-auto size-4" />
    </div>
  )
}
