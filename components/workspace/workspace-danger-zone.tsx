"use client"

import { UserType, WorkspaceType } from "@/server/db/schema-types"

import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { WorkspaceDeleteButton } from "@/components/buttons/workspace-delete-button"
import { SettingsWrapperCard } from "@/components/layout/settings-wrapper"
import { WorkspaceTransferOwnership } from "@/components/workspace/workspace-transfer-ownership"

type WorkspaceDangerZoneProps = {
  slug: WorkspaceType["slug"]
  action: "delete" | "leave"
  id: WorkspaceType["id"]
  owner: Pick<UserType, "name" | "email" | "image">
  isOwner: boolean
}

export function WorkspaceDangerZone({
  slug,
  action,
  id,
  owner,
  isOwner,
}: WorkspaceDangerZoneProps) {
  return (
    <SettingsWrapperCard type="destructive">
      <CardHeader className="grid gap-y-1">
        <CardTitle className="text-lg font-medium">Danger Zone</CardTitle>
        <CardDescription className="text-sm">
          This section contains actions that are irreversible
        </CardDescription>

        <Separator className="bg-secondary-foreground/30" />
      </CardHeader>
      <CardContent className="flex flex-col gap-y-8">
        {isOwner && <WorkspaceTransferOwnership id={id} owner={owner} />}

        <div className="grid gap-y-1">
          <span className="text-sm font-medium">
            {isOwner ? "Delete Workspace" : "Leave Workspace"}
          </span>
          <span className="text-muted-foreground text-sm">
            {isOwner
              ? "Permanently delete this workspace and all of its data and its members."
              : "Leave this workspace and lose all data. You can join again later."}
          </span>
        </div>
      </CardContent>

      <CardFooter className="bg-destructive/10 px-6 py-3">
        <WorkspaceDeleteButton
          isOwner={action === "delete"}
          slug={slug}
          id={id}
          text={action === "delete" ? "Delete Workspace" : "Leave Workspace"}
          className="ml-auto w-fit"
        />
      </CardFooter>
    </SettingsWrapperCard>
  )
}

export function WorkspaceDangerZoneSkeleton() {
  return (
    <SettingsWrapperCard type="destructive">
      <CardHeader className="grid gap-y-1">
        <CardTitle className="text-lg font-medium">Danger Zone</CardTitle>
        <CardDescription className="text-sm">
          This section contains actions that are irreversible
        </CardDescription>

        <Separator className="bg-secondary-foreground/30" />
      </CardHeader>

      <CardContent className="flex flex-col gap-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </CardContent>

      <CardFooter className="bg-destructive/10 px-6 py-3">
        <Skeleton className="ml-auto h-8 w-24" />
      </CardFooter>
    </SettingsWrapperCard>
  )
}
