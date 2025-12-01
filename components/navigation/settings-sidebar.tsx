"use client"

import { authClient } from "@/lib/auth-client"
import { RouteConfigType } from "@/lib/routes"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert } from "@/components/global/alert"
import { NavBackButton } from "@/components/navigation/nav-back-button"
import { NavSettings, NavSettingsSkeleton } from "@/components/navigation/nav-settings"

type SettingsSidebarProps = {
  profileRoutes: RouteConfigType[]
  workspaceRoutes: RouteConfigType[]
  slug: string
}

export function SettingsSidebar({ profileRoutes, workspaceRoutes, slug }: SettingsSidebarProps) {
  const { data: session, isPending, error } = authClient.useSession()

  const user = session?.user

  return (
    <nav className="flex flex-col space-y-2 py-5" aria-label="Settings sidebar navigation">
      <NavBackButton slug={slug} />
      <div className="flex flex-col space-x-2 gap-y-1 pt-3 lg:space-x-0">
        {isPending ? (
          <Skeleton className="mb-2 ml-2 h-3 w-9/12 py-2" />
        ) : (
          <p className="text-primary/70 ml-2 py-2 text-xs font-semibold" aria-label="User email">
            {user?.email}
          </p>
        )}

        {error && <Alert variant="error" title="Error loading session" icon="alertTriangle" />}

        {profileRoutes.map((route) => (
          <NavSettings key={route.name} route={route} user={user} slug={slug} />
        ))}
      </div>
      <div className="flex flex-col space-x-2 gap-y-1 lg:space-x-0">
        <p
          className="text-primary/70 mt-3 ml-2 py-2 text-xs font-semibold"
          aria-label="Workspace settings"
        >
          Workspace settings
        </p>

        {workspaceRoutes.map((route) => (
          <NavSettings key={route.name} route={route} slug={slug} />
        ))}
      </div>
    </nav>
  )
}

export function SettingsSidebarSkeleton() {
  return (
    <nav className="hidden space-x-2 py-5 lg:flex lg:flex-col lg:space-x-0">
      <div className="hidden gap-4 space-x-2 md:flex lg:flex-col lg:space-x-0">
        <Skeleton className="h-3 w-32" />
        <NavSettingsSkeleton />
        <NavSettingsSkeleton />
        <NavSettingsSkeleton />
        <NavSettingsSkeleton />
        <NavSettingsSkeleton />
      </div>
    </nav>
  )
}
