"use client"

import { useEventContext } from "@/hooks/use-event-context"
import {
  Sidebar,
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
import { VersionDisplay } from "@/components/global/version-display"
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher"
import { EventSwitcher } from "@/components/navigation/event-switcher"
import { AppSidebarContent } from "@/components/navigation/app-sidebar-content"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  slug: string
}

export function AppSidebar({ slug, ...props }: AppSidebarProps) {
  const { isEventContext, eventSlug } = useEventContext()

  return (
    <Sidebar collapsible="icon" {...props} className="overflow-hidden border-transparent">
      <SidebarHeader className="flex flex-row items-center justify-between gap-x-2 group-data-[collapsible=icon]:flex-col">
        {isEventContext && eventSlug ? (
          <EventSwitcher workspaceSlug={slug} currentEventSlug={eventSlug} />
        ) : (
          <WorkspaceSwitcher slug={slug} />
        )}
        <div className="flex flex-row items-center gap-x-2">
          <Search />
        </div>
      </SidebarHeader>

      <AppSidebarContent slug={slug} />

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
        <VersionDisplay />
        <SidebarMenu>
          <UserButton slug={slug} />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
