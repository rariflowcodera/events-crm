import { ComponentProps } from "react"
import { db } from "@/server/db/config/database"
import { WorkspaceType } from "@/server/db/schema-types"
import { workspaceMembers, workspaces } from "@/server/db/schemas"
import { eq } from "drizzle-orm"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/global/user-avatar"

type AnalyticsMemberGridProps = {
  slug: WorkspaceType["slug"]
} & ComponentProps<typeof Card>

export async function AnalyticsMemberGrid({ slug, className }: AnalyticsMemberGridProps) {
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1)

  if (!workspace) return null

  const members = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.workspaceId, workspace.id),
    with: {
      user: true,
      role: true,
    },
  })

  return (
    <Card className={cn("flex h-72 w-full flex-col", className)}>
      <CardHeader>
        <CardTitle className="text-sm">Members</CardTitle>
        <CardDescription className="text-xs">
          Members of Organization and their roles
        </CardDescription>
      </CardHeader>
      <ScrollArea className="max-h-72 flex-1">
        <CardContent className="flex flex-col gap-y-2 p-0 pb-2">
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between gap-x-2 px-6 py-2 hover:bg-muted"
            >
              <div className="flex items-center gap-x-2">
                <UserAvatar user={member.user} size="xs" />
                <span className="text-sm">{member.user.name}</span>
              </div>
              <div className="text-sm text-muted-foreground capitalize">
                {member.role.name}
              </div>
            </div>
          ))}
        </CardContent>
      </ScrollArea>
    </Card>
  )
}

export function AnalyticsMemberGridSkeleton() {
  return (
    <Card className="flex h-72 w-full flex-col">
      <CardHeader>
        <CardTitle className="text-sm">Members</CardTitle>
        <CardDescription className="text-xs">
          Members of Organization and their roles
        </CardDescription>
      </CardHeader>
      <ScrollArea className="max-h-72 flex-1">
        <CardContent className="flex flex-col gap-y-2 p-0 px-6 pb-2">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-full" />
        </CardContent>
      </ScrollArea>
    </Card>
  )
}
