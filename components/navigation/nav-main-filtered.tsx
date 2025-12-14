"use client"

import { useMemo } from "react"

import { usePermissions } from "@/hooks/use-permissions"
import { RouteConfigType } from "@/lib/routes"
import { NavMain } from "@/components/navigation/nav-main"

interface NavMainFilteredProps {
  routes: RouteConfigType[]
  slug: string
  label: string
  className?: string
}

/**
 * A wrapper around NavMain that filters routes based on user permissions.
 * Currently hides the Analytics route for Member role users.
 */
export function NavMainFiltered({ routes, slug, label, className }: NavMainFilteredProps) {
  const { isMember } = usePermissions(slug)

  // Filter routes based on permissions
  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => {
      // Hide analytics for members
      if (route.name === "analytics" && isMember) {
        return false
      }
      return true
    })
  }, [routes, isMember])

  return (
    <NavMain
      routes={filteredRoutes}
      slug={slug}
      label={label}
      className={className}
    />
  )
}
