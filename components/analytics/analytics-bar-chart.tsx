import { db } from "@/server/db/config/database"
import { workspaceMembers, workspaces } from "@/server/db/schemas"
import { eq } from "drizzle-orm"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChartMultiple, BarChartMultipleSkeleton } from "@/components/charts/bar-chart-multiple"
import { Icons } from "@/components/global/icons"

type AnalyticsBarchartProps = {
  slug: string
}

export async function AnalyticsBarchart({ slug }: AnalyticsBarchartProps) {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
  })

  if (!workspace) {
    return null
  }

  const members = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.workspaceId, workspace.id),
    with: {
      role: true,
    },
  })

  const chartData = [
    {
      tag: "Members",
      bar1: members.filter((m) => m.role.name === "member").length,
      bar2: members.filter((m) => m.role.name === "admin" || m.role.name === "owner").length,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Icons.chart className="mr-2 size-4" />
          Organization Members
        </CardTitle>
        <CardDescription>Overview of members by role in the organization.</CardDescription>
      </CardHeader>
      <CardContent>
        <BarChartMultiple bar1Label="Members" bar2Label="Admins/Owners" chartData={chartData} />
      </CardContent>
    </Card>
  )
}

export async function AnalyticsBarchartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-80" />
      </CardHeader>
      <CardContent>
        <BarChartMultipleSkeleton />
      </CardContent>
    </Card>
  )
}
