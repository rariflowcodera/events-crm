"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { differenceInDays, isToday, isBefore, isAfter } from "date-fns"
import { DashboardStatTile } from "./dashboard-stat-tile"
import { Calendar, Clock } from "lucide-react"

interface EventCountdownTileProps {
  startDate: Date | null
  endDate?: Date | null
  isLoading?: boolean
}

export function EventCountdownTile({
  startDate,
  endDate,
  isLoading,
}: EventCountdownTileProps) {
  const t = useTranslations("event.dashboard")

  const { value, label, variant, icon } = useMemo(() => {
    if (!startDate) {
      return {
        value: "-",
        label: t("countdown"),
        variant: "muted" as const,
        icon: Calendar,
      }
    }

    const now = new Date()
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : start

    // Event is today or in progress
    if (isToday(start) || (isAfter(now, start) && isBefore(now, end))) {
      return {
        value: t("today"),
        label: t("countdown"),
        variant: "success" as const,
        icon: Clock,
      }
    }

    // Event is in the past
    if (isAfter(now, end)) {
      return {
        value: t("completed"),
        label: t("countdown"),
        variant: "muted" as const,
        icon: Calendar,
      }
    }

    // Event is in the future
    const daysUntil = differenceInDays(start, now)
    return {
      value: t("daysUntil", { days: daysUntil }),
      label: t("countdown"),
      variant: daysUntil <= 7 ? ("warning" as const) : ("default" as const),
      icon: Calendar,
    }
  }, [startDate, endDate, t])

  return (
    <DashboardStatTile
      label={label}
      value={value}
      icon={icon}
      variant={variant}
      isLoading={isLoading}
    />
  )
}
