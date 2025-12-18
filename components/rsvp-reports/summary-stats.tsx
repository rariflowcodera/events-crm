"use client"

import { useTranslations } from "next-intl"
import { Users, CheckCircle2, XCircle, HelpCircle, Clock } from "lucide-react"
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, CartesianGrid } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

interface SummaryStatsProps {
  stats: {
    total: number
    confirmed: number
    declined: number
    maybe: number
    pending: number
  }
  timelineData?: {
    date: string
    confirmed: number
    declined: number
    maybe: number
  }[]
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

export function SummaryStats({ stats, timelineData, isLoading }: SummaryStatsProps) {
  const t = useTranslations("rsvpReports")

  const statusChartConfig = {
    confirmed: { label: t("confirmed"), color: "hsl(142 76% 36%)" },
    declined: { label: t("declined"), color: "hsl(0 84% 60%)" },
    maybe: { label: t("maybe"), color: "hsl(45 93% 47%)" },
    pending: { label: t("pending"), color: "hsl(215 14% 64%)" },
  } satisfies ChartConfig

  const timelineChartConfig = {
    confirmed: { label: t("confirmed"), color: "hsl(142 76% 36%)" },
    declined: { label: t("declined"), color: "hsl(0 84% 60%)" },
    maybe: { label: t("maybe"), color: "hsl(45 93% 47%)" },
  } satisfies ChartConfig

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
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
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-5 w-32 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted rounded" />
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-5 w-32 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const total = stats.total || 1 // Avoid division by zero

  // Prepare pie chart data
  const pieData = [
    { name: "confirmed", value: stats.confirmed, fill: "var(--color-confirmed)" },
    { name: "declined", value: stats.declined, fill: "var(--color-declined)" },
    { name: "maybe", value: stats.maybe, fill: "var(--color-maybe)" },
    { name: "pending", value: stats.pending, fill: "var(--color-pending)" },
  ].filter((item) => item.value > 0)

  // Format timeline data for display
  const formattedTimelineData =
    timelineData?.map((item) => ({
      ...item,
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    })) ?? []

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

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Response Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("responseBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ChartContainer config={statusChartConfig} className="mx-auto aspect-square h-64">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="name" />}
                    className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                {t("noResponses")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response Timeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("responseTimeline")}</CardTitle>
          </CardHeader>
          <CardContent>
            {formattedTimelineData.length > 0 ? (
              <ChartContainer config={timelineChartConfig} className="h-64 w-full">
                <AreaChart
                  data={formattedTimelineData}
                  margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={12}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    dataKey="confirmed"
                    type="monotone"
                    fill="var(--color-confirmed)"
                    fillOpacity={0.4}
                    stroke="var(--color-confirmed)"
                    stackId="1"
                  />
                  <Area
                    dataKey="declined"
                    type="monotone"
                    fill="var(--color-declined)"
                    fillOpacity={0.4}
                    stroke="var(--color-declined)"
                    stackId="1"
                  />
                  <Area
                    dataKey="maybe"
                    type="monotone"
                    fill="var(--color-maybe)"
                    fillOpacity={0.4}
                    stroke="var(--color-maybe)"
                    stackId="1"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                {t("noResponses")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
