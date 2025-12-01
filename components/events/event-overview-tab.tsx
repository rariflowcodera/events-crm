"use client"

import { useTranslations } from "next-intl"
import { format } from "date-fns"

import { useGuestStats } from "@/trpc/hooks/guests-hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Icons } from "@/components/global/icons"

type EventStatus = "draft" | "planning" | "invitations_sent" | "rsvp_open" | "rsvp_closed" | "in_progress" | "completed" | "cancelled"

interface GuestCategory {
  id: string
  name: string
  code: string
  color: string | null
  sortOrder: number
}

interface Event {
  id: string
  name: string
  slug: string
  description: string | null
  venue: string | null
  venueAddress: string | null
  startDate: Date | null
  endDate: Date | null
  rsvpDeadline: Date | null
  maxGuests: number | null
  status: EventStatus
  guestCategories: GuestCategory[]
}

interface EventOverviewTabProps {
  event: Event
  workspaceSlug: string
}

export function EventOverviewTab({ event, workspaceSlug }: EventOverviewTabProps) {
  const t = useTranslations()
  const { data: stats, isLoading: statsLoading } = useGuestStats(event.id)

  const totalGuests = stats?.total ?? 0
  const confirmedGuests = stats?.byStatus?.find((s) => s.status === "confirmed")?.count ?? 0
  const declinedGuests = stats?.byStatus?.find((s) => s.status === "declined")?.count ?? 0
  const pendingGuests = stats?.byStatus?.find((s) => s.status === "pending")?.count ?? 0
  const maybeGuests = stats?.byStatus?.find((s) => s.status === "maybe")?.count ?? 0

  const responseRate = totalGuests > 0
    ? Math.round(((confirmedGuests + declinedGuests + maybeGuests) / totalGuests) * 100)
    : 0

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* RSVP Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">RSVP Response Rate</CardTitle>
          <CardDescription>Track guest responses and attendance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {statsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-full" />
              <div className="grid grid-cols-4 gap-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Response Rate</span>
                  <span className="text-2xl font-bold">{responseRate}%</span>
                </div>
                <Progress value={responseRate} className="h-3" />
                <p className="text-muted-foreground text-xs">
                  {confirmedGuests + declinedGuests + maybeGuests} of {totalGuests} guests have responded
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <StatusCard
                  label="Confirmed"
                  count={confirmedGuests}
                  color="bg-green-500"
                  icon={Icons.check}
                />
                <StatusCard
                  label="Pending"
                  count={pendingGuests}
                  color="bg-yellow-500"
                  icon={Icons.clock}
                />
                <StatusCard
                  label="Maybe"
                  count={maybeGuests}
                  color="bg-blue-500"
                  icon={Icons.helpCircle}
                />
                <StatusCard
                  label="Declined"
                  count={declinedGuests}
                  color="bg-red-500"
                  icon={Icons.x}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Common tasks for this event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start" disabled>
            <Icons.mail className="mr-2 h-4 w-4" />
            Send Reminders to Pending Guests
          </Button>
          <Button variant="outline" className="w-full justify-start" disabled>
            <Icons.upload className="mr-2 h-4 w-4" />
            Export Guest List
          </Button>
          <Button variant="outline" className="w-full justify-start" disabled>
            <Icons.copy className="mr-2 h-4 w-4" />
            Copy RSVP Link Template
          </Button>
        </CardContent>
      </Card>

      {/* Event Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {event.description && (
            <div>
              <p className="text-muted-foreground text-sm font-medium">Description</p>
              <p className="text-sm">{event.description}</p>
            </div>
          )}
          {event.venue && (
            <div>
              <p className="text-muted-foreground text-sm font-medium">Venue</p>
              <p className="text-sm">{event.venue}</p>
              {event.venueAddress && (
                <p className="text-muted-foreground text-xs">{event.venueAddress}</p>
              )}
            </div>
          )}
          {event.rsvpDeadline && (
            <div>
              <p className="text-muted-foreground text-sm font-medium">RSVP Deadline</p>
              <p className="text-sm">{format(new Date(event.rsvpDeadline), "MMMM d, yyyy")}</p>
            </div>
          )}
          {event.maxGuests && (
            <div>
              <p className="text-muted-foreground text-sm font-medium">Maximum Capacity</p>
              <p className="text-sm">{event.maxGuests} guests</p>
            </div>
          )}
          {!event.description && !event.venue && !event.rsvpDeadline && !event.maxGuests && (
            <p className="text-muted-foreground text-sm italic">
              No additional details added yet. Update in Settings tab.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Categories Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">By Category</CardTitle>
          <CardDescription>Guest breakdown by category</CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : stats?.byCategory && stats.byCategory.length > 0 ? (
            <div className="space-y-3">
              {stats.byCategory.map((category) => (
                <div
                  key={category.categoryId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor:
                          event.guestCategories.find((c) => c.id === category.categoryId)?.color ||
                          "#6366f1",
                      }}
                    />
                    <span className="text-sm font-medium">{category.categoryName}</span>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {category.count} guest{category.count !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              No guests added yet. Add categories and guests to see breakdown.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusCard({
  label,
  count,
  color,
  icon: Icon,
}: {
  label: string
  count: number
  color: string
  icon: typeof Icons.check
}) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className={`mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full ${color}/10`}>
        <Icon className={`h-4 w-4 ${color.replace("bg-", "text-")}`} />
      </div>
      <p className="text-lg font-semibold">{count}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  )
}
