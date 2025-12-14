import { HydrateClient, trpc } from "@/trpc/server"

import { RouteConfigType, ROUTES } from "@/lib/routes"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { UserButton } from "@/components/buttons/user-button"
import { ActionTooltip } from "@/components/global/action-tooltip"
import { Search } from "@/components/global/search"
import { NavMain } from "@/components/navigation/nav-main"
import { NavMainFiltered } from "@/components/navigation/nav-main-filtered"
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher"

const dashboardRoutes: RouteConfigType[] = [ROUTES.dashboard, ROUTES.events, ROUTES.analytics, ROUTES.docs]

const miscRoutes: RouteConfigType[] = [
  {
    name: "settings",
    path: "/settings/workspace",
    metadata: { title: "Settings" },
    metadataExtra: { name: "Settings", icon: "settings" },
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  slug: string
}

export function AppSidebar({ slug, ...props }: AppSidebarProps) {
  void trpc.workspaces.getSwitcher.prefetch({ slug })

  return (
    <Sidebar collapsible="icon" {...props} className="overflow-hidden border-transparent">
      <SidebarHeader className="flex flex-row items-center justify-between gap-x-2 group-data-[collapsible=icon]:flex-col">
        <HydrateClient>
          <WorkspaceSwitcher slug={slug} />
        </HydrateClient>
        <div className="flex flex-row items-center gap-x-2">
          <Search />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 bg-transparent">
        <HydrateClient>
          <NavMainFiltered routes={dashboardRoutes} slug={slug} label="Main routes" />
        </HydrateClient>

        <NavMain routes={miscRoutes} slug={slug} className="mt-auto" label="Misc routes" />
      </SidebarContent>

      <SidebarFooter>
        <SidebarGroup className="hidden px-0 group-data-[collapsible=icon]:block">
          <SidebarMenu>
            <ActionTooltip
              label="Toggle Sidebar (⌘B)"
              side="right"
            >
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <SidebarTrigger className="hidden group-data-[collapsible=icon]:block" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </ActionTooltip>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarMenu>
          <HydrateClient>
            <UserButton slug={slug} />
          </HydrateClient>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
