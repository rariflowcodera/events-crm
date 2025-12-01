"use client"

import { Suspense } from "react"
import Link from "next/link"
import { WorkspaceType } from "@/server/db/schema-types"
import { trpc } from "@/trpc/client"
import { ErrorBoundary } from "react-error-boundary"

import { createRoute } from "@/lib/routes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert } from "@/components/global/alert"
import { Icons } from "@/components/global/icons"
import { LogoBadge, LogoBadgeSkeleton } from "@/components/global/logo-badge"
import { WorkspaceSwitcherAddWorkspace } from "@/components/workspace/workspace-switcher-add-workspace"
import { WorkspaceSwitcherItem } from "@/components/workspace/workspace-switcher-item"

type WorkspaceSwitcherProps = {
  slug: string
}

export function WorkspaceSwitcher({ slug }: WorkspaceSwitcherProps) {
  return (
    <Suspense fallback={<WorkspaceSwitcherSkeleton />}>
      <ErrorBoundary
        fallbackRender={({ error }) => (
          <Alert
            variant="error"
            title={error.message || "An error occurred"}
            icon="alertTriangle"
          />
        )}
      >
        <WorkspaceSwitcherSuspense slug={slug} />
      </ErrorBoundary>
    </Suspense>
  )
}

function WorkspaceSwitcherSuspense({ slug }: WorkspaceSwitcherProps) {
  const [data] = trpc.workspaces.getSwitcher.useSuspenseQuery({ slug })

  const { ownedWorkspaces, memberWorkspaces, workspace, user } = data

  const { state } = useSidebar()

  return (
    <SidebarMenu aria-label="Workspace switcher">
      <SidebarMenuItem className="w-full" aria-label="Workspace switcher">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size={state === "collapsed" ? "lg" : "default"}
              className="group/workspace text-primary/95 ring-ring hover:bg-primary/[0.03] hover:text-accent-foreground data-[state=open]:bg-primary/[0.075] dark:hover:bg-primary/5 px-2 transition-all group-data-[state=collapsed]:p-0 focus-visible:ring-2 focus-visible:outline-hidden"
              tooltip={`Workspace: ${workspace.name}`}
            >
              <LogoBadge
                value={{ logo: workspace.logo, name: workspace.name }}
                size="lg"
                hideText
                doubleLetter
              />
              <span className="truncate text-left text-sm leading-tight font-medium capitalize">
                {workspace.name}
              </span>
              <Icons.chevronsUpDown className="text-muted-foreground group-hover/workspace:text-primary ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="ml-1 w-64" side="bottom">
            {ownedWorkspaces.length ? (
              <>
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  Your workspaces
                </DropdownMenuLabel>

                <WorkspaceList workspaces={ownedWorkspaces} />
              </>
            ) : null}
            {memberWorkspaces.length ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  Member workspaces
                </DropdownMenuLabel>
                <WorkspaceList workspaces={memberWorkspaces} />
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link prefetch href={createRoute("settings-workspace", { slug: slug }).href}>
                  <Icons.settings className="text-muted-foreground mr-2 size-4" />
                  Workspace settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link prefetch href={createRoute("settings-members", { slug }).href}>
                  <Icons.users className="mr-2 size-4" />
                  Invite and manage members
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <WorkspaceSwitcherAddWorkspace
                currentWorkspace={{
                  name: workspace.name,
                  logo: workspace.logo,
                }}
                currentUser={user}
              />
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function WorkspaceSwitcherSkeleton() {
  return (
    <div className="flex w-full items-center px-2 py-1.5 group-data-[collapsible=icon]:px-0">
      <div className="flex items-center gap-x-2">
        <LogoBadgeSkeleton hideText />
        <div className="grid flex-1 gap-y-1.5 group-data-[collapsible=icon]:hidden">
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      <Icons.chevronsUpDown className="text-primary/60 ml-auto size-4" />
    </div>
  )
}

function WorkspaceList({ workspaces }: { workspaces: WorkspaceType[] }) {
  return (
    <ScrollArea className="max-h-46 flex-1 pr-2">
      <div className="flex max-h-46 flex-col gap-y-1">
        {workspaces.map((item) => (
          <WorkspaceSwitcherItem key={item.id} item={item} />
        ))}
      </div>
    </ScrollArea>
  )
}
