"use client"

import { useTranslations } from "next-intl"
import {
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  UtensilsCrossed,
  Accessibility,
  Hotel,
  Car,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SummaryStatsProps {
  stats: {
    total: number
    confirmed: number
    declined: number
    maybe: number
    pending: number
    withDietaryNeeds: number
    withAccessibilityNeeds: number
    needingHotel: number
    needingTransport: number
  }
  isLoading?: boolean
}

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  variant?: "default" | "success" | "destructive" | "warning" | "muted"
  percentage?: number
}

function StatCard({ title, value, icon, variant = "default", percentage }: StatCardProps) {
  const variantStyles = {
    default: "text-foreground",
    success: "text-green-600 dark:text-green-400",
    destructive: "text-red-600 dark:text-red-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    muted: "text-muted-foreground",
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn("h-4 w-4", variantStyles[variant])}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", variantStyles[variant])}>{value}</div>
        {percentage !== undefined && (
          <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% of total</p>
        )}
      </CardContent>
    </Card>
  )
}

export function SummaryStats({ stats, isLoading }: SummaryStatsProps) {
  const t = useTranslations("rsvpReports")

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-20 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-12 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const total = stats.total || 1 // Avoid division by zero

  return (
    <div className="space-y-6">
      {/* Primary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title={t("totalInvited")}
          value={stats.total}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title={t("confirmed")}
          value={stats.confirmed}
          icon={<CheckCircle2 className="h-4 w-4" />}
          variant="success"
          percentage={(stats.confirmed / total) * 100}
        />
        <StatCard
          title={t("declined")}
          value={stats.declined}
          icon={<XCircle className="h-4 w-4" />}
          variant="destructive"
          percentage={(stats.declined / total) * 100}
        />
        <StatCard
          title={t("maybe")}
          value={stats.maybe}
          icon={<HelpCircle className="h-4 w-4" />}
          variant="warning"
          percentage={(stats.maybe / total) * 100}
        />
        <StatCard
          title={t("pending")}
          value={stats.pending}
          icon={<Clock className="h-4 w-4" />}
          variant="muted"
          percentage={(stats.pending / total) * 100}
        />
      </div>

      {/* Service Needs Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("dietaryNeeds")}
          value={stats.withDietaryNeeds}
          icon={<UtensilsCrossed className="h-4 w-4" />}
          percentage={(stats.withDietaryNeeds / total) * 100}
        />
        <StatCard
          title={t("accessibilityNeeds")}
          value={stats.withAccessibilityNeeds}
          icon={<Accessibility className="h-4 w-4" />}
          percentage={(stats.withAccessibilityNeeds / total) * 100}
        />
        <StatCard
          title={t("needingHotel")}
          value={stats.needingHotel}
          icon={<Hotel className="h-4 w-4" />}
          percentage={(stats.needingHotel / total) * 100}
        />
        <StatCard
          title={t("needingTransport")}
          value={stats.needingTransport}
          icon={<Car className="h-4 w-4" />}
          percentage={(stats.needingTransport / total) * 100}
        />
      </div>
    </div>
  )
}
