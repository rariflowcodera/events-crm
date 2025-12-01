"use client"

import { UserType, WorkspaceType } from "@/server/db/schema-types"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { EditWorkspaceLogoForm } from "@/components/forms/edit-workspace-logo-form"
import { EditWorkspaceNameForm } from "@/components/forms/edit-workspace-name-form"
import { EditWorkspaceUrlForm } from "@/components/forms/edit-workspace-url-form"
import { ActionTooltip } from "@/components/global/action-tooltip"
import { Icons } from "@/components/global/icons"
import { ImageUploadSkeleton } from "@/components/global/image-upload"
import { UserAvatar } from "@/components/global/user-avatar"
import { SettingsWrapperCard } from "@/components/layout/settings-wrapper"

type WorkspaceCardProps = {
  workspace: Pick<WorkspaceType, "slug" | "name" | "logo" | "id" | "updatedAt">
  canEdit: boolean
  isOwner: boolean
  owner: Pick<UserType, "name" | "email" | "image">
}

export function WorkspaceCard({
  canEdit,
  workspace: { slug, logo, name, updatedAt, id },
  owner,
  isOwner,
}: WorkspaceCardProps) {
  return (
    <SettingsWrapperCard>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-muted-foreground text-sm font-semibold">Workspace</CardTitle>

        <ActionTooltip
          label=""
          delayDuration={300}
          content={
            <div>
              <span className="text-muted-foreground text-xs">Owner:</span>
              <div className="flex items-center gap-x-2">
                <UserAvatar user={owner} size="xs" />
                <div className="text-sm">
                  {owner.name} {isOwner && "(you)"}{" "}
                  <span className="text-muted-foreground text-xs">({owner.email})</span>
                </div>
              </div>
            </div>
          }
        >
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-transparent dark:hover:bg-transparent"
          >
            <Icons.info />
            <span className="sr-only">Worksppace info</span>
          </Button>
        </ActionTooltip>
      </CardHeader>
      <EditWorkspaceLogoForm logo={logo} id={id} name={name} slug={slug} />

      <CardContent className="space-y-4">
        <Separator />
        <EditWorkspaceNameForm slug={slug} name={name} id={id} canEdit={canEdit} />
        <EditWorkspaceUrlForm slug={slug} name={name} id={id} canEdit={canEdit} />

        <Separator />
      </CardContent>

      <CardFooter>
        <span className="text-muted-foreground text-xs">
          Last updated {updatedAt ? format(updatedAt, "MMM d, yyyy 'at' h:mm a") : "at never"}
        </span>
      </CardFooter>
    </SettingsWrapperCard>
  )
}

export function WorkspaceCardSkeleton() {
  return (
    <SettingsWrapperCard>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm font-semibold">Workspace</CardTitle>
      </CardHeader>
      <CardContent className="flex w-full flex-col gap-y-4">
        <div className="flex items-center justify-between gap-x-2">
          <div className="flex items-start gap-x-2">
            <ImageUploadSkeleton />
            <div className="flex flex-col gap-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-24" />
            </div>
          </div>

          <Skeleton className="h-5 w-16" />
        </div>

        <Separator />
        <div className="grid grid-cols-2 gap-x-2">
          <span className="text-primary/80 text-sm">Workspace name</span>
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-x-2">
          <span className="text-primary/80 text-sm">Slug</span>
          <Skeleton className="h-9 w-full" />
        </div>

        <Separator />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-2 w-32" />
      </CardFooter>
    </SettingsWrapperCard>
  )
}
