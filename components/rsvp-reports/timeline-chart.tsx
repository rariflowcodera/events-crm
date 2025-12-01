"use client"

import { useTranslations } from "next-intl"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { format } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface TimelineData {
  date: Date | string | null
  count: number
}

interface TimelineChartProps {
  title: string
  description?: string
  data: TimelineData[]
  isLoading?: boolean
  color?: string
  locale?: "en" | "ar"
}

export function TimelineChart({
  title,
  description,
  data,
  isLoading,
  color = "#3b82f6",
  locale = "en",
}: TimelineChartProps) {
  const t = useTranslations("rsvpReports")

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse h-full w-full bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  // Filter out null dates and format for chart
  const chartData = data
    .filter((item) => item.date !== null && item.count > 0)
    .map((item) => {
      const date = typeof item.date === "string" ? new Date(item.date) : item.date
      return {
        date: date,
        dateLabel: date ? format(date, "MMM d") : "",
        fullDate: date ? format(date, "EEEE, MMM d, yyyy") : "",
        count: item.count,
      }
    })
    .sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0))

  const total = chartData.reduce((sum, item) => sum + item.count, 0)

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">{t("noData")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => [value, t("guests")]}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullDate
                  }
                  return label
                }}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm text-muted-foreground text-center">
          {t("totalGuests")}: <span className="font-medium text-foreground">{total}</span>
        </div>
      </CardContent>
    </Card>
  )
}
