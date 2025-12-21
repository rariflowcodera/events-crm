"use client"

import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { Users, TrendingUp, UserCheck, UserX } from "lucide-react"

import {
  useGuestStats,
  useGuestStatsByCategoryAndStatus,
} from "@/trpc/hooks/guests-hooks"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Icons } from "@/components/global/icons"
import { DashboardStatTile } from "./dashboard-stat-tile"
import { CategoryStatusChart } from "./category-status-chart"
import { LocationPreviewPlaceholder } from "./location-preview-placeholder"

type EventStatus =
  | "draft"
  | "planning"
  | "invitations_sent"
  | "rsvp_open"
  | "rsvp_closed"
  | "in_progress"
  | "completed"
  | "cancelled"

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
  // Location coordinates from Google Places
  latitude: string | null
  longitude: string | null
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

export function EventOverviewTab({
  event,
  workspaceSlug,
}: EventOverviewTabProps) {
  const t = useTranslations()
  const { data: stats, isLoading: statsLoading } = useGuestStats(event.id)
  const { data: categoryStats, isLoading: categoryStatsLoading } =
    useGuestStatsByCategoryAndStatus(event.id)

  // Calculate metrics
  const totalGuests = stats?.total ?? 0
  const confirmedGuests =
    stats?.byStatus?.find((s) => s.status === "confirmed")?.count ?? 0
  const declinedGuests =
    stats?.byStatus?.find((s) => s.status === "declined")?.count ?? 0
  const pendingGuests =
    stats?.byStatus?.find((s) => s.status === "pending")?.count ?? 0
  const maybeGuests =
    stats?.byStatus?.find((s) => s.status === "maybe")?.count ?? 0
  const attendedGuests =
    stats?.byStatus?.find((s) => s.status === "attended")?.count ?? 0
  const notAttendedGuests = stats?.attendance?.notAttended ?? 0

  const responseRate =
    totalGuests > 0
      ? Math.round(
          ((confirmedGuests + declinedGuests + maybeGuests) / totalGuests) * 100
        )
      : 0

  return (
    <div className="space-y-6">
      {/* ROW 1: Stat Tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatTile
          label={t("event.dashboard.totalInvited")}
          value={totalGuests}
          icon={Users}
          isLoading={statsLoading}
        />
        <DashboardStatTile
          label={t("event.dashboard.responseRate")}
          value={`${responseRate}%`}
          icon={TrendingUp}
          variant={
            responseRate >= 50
              ? "success"
              : responseRate > 0
                ? "warning"
                : "default"
          }
          isLoading={statsLoading}
        />
        <DashboardStatTile
          label={t("event.dashboard.attended")}
          value={attendedGuests}
          icon={UserCheck}
          variant={attendedGuests > 0 ? "success" : "muted"}
          isLoading={statsLoading}
        />
        <DashboardStatTile
          label={t("event.dashboard.notAttended")}
          value={notAttendedGuests}
          icon={UserX}
          variant={notAttendedGuests > 0 ? "warning" : "muted"}
          isLoading={statsLoading}
        />
      </div>

      {/* ROW 2: Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* RSVP Response Rate Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("event.dashboard.rsvpBreakdown")}
            </CardTitle>
            <CardDescription>
              {t("event.dashboard.rsvpBreakdownDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {statsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-full" />
                <div className="grid grid-cols-3 gap-2">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      {t("event.dashboard.responseRate")}
                    </span>
                    <span className="text-2xl font-bold">{responseRate}%</span>
                  </div>
                  <Progress value={responseRate} className="h-3" />
                  <p className="text-muted-foreground text-xs">
                    {confirmedGuests + declinedGuests + maybeGuests} of{" "}
                    {totalGuests} {t("event.dashboard.guestsResponded")}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <StatusCard
                    label={t("event.dashboard.statusConfirmed")}
                    count={confirmedGuests}
                    color="bg-green-500"
                    icon={Icons.check}
                  />
                  <StatusCard
                    label={t("event.dashboard.statusPending")}
                    count={pendingGuests}
                    color="bg-yellow-500"
                    icon={Icons.clock}
                  />
                  <StatusCard
                    label={t("event.dashboard.statusDeclined")}
                    count={declinedGuests}
                    color="bg-red-500"
                    icon={Icons.x}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Category Status Chart */}
        <CategoryStatusChart
          data={categoryStats || []}
          isLoading={categoryStatsLoading}
        />
      </div>

      {/* ROW 3: Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Event Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("event.dashboard.eventDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.description && (
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  {t("event.fields.description")}
                </p>
                <p className="text-sm">{event.description}</p>
              </div>
            )}
            {event.rsvpDeadline && (
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  {t("event.fields.rsvpDeadline")}
                </p>
                <p className="text-sm">
                  {format(new Date(event.rsvpDeadline), "MMMM d, yyyy")}
                </p>
              </div>
            )}
            {event.maxGuests && (
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  {t("event.fields.maxGuests")}
                </p>
                <p className="text-sm">
                  {event.maxGuests} {t("event.dashboard.guests")}
                </p>
              </div>
            )}
            {!event.description && !event.rsvpDeadline && !event.maxGuests && (
              <p className="text-muted-foreground text-sm italic">
                {t("event.dashboard.noDetailsYet")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Location Card */}
        <LocationPreviewPlaceholder
          venue={event.venue}
          venueAddress={event.venueAddress}
          latitude={event.latitude}
          longitude={event.longitude}
        />
      </div>
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
      <div
        className={`mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full ${color}/10`}
      >
        <Icon className={`h-4 w-4 ${color.replace("bg-", "text-")}`} />
      </div>
      <p className="text-lg font-semibold">{count}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  )
}
