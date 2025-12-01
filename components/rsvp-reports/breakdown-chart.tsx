"use client"

import { useTranslations } from "next-intl"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface BreakdownData {
  type: string | null
  count: number
}

interface BreakdownChartProps {
  title: string
  description?: string
  data: BreakdownData[]
  isLoading?: boolean
  labels: Record<string, string>
  colors?: Record<string, string>
}

const DEFAULT_COLORS: Record<string, string> = {
  none: "#94a3b8", // slate-400
  vegetarian: "#22c55e", // green-500
  vegan: "#84cc16", // lime-500
  halal: "#f59e0b", // amber-500
  kosher: "#8b5cf6", // violet-500
  gluten_free: "#ec4899", // pink-500
  other: "#6b7280", // gray-500
  wheelchair: "#3b82f6", // blue-500
  hearing: "#10b981", // emerald-500
  visual: "#f97316", // orange-500
  mobility: "#a855f7", // purple-500
}

export function BreakdownChart({
  title,
  description,
  data,
  isLoading,
  labels,
  colors = DEFAULT_COLORS,
}: BreakdownChartProps) {
  const t = useTranslations("rsvpReports")

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse h-48 w-48 rounded-full bg-muted" />
        </CardContent>
      </Card>
    )
  }

  // Filter out empty data and prepare for chart
  const chartData = data
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: labels[item.type || "none"] || item.type || "None",
      value: item.count,
      type: item.type || "none",
    }))

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

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
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[entry.type] || DEFAULT_COLORS[entry.type] || "#6b7280"}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [value, t("guests")]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {chartData.map((item) => (
            <Badge
              key={item.type}
              variant="outline"
              className="gap-1"
              style={{
                borderColor: colors[item.type] || DEFAULT_COLORS[item.type] || "#6b7280",
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: colors[item.type] || DEFAULT_COLORS[item.type] || "#6b7280",
                }}
              />
              {item.name}: {item.value}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
