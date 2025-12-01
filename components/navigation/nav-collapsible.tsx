"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { cn, isRouteActive } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Icons } from "@/components/global/icons"

// Constants for cookie management
const NAV_COLLAPSIBLE_COOKIE_PREFIX = "nav-collapsible:"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

interface RouteType {
  name: string
  basePath: string
  icon?: keyof typeof Icons
  routes?: RouteType[]
  disabled?: boolean
}

const routes: RouteType[] = [
  {
    name: "Playground",
    basePath: "/playground/api",
    icon: "squareMousePointer",
    routes: [
      {
        name: "Explore API",
        basePath: "/playground/api",
      },
      {
        name: "Explore tRPC",
        basePath: "/playground/trpc",
        disabled: true,
      },
      {
        name: "Explore Server actions",
        basePath: "/playground/server-actions",
        disabled: true,
      },
    ],
  },
]

interface NavCollapsibleClientProps {
  navCollapsibleStates?: Record<string, boolean>
  slug: string
}

// Custom hook for navigation state management
function useNavState(initialStates: Record<string, boolean>, pathname: string) {
  // Initialize with the provided cookie states
  const [openStates, setOpenStates] = useState<Record<string, boolean>>(
    routes.reduce(
      (acc, route) => ({
        ...acc,
        [route.name]: initialStates[route.name],
      }),
      {}
    )
  )

  // Track if user has manually closed a section that should be auto-opened
  const [userClosedStates, setUserClosedStates] = useState<Record<string, boolean>>({})

  // Reset user closed states when pathname changes
  useEffect(() => {
    setUserClosedStates({})
  }, [pathname])

  const handleOpenChange = useCallback(
    (open: boolean, itemName: string, hasActiveSubroute: boolean) => {
      // If closing and this item has active subroutes, remember user explicitly closed it
      if (!open && hasActiveSubroute) {
        setUserClosedStates((prev) => ({
          ...prev,
          [itemName]: true,
        }))
      }

      // If opening, remove from closed states
      if (open) {
        setUserClosedStates((prev) => {
          const newState = { ...prev }
          delete newState[itemName]
          return newState
        })
      }

      setOpenStates((prev) => ({
        ...prev,
        [itemName]: open,
      }))

      // Set cookie
      document.cookie = `${NAV_COLLAPSIBLE_COOKIE_PREFIX}${itemName}=${open}; path=/; max-age=${COOKIE_MAX_AGE}`
    },
    []
  )

  return {
    openStates,
    userClosedStates,
    handleOpenChange,
  }
}

// Custom hook for route utilities
function useRouteUtils(pathname: string) {
  const isActive = useCallback(
    (route: RouteType) => {
      // Use depth=2 to match /[slug]/tools/api with /tools/api
      return isRouteActive(route.basePath, pathname, 2)
    },
    [pathname]
  )

  const isSubRouteActive = useCallback(
    (route: RouteType) => {
      // Use depth=3 for more specific matching
      return isRouteActive(route.basePath, pathname, 3)
    },
    [pathname]
  )

  const isAnySubRouteActive = useCallback(
    (route: RouteType) => {
      if (!route.routes) return false
      return route.routes.some((subRoute) => isSubRouteActive(subRoute))
    },
    [isSubRouteActive]
  )

  return {
    isActive,
    isSubRouteActive,
    isAnySubRouteActive,
  }
}

// SubRoutes component
function SubRoutes({
  routes,
  slug,
  isSubRouteActive,
}: {
  routes?: RouteType[]
  slug: string
  isSubRouteActive: (route: RouteType) => boolean
}) {
  if (!routes?.length) return null

  return (
    <SidebarMenuSub className="w-[calc(100%-0.5rem)]">
      {routes.map((subItem) => {
        const isSubActive = isSubRouteActive(subItem)
        return (
          <SidebarMenuSubItem key={subItem.name}>
            <SidebarMenuSubButton asChild isActive={isSubActive}>
              <Link
                href={subItem.disabled ? "#" : `/${slug}${subItem.basePath}`}
                className={cn(subItem.disabled && "pointer-events-none opacity-50")}
              >
                <span>{subItem.name}</span>
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        )
      })}
    </SidebarMenuSub>
  )
}

// NavItem component
function NavItem({
  item,
  slug,
  isActive,
  isAnySubRouteActive,
  isSubRouteActive,
  openStates,
  userClosedStates,
  onOpenChange,
}: {
  item: RouteType
  slug: string
  isActive: (route: RouteType) => boolean
  isAnySubRouteActive: (route: RouteType) => boolean
  isSubRouteActive: (route: RouteType) => boolean
  openStates: Record<string, boolean>
  userClosedStates: Record<string, boolean>
  onOpenChange: (open: boolean, itemName: string, hasActiveSubroute: boolean) => void
}) {
  const Icon = Icons[item.icon || "layers"]
  const hasActiveSubroute = isAnySubRouteActive(item)

  // Only auto-open if there's an active subroute AND user hasn't manually closed it
  const shouldAutoOpen = hasActiveSubroute && !userClosedStates[item.name]
  const isItemOpen = openStates[item.name]
  const shouldBeOpen = isItemOpen || shouldAutoOpen

  return (
    <Collapsible
      key={item.name}
      asChild
      className="group/collapsible"
      open={shouldBeOpen}
      onOpenChange={(open) => onOpenChange(open, item.name, hasActiveSubroute)}
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.name} isActive={isActive(item) || hasActiveSubroute}>
            <Icon className="text-muted-foreground size-4" />
            <span>{item.name}</span>
            <ChevronRight className="text-muted-foreground ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SubRoutes routes={item.routes} slug={slug} isSubRouteActive={isSubRouteActive} />
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function NavCollapsible({ navCollapsibleStates = {}, slug }: NavCollapsibleClientProps) {
  const pathname = usePathname()
  const { isActive, isSubRouteActive, isAnySubRouteActive } = useRouteUtils(pathname)
  const { openStates, userClosedStates, handleOpenChange } = useNavState(
    navCollapsibleStates,
    pathname
  )

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Development</SidebarGroupLabel>
      <SidebarMenu>
        {routes.map((item) => (
          <NavItem
            key={item.name}
            item={item}
            slug={slug}
            isActive={isActive}
            isAnySubRouteActive={isAnySubRouteActive}
            isSubRouteActive={isSubRouteActive}
            openStates={openStates}
            userClosedStates={userClosedStates}
            onOpenChange={handleOpenChange}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
