"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { WorkspaceType } from "@/server/db/schema-types"

import { createRoute, RouteConfigType } from "@/lib/routes"
import { isRouteActive } from "@/lib/utils"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Icons } from "@/components/global/icons"

type NavMainProps = {
  routes: RouteConfigType[]
  slug: WorkspaceType["slug"]
  label: string
  className?: string
  children?: React.ReactNode
}

export function NavMain({ label, routes, slug, className, children }: NavMainProps) {
  const pathname = usePathname()
  return (
    <SidebarGroup className={className} aria-label={label}>
      <SidebarGroupLabel className="sr-only">{label}</SidebarGroupLabel>
      <SidebarMenu>
        {routes.map((route, index) => {
          if (!route || !route.metadata) return null

          const workspaceSettings = createRoute("settings-workspace", { slug }).href

          const routeHref = createRoute(route.name, { slug }).href

          // Get the second and third segments of the current path (after slug)
          const isActive = isRouteActive(routeHref, pathname, 1)

          const Icon = Icons[route.metadataExtra.icon || "arrowRight"]

          return (
            <SidebarMenuItem
              key={route.metadataExtra.name + index}
              aria-label={route.metadataExtra.name}
            >
              <SidebarMenuButton
                isActive={isActive}
                tooltip={route.metadataExtra.name}
                disabled={route.disabled}
                asChild
              >
                <Link
                  href={
                    route.disabled ? "" : route.name === "settings" ? workspaceSettings : routeHref
                  }
                  className="group/item flex items-center justify-start group-data-[collapsible=icon]:justify-center"
                >
                  {Icon && (
                    <Icon className="text-muted-foreground size-4 shrink-0 translate-x-[1.5px] transition-transform duration-300 group-hover/item:rotate-2 group-data-[collapsible=icon]:mr-[2px]" />
                  )}
                  <span className="group-data-[collapsible=icon]:sr-only">
                    {route.metadataExtra.name}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
        {children}
      </SidebarMenu>
    </SidebarGroup>
  )
}
