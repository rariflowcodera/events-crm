"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ChevronRight, LayoutGrid } from "lucide-react"
import { useTranslations } from "next-intl"
import { ErrorBoundary } from "react-error-boundary"

import { VIEW_COLORS, type ViewColor } from "@/server/db/schemas"
import { usePermissions } from "@/hooks/use-permissions"
import { usePinnedGuestListViews } from "@/trpc/hooks/guest-list-views-hooks"
import { useEventBySlug } from "@/trpc/hooks/events-hooks"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

interface NavEventViewsProps {
  workspaceSlug: string
  eventSlug: string
}

export function NavEventViews({ workspaceSlug, eventSlug }: NavEventViewsProps) {
  return (
    <Suspense fallback={<NavEventViewsSkeleton />}>
      <ErrorBoundary fallbackRender={() => null}>
        <NavEventViewsSuspense workspaceSlug={workspaceSlug} eventSlug={eventSlug} />
      </ErrorBoundary>
    </Suspense>
  )
}

function NavEventViewsSuspense({ workspaceSlug, eventSlug }: NavEventViewsProps) {
  const t = useTranslations()
  const searchParams = useSearchParams()
  const currentViewId = searchParams.get("view")
  const [isOpen, setIsOpen] = useState(true)
  const { role } = usePermissions(workspaceSlug)

  // Fetch event to get its ID
  const { data: event, isLoading: eventLoading } = useEventBySlug(workspaceSlug, eventSlug)

  // Fetch pinned views for the event
  const { data: views, isLoading: viewsLoading } = usePinnedGuestListViews(event?.id ?? "")

  // Filter views based on user's role
  const filteredViews = views?.filter((view) => {
    if (!role) return false
    return view.visibleToRoles?.includes(role) ?? false
  }) ?? []

  // Don't render if there are no pinned views
  if (!eventLoading && !viewsLoading && filteredViews.length === 0) {
    return null
  }

  const basePath = `/${workspaceSlug}/events/${eventSlug}`

  return (
    <SidebarMenu className="mt-3">
      <Collapsible
        asChild
        className="group/collapsible"
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={t("views.savedViews")}>
              <LayoutGrid className="text-muted-foreground size-4" />
              <span className="font-semibold">{t("views.savedViews")}</span>
              <ChevronRight className="text-muted-foreground ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub className="w-[calc(100%-0.5rem)]">
              {viewsLoading || eventLoading ? (
                <>
                  {Array.from({ length: 2 }).map((_, i) => (
                    <SidebarMenuSubItem key={i}>
                      <div className="flex items-center gap-2 px-2 py-1.5">
                        <Skeleton className="size-2.5 rounded-full" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </SidebarMenuSubItem>
                  ))}
                </>
              ) : (
                <>
                  {filteredViews.map((view) => {
                    const colorConfig = VIEW_COLORS[view.color as ViewColor] ?? VIEW_COLORS.gray
                    const isActive = currentViewId === view.id

                    return (
                      <SidebarMenuSubItem key={view.id}>
                        <SidebarMenuSubButton asChild isActive={isActive}>
                          <Link href={`${basePath}/guests/view/${view.id}`}>
                            <span className={`size-2.5 rounded-full shrink-0 ${colorConfig.dot}`} />
                            <span className="truncate">{view.name}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )
                  })}
                </>
              )}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarMenu>
  )
}

function NavEventViewsSkeleton() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Skeleton className="size-4" />
          <Skeleton className="h-4 w-20" />
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
