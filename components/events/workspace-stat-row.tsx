"use client"

import { useTranslations } from "next-intl"
import { Calendar, CalendarClock, TrendingUp, Users } from "lucide-react"

import { useWorkspaceStats } from "@/trpc/hooks/events-hooks"
import { DashboardStatTile } from "@/components/events/dashboard-stat-tile"

interface WorkspaceStatRowProps {
  slug: string
}

export function WorkspaceStatRow({ slug }: WorkspaceStatRowProps) {
  const t = useTranslations("event.dashboard")
  const { data, isLoading } = useWorkspaceStats(slug)

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <DashboardStatTile
        label={t("totalEvents")}
        value={data?.totalEvents ?? 0}
        icon={Calendar}
        isLoading={isLoading}
      />
      <DashboardStatTile
        label={t("upcomingEvents")}
        value={data?.upcomingEvents ?? 0}
        icon={CalendarClock}
        isLoading={isLoading}
      />
      <DashboardStatTile
        label={t("totalGuestsInvited")}
        value={data?.totalGuests ?? 0}
        icon={Users}
        isLoading={isLoading}
      />
      <DashboardStatTile
        label={t("overallResponseRate")}
        value={data?.responseRate != null ? `${data.responseRate}%` : "—"}
        icon={TrendingUp}
        isLoading={isLoading}
      />
    </div>
  )
}
