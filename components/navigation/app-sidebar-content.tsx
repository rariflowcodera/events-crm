"use client"

import { useEventContext } from "@/hooks/use-event-context"
import { RouteConfigType, ROUTES } from "@/lib/routes"
import {
  SidebarContent,
  SidebarGroup,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { NavMain } from "@/components/navigation/nav-main"
import { NavMainFiltered } from "@/components/navigation/nav-main-filtered"
import { NavEvent } from "@/components/navigation/nav-event"

// Workspace-level routes (shown when NOT in event context, or below separator in event context)
const workspaceRoutes: RouteConfigType[] = [ROUTES.dashboard]

// Misc routes (always at bottom) - Settings first, then User Guide
const miscRoutes: RouteConfigType[] = [
  {
    name: "settings",
    path: "/settings/workspace",
    metadata: { title: "Settings" },
    metadataExtra: { name: "Settings", icon: "settings" },
  },
  ROUTES.docs, // User Guide moved below Settings
]

interface AppSidebarContentProps {
  slug: string
}

export function AppSidebarContent({ slug }: AppSidebarContentProps) {
  const { isEventContext, eventSlug } = useEventContext()

  return (
    <SidebarContent className="gap-0 bg-transparent">
      {isEventContext && eventSlug ? (
        <>
          {/* Event navigation */}
          <NavEvent workspaceSlug={slug} eventSlug={eventSlug} />

          {/* Separator between event and workspace nav */}
          <SidebarGroup>
            <SidebarSeparator className="my-2" />
          </SidebarGroup>

          {/* Workspace navigation (subset when in event context) */}
          <NavMainFiltered
            routes={workspaceRoutes}
            slug={slug}
            label="Workspace"
          />
        </>
      ) : (
        /* Full workspace navigation when not in event context */
        <NavMainFiltered
          routes={workspaceRoutes}
          slug={slug}
          label="Main routes"
        />
      )}

      {/* Misc routes always at bottom */}
      <NavMain routes={miscRoutes} slug={slug} className="mt-auto" label="Misc routes" />
    </SidebarContent>
  )
}
