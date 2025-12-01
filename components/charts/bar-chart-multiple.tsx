"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"

type BarChartMultipleProps = {
  bar1Label: string
  bar2Label: string
  chartData: {
    tag: string
    bar1: number
    bar2: number
  }[]
}

export function BarChartMultiple({ bar1Label, bar2Label, chartData }: BarChartMultipleProps) {
  const chartConfig = {
    bar1: {
      label: bar1Label,
      color: "var(--chart-5)",
    },
    bar2: {
      label: bar2Label,
      color: "var(--chart-3)",
    },
  } satisfies ChartConfig

  return (
    <ChartContainer config={chartConfig} className="h-72 w-full">
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="tag"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 12)}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
        <Bar dataKey="bar1" fill="var(--color-bar1)" radius={4} />
        <Bar dataKey="bar2" fill="var(--color-bar2)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}

export function BarChartMultipleSkeleton() {
  return (
    <div className="grid h-72 w-full grid-cols-6 gap-8">
      <div className="grid grid-cols-2 items-end gap-2">
        <Skeleton className="col-span-1 h-full" />
        <Skeleton className="col-span-1 h-1/3" />
      </div>
      <div className="grid grid-cols-2 items-end gap-2">
        <Skeleton className="col-span-1 h-5/6" />
        <Skeleton className="col-span-1 h-1/3" />
      </div>
      <div className="grid grid-cols-2 items-end gap-2">
        <Skeleton className="col-span-1 h-4/6" />
        <Skeleton className="col-span-1 h-1/3" />
      </div>
      <div className="grid grid-cols-2 items-end gap-2">
        <Skeleton className="col-span-1 h-3/6" />
        <Skeleton className="col-span-1 h-1/3" />
      </div>
      <div className="grid grid-cols-2 items-end gap-2">
        <Skeleton className="col-span-1 h-full" />
        <Skeleton className="col-span-1 h-1/3" />
      </div>
      <div className="grid grid-cols-2 items-end gap-2">
        <Skeleton className="col-span-1 h-full" />
        <Skeleton className="col-span-1 h-1/3" />
      </div>
    </div>
  )
}
