"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { createRoute, RouteConfigType } from "@/lib/routes"
import { cn, isRouteActive } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Icons } from "@/components/global/icons"
import { UserAvatar } from "@/components/global/user-avatar"

type NavSettingsProps = {
  route: RouteConfigType
  user?: {
    id: string
    email: string
    emailVerified: boolean
    name: string
    createdAt: Date
    updatedAt: Date
    image?: string | null | undefined | undefined
  }
  slug: string
}

export function NavSettings({ user, route, slug }: NavSettingsProps) {
  const pathname = usePathname()

  if (!route || !route.metadataExtra) return null

  const routeHref = createRoute(route.name, { slug }).href
  const isProfile = routeHref.endsWith("profile")
  const isActive = isRouteActive(routeHref, pathname, 1)

  const Icon = Icons[route.metadataExtra.icon || "arrowRight"]
  const href = route.disabled ? "" : routeHref

  return (
    <Link
      key={route.name}
      href={href}
      className={cn(
        buttonVariants({
          variant: "ghost",
          className:
            "text-primary hover:bg-primary/[0.05] dark:hover:bg-primary/[0.05] justify-start gap-x-2 border border-transparent font-normal",
          size: "sm",
        }),
        {
          "bg-primary/[0.04] dark:hover:bg-primary/[0.04] dark:bg-primary/[0.04] md:text-primary":
            isActive,
          "text-muted-foreground hover:text-muted-foreground cursor-not-allowed": route.disabled,
        }
      )}
    >
      {isProfile && user && (
        <UserAvatar
          user={{ email: user.email, name: user.name, image: user.image || null }}
          size="xxs"
        />
      )}
      {!isProfile && Icon && (
        <Icon className="text-muted-foreground size-4 shrink-0 translate-x-0.5" />
      )}
      {(route.metadataExtra as { name: string }).name}
    </Link>
  )
}

export function NavSettingsSkeleton() {
  return (
    <div className="flex items-center gap-x-2">
      <Skeleton className="size-5" />
      <Skeleton className="h-5 w-48" />
    </div>
  )
}
