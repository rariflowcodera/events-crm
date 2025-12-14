"use client"

import { usePermissions } from "@/hooks/use-permissions"

interface CanProps {
  /** Permission(s) to check - uses OR logic for arrays */
  permission: string | string[]
  /** Workspace slug for permission context */
  slug: string
  /** Content to render if user has permission */
  children: React.ReactNode
  /** Optional fallback if user lacks permission */
  fallback?: React.ReactNode
}

/**
 * Conditionally render content based on user permissions
 *
 * @example
 * ```tsx
 * // Single permission
 * <Can permission="create:event" slug={slug}>
 *   <CreateEventButton />
 * </Can>
 *
 * // Multiple permissions (OR logic)
 * <Can permission={["manage:event", "delete:event"]} slug={slug}>
 *   <EventActions />
 * </Can>
 *
 * // With fallback
 * <Can permission="manage:event" slug={slug} fallback={<ViewOnlyBadge />}>
 *   <EditButton />
 * </Can>
 * ```
 */
export function Can({ permission, slug, children, fallback = null }: CanProps) {
  const { can, isLoading } = usePermissions(slug)

  // Don't render anything while loading to prevent flash
  if (isLoading) return null

  if (can(permission)) {
    return <>{children}</>
  }

  return <>{fallback}</>
}

interface CanAllProps {
  /** All permissions required - uses AND logic */
  permissions: string[]
  /** Workspace slug for permission context */
  slug: string
  /** Content to render if user has all permissions */
  children: React.ReactNode
  /** Optional fallback if user lacks any permission */
  fallback?: React.ReactNode
}

/**
 * Conditionally render content if user has ALL specified permissions
 *
 * @example
 * ```tsx
 * <CanAll permissions={["manage:event", "send:emails"]} slug={slug}>
 *   <BulkEmailButton />
 * </CanAll>
 * ```
 */
export function CanAll({
  permissions,
  slug,
  children,
  fallback = null,
}: CanAllProps) {
  const { canAll, isLoading } = usePermissions(slug)

  if (isLoading) return null

  if (canAll(permissions)) {
    return <>{children}</>
  }

  return <>{fallback}</>
}
