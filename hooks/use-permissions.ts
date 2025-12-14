"use client"

import { trpc } from "@/trpc/client"

/**
 * Hook to check user permissions in the current workspace
 *
 * @example
 * ```tsx
 * const { can, isOwner, isLoading } = usePermissions(slug)
 *
 * // Check single permission
 * if (can("create:event")) { ... }
 *
 * // Check multiple permissions (OR logic)
 * if (can(["manage:event", "delete:event"])) { ... }
 *
 * // Check role
 * if (isOwner || isAdmin) { ... }
 * ```
 */
export function usePermissions(slug: string) {
  const { data, isLoading, error } = trpc.permissions.getMyPermissions.useQuery(
    { slug },
    {
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      refetchOnWindowFocus: false,
    }
  )

  /**
   * Check if user has a permission (OR logic for arrays)
   */
  const can = (permission: string | string[]): boolean => {
    if (!data) return false
    // Owner has wildcard access
    if (data.permissions.includes("*")) return true
    // Check array of permissions (OR logic)
    if (Array.isArray(permission)) {
      return permission.some((p) => data.permissions.includes(p))
    }
    // Check single permission
    return data.permissions.includes(permission)
  }

  /**
   * Check if user has ALL specified permissions (AND logic)
   */
  const canAll = (permissions: string[]): boolean => {
    if (!data) return false
    if (data.permissions.includes("*")) return true
    return permissions.every((p) => data.permissions.includes(p))
  }

  /**
   * Check if user has a specific role
   */
  const isRole = (role: string): boolean => data?.role === role

  return {
    // Permission checking
    can,
    canAll,

    // Role checking helpers
    isRole,
    isOwner: data?.role === "owner",
    isAdmin: data?.role === "admin",
    isManager: data?.role === "manager",
    isMember: data?.role === "member",

    // Raw data
    role: data?.role,
    permissions: data?.permissions ?? [],

    // Loading state
    isLoading,
    error,
  }
}
