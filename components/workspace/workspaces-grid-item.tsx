"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { WorkspaceType } from "@/server/db/schema-types"
import { format } from "date-fns"

import { createRoute } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { WorkspaceDeleteButton } from "@/components/buttons/workspace-delete-button"
import { ActionTooltip } from "@/components/global/action-tooltip"
import { Icons } from "@/components/global/icons"
import { LogoBadge } from "@/components/global/logo-badge"

type WorkspacesGridItemProps = {
  workspace: WorkspaceType
  canEdit?: boolean
}

export function WorkspacesGridItem({ workspace, canEdit = false }: WorkspacesGridItemProps) {
  const params = useParams()
  const slug = params.slug as string

  const isCurrentWorkspace = slug === workspace.slug

  return (
    <div className="hover:bg-os-background-100 flex items-center justify-between gap-x-4 p-4 transition-colors duration-200">
      <div className="flex items-start gap-x-2">
        <LogoBadge value={{ name: workspace.name, logo: workspace.logo }} size="2xl" hideText />

        <div className="flex flex-col gap-y-1">
          <div className="flex max-w-[30ch] items-center gap-x-2 truncate text-sm font-medium">
            {workspace.name}

            {isCurrentWorkspace ? (
              <Badge variant="outline" className="text-xs">
                Current workspace
              </Badge>
            ) : null}
          </div>
          <div className="text-muted-foreground text-xs">
            Created at {format(new Date(workspace.createdAt), "MMM d, yyyy")}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-x-2">
        <ActionTooltip label="Analytics" delayDuration={300}>
          <Button variant="ghost" size="sm">
            <Icons.graph />
            <span className="sr-only">Analytics</span>
          </Button>
        </ActionTooltip>
        {canEdit ? (
          <>
            <ActionTooltip label="Edit" delayDuration={300}>
              <Link
                href={createRoute("settings-workspace", { slug: workspace.slug }).href}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                <Icons.edit />
                <span className="sr-only">Edit</span>
              </Link>
            </ActionTooltip>
            <ActionTooltip label="Delete" delayDuration={300}>
              <WorkspaceDeleteButton
                isOwner={true}
                slug={workspace.slug}
                size="sm"
                variant={"ghost"}
                id={workspace.id}
                enableRedirect={isCurrentWorkspace ? true : false}
                text={"Delete"}
              />
            </ActionTooltip>
          </>
        ) : null}
      </div>
    </div>
  )
}

export function WorkspacesGridItemSkeleton() {
  return (
    <div className="hover:bg-os-background-100 flex items-center justify-between gap-x-4 p-4 transition-colors duration-200">
      <div className="flex items-center gap-x-2">
        <Skeleton className="size-10 rounded-md" />
        <div className="flex flex-col gap-y-2">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-2 w-24 rounded-md" />
        </div>
      </div>

      <div className="flex items-center gap-x-2">
        <Skeleton className="size-6 rounded-md" />
        <Skeleton className="size-6 rounded-md" />
        <Skeleton className="size-6 rounded-md" />
      </div>
    </div>
  )
}
