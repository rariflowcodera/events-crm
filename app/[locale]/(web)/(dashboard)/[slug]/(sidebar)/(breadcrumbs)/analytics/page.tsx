import { Suspense } from "react"
import { Metadata } from "next"

import { ROUTES } from "@/lib/routes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AnalyticsBarchart,
  AnalyticsBarchartSkeleton,
} from "@/components/analytics/analytics-bar-chart"
import { AnalyticsGrid, AnalyticsGridSkeleton } from "@/components/analytics/analytics-grid"
import {
  AnalyticsMemberGrid,
  AnalyticsMemberGridSkeleton,
} from "@/components/analytics/analytics-member-grid"
import { Icons } from "@/components/global/icons"
import { SectionWrapper } from "@/components/layout/section-wrapper"

export const metadata: Metadata = ROUTES.analytics.metadata

type AnalyticsProps = {
  params: Promise<{ slug: string }>
}

export default async function AnalyticsPage({ params }: AnalyticsProps) {
  const { slug } = await params

  return (
    <SectionWrapper>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={"ghost"} className="w-fit">
            Last 24 hours <Icons.chevronDown className="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel className="sr-only">Timestamps</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem>Last 24 hours</DropdownMenuItem>
            <DropdownMenuItem>Yesterday</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>This week</DropdownMenuItem>
            <DropdownMenuItem>Last 7 days</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>This month</DropdownMenuItem>
            <DropdownMenuItem>Last 30 days</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>This year</DropdownMenuItem>
            <DropdownMenuItem>Last 12 months</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>All time</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="flex size-full flex-col gap-y-4">
        <Suspense fallback={<AnalyticsGridSkeleton />}>
          <AnalyticsGrid slug={slug} />
        </Suspense>
        <Suspense fallback={<AnalyticsBarchartSkeleton />}>
          <AnalyticsBarchart slug={slug} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-x-4">
        <Suspense fallback={<AnalyticsMemberGridSkeleton />}>
          <AnalyticsMemberGrid slug={slug} />
        </Suspense>
      </div>
    </SectionWrapper>
  )
}
