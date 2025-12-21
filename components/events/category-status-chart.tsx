"use client"

import { useTranslations } from "next-intl"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface CategoryStatusData {
  categoryId: string
  categoryName: string
  categoryColor: string
  confirmed: number
  pending: number
  maybe: number
  declined: number
  total: number
}

interface CategoryStatusChartProps {
  data: CategoryStatusData[]
  isLoading?: boolean
}

const STATUS_COLORS = {
  confirmed: "#22c55e", // green-500
  pending: "#eab308", // yellow-500
  declined: "#ef4444", // red-500
}

export function CategoryStatusChart({
  data,
  isLoading,
}: CategoryStatusChartProps) {
  const t = useTranslations("event.dashboard")

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("guestsByCategory")}</CardTitle>
          <CardDescription>{t("guestsByCategoryDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("guestsByCategory")}</CardTitle>
          <CardDescription>{t("guestsByCategoryDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">{t("noCategories")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("guestsByCategory")}</CardTitle>
        <CardDescription>{t("guestsByCategoryDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="categoryName"
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
              <Bar
                dataKey="confirmed"
                name={t("statusConfirmed")}
                stackId="a"
                fill={STATUS_COLORS.confirmed}
              />
              <Bar
                dataKey="pending"
                name={t("statusPending")}
                stackId="a"
                fill={STATUS_COLORS.pending}
              />
              <Bar
                dataKey="declined"
                name={t("statusDeclined")}
                stackId="a"
                fill={STATUS_COLORS.declined}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
