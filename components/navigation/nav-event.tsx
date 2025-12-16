"use client"

import { Suspense, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { ErrorBoundary } from "react-error-boundary"

import { usePermissions } from "@/hooks/use-permissions"
import { trpc } from "@/trpc/client"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert } from "@/components/global/alert"
import { Icons } from "@/components/global/icons"
import { NavEventViews } from "@/components/navigation/nav-event-views"
import type { NavigationSettings } from "@/server/db/schemas/workspace"

// Event navigation items configuration
const eventNavItems = [
  { key: "overview", tab: null, icon: "dashboard", labelKey: "nav.overview" },
  { key: "guests", tab: "guests", icon: "users", labelKey: "guest.guests" },
  { key: "categories", tab: "categories", icon: "layers", labelKey: "guest.categories" },
  { key: "forms", tab: "forms", icon: "formInput", labelKey: "forms.title" },
  { key: "branding", tab: "branding", icon: "brush", labelKey: "branding.title" },
  { key: "emails", tab: "emails", icon: "mail", labelKey: "email.templates" },
  { key: "reports", tab: "reports", icon: "chart", labelKey: "rsvpReports.reports" },
  { key: "settings", tab: "settings", icon: "settings", labelKey: "common.settings" },
] as const

// Default visibility for each navigation item by role
const defaultVisibility: Record<string, string[]> = {
  overview: ["owner", "admin", "manager", "member"],
  guests: ["owner", "admin", "manager", "member"],
  categories: ["owner", "admin", "manager"],
  forms: ["owner", "admin", "manager"],
  branding: ["owner", "admin", "manager"],
  emails: ["owner", "admin", "manager"],
  reports: ["owner", "admin", "manager", "member"],
  settings: ["owner", "admin"],
}

interface NavEventProps {
  workspaceSlug: string
  eventSlug: string
}

export function NavEvent({ workspaceSlug, eventSlug }: NavEventProps) {
  return (
    <Suspense fallback={<NavEventSkeleton />}>
      <ErrorBoundary
        fallbackRender={({ error }) => (
          <Alert
            variant="error"
            title={error.message || "An error occurred"}
            icon="alertTriangle"
          />
        )}
      >
        <NavEventSuspense workspaceSlug={workspaceSlug} eventSlug={eventSlug} />
      </ErrorBoundary>
    </Suspense>
  )
}

function NavEventSuspense({ workspaceSlug, eventSlug }: NavEventProps) {
  const t = useTranslations()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab") ?? "overview"
  const { role } = usePermissions(workspaceSlug)

  // Get navigation settings from workspace
  const [workspace] = trpc.workspaces.getNavigationSettings.useSuspenseQuery({
    slug: workspaceSlug,
  })

  const navSettings = workspace?.navigationSettings?.eventNav

  // Filter items based on role visibility
  const visibleItems = useMemo(() => {
    // If role is not yet loaded, don't show any items
    if (!role) return []

    return eventNavItems.filter((item) => {
      // Get allowed roles from settings or defaults
      const allowedRoles = navSettings?.[item.key as keyof typeof navSettings] ?? defaultVisibility[item.key]
      return allowedRoles?.includes(role) ?? false
    })
  }, [navSettings, role])

  const basePath = `/${workspaceSlug}/events/${eventSlug}`

  return (
    <SidebarGroup aria-label={t("nav.eventManagement")}>
      <SidebarGroupLabel>{t("nav.eventManagement")}</SidebarGroupLabel>
      <SidebarMenu>
        {visibleItems.map((item) => {
          const Icon = Icons[item.icon as keyof typeof Icons]
          const href = item.tab ? `${basePath}?tab=${item.tab}` : basePath
          const isActive = item.tab ? currentTab === item.tab : currentTab === "overview"

          return (
            <SidebarMenuItem key={item.key} aria-label={t(item.labelKey)}>
              <SidebarMenuButton
                isActive={isActive}
                tooltip={t(item.labelKey)}
                asChild
              >
                <Link
                  href={href}
                  className="group/item flex items-center justify-start group-data-[collapsible=icon]:justify-center"
                >
                  {Icon && (
                    <Icon className="text-muted-foreground size-4 shrink-0 translate-x-[1.5px] transition-transform duration-300 group-hover/item:rotate-2 group-data-[collapsible=icon]:mr-[2px]" />
                  )}
                  <span className="group-data-[collapsible=icon]:sr-only">
                    {t(item.labelKey)}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>

      {/* Pinned guest list views */}
      <NavEventViews workspaceSlug={workspaceSlug} eventSlug={eventSlug} />
    </SidebarGroup>
  )
}

function NavEventSkeleton() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <Skeleton className="h-4 w-24" />
      </SidebarGroupLabel>
      <SidebarMenu>
        {Array.from({ length: 6 }).map((_, i) => (
          <SidebarMenuItem key={i}>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Skeleton className="size-4" />
              <Skeleton className="h-4 w-20" />
            </div>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
