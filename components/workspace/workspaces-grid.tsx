"use client"

import { Suspense } from "react"
import Link from "next/link"
import { WorkspaceType } from "@/server/db/schema-types"
import { trpc } from "@/trpc/client"
import { ErrorBoundary } from "react-error-boundary"

import { createRoute } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Alert } from "@/components/global/alert"
import { Icons } from "@/components/global/icons"
import { SettingsWrapperCard } from "@/components/layout/settings-wrapper"
import {
  WorkspacesGridItem,
  WorkspacesGridItemSkeleton,
} from "@/components/workspace/workspaces-grid-item"

export function WorkspacesGrid() {
  return (
    <Suspense fallback={<WorkspacesGridSkeleton />}>
      <ErrorBoundary
        fallbackRender={({ error }) => (
          <Alert
            variant="error"
            title={error.message || "An error occurred"}
            icon="alertTriangle"
          />
        )}
      >
        <WorkspacesGridSuspense />
      </ErrorBoundary>
    </Suspense>
  )
}

function WorkspacesGridSuspense() {
  const [data] = trpc.workspaces.getMany.useSuspenseQuery()

  const { ownedWorkspaces, memberWorkspaces } = data

  return (
    <div className="max-w-2xl space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Workspaces</h2>
          <p className="text-muted-foreground text-sm">
            You have {ownedWorkspaces.length + memberWorkspaces.length} workspace(s)
          </p>
        </div>
        <Link
          href={createRoute("join").href}
          className={cn(buttonVariants({ variant: "default", size: "sm" }))}
        >
          <Icons.plus className="size-3" />
          New Workspace
        </Link>
      </div>
      <div aria-label="Workspaces overview" className="grid gap-y-10">
        <WorkspacesSection
          title="My workspaces"
          description="Manage your workspaces"
          workspaces={ownedWorkspaces}
          canEdit={true}
          emptyMessage="You don't own any workspaces"
        />
        <WorkspacesSection
          title="Member workspaces"
          description="Workspaces you are a member of"
          workspaces={memberWorkspaces}
          emptyMessage="You're not a member of any workspaces"
        />
      </div>
    </div>
  )
}

export function WorkspacesGridSkeleton() {
  return (
    <div aria-label="Loading workspaces" className="grid gap-y-10">
      <WorkspacesSectionSkeleton title="My workspaces" description="Manage your workspaces" />
      <WorkspacesSectionSkeleton
        title="Member workspaces"
        description="Workspaces you are a member of"
      />
    </div>
  )
}

type WorkspacesSectionProps = {
  title: string
  description: string
  workspaces: WorkspaceType[]
  canEdit?: boolean
  emptyMessage: string
}

function WorkspacesSection({
  title,
  description,
  workspaces,
  canEdit,
  emptyMessage,
}: WorkspacesSectionProps) {
  return (
    <div className="grid gap-y-4">
      <div className="grid gap-y-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <SettingsWrapperCard>
        <div className="flex flex-col divide-y">
          {workspaces.length ? (
            workspaces.map((workspace) => (
              <WorkspacesGridItem key={workspace.id} workspace={workspace} canEdit={canEdit} />
            ))
          ) : (
            <div className="text-muted-foreground p-4 text-sm">{emptyMessage}</div>
          )}
        </div>
      </SettingsWrapperCard>
    </div>
  )
}

function WorkspacesSectionSkeleton({
  title,
  description,
}: Pick<WorkspacesSectionProps, "title" | "description">) {
  return (
    <div className="grid gap-y-4">
      <div className="grid gap-y-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <SettingsWrapperCard className="p-0">
        <div className="flex flex-col divide-y">
          <WorkspacesGridItemSkeleton />
          <WorkspacesGridItemSkeleton />
          <WorkspacesGridItemSkeleton />
        </div>
      </SettingsWrapperCard>
    </div>
  )
}
