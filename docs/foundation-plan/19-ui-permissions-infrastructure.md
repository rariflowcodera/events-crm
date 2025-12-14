# 19. UI Permissions Infrastructure

**Status: COMPLETED**

## Overview

Create frontend infrastructure for checking user permissions in UI components. This enables hiding/disabling buttons, forms, and actions based on the user's role and permissions in the workspace.

## Problem

The Member role is defined as view-only with 5 permissions (view:members, view:event, view:guests, view:rsvps, view:reports), but the UI doesn't reflect this. Members can see all buttons/forms and only get FORBIDDEN errors when they try to perform actions.

### Current State
- Backend permissions work correctly (tRPC procedures check permissions)
- Frontend has NO visibility into user's role or permissions
- All UI elements render regardless of permissions
- Users discover they can't do something only after trying

## Solution

1. Create a tRPC query to expose current user's permissions for a workspace
2. Create a React hook `usePermissions()` for components to check permissions
3. Create a `<Can>` component for conditional rendering
4. Export permission constants for frontend use

## Implementation

### Phase 1: Permission Constants

**File**: `lib/permissions.ts`

Export permission constants for frontend use (mirrors backend `server/queries/permissions.ts`):

```typescript
export const PERMISSIONS = {
  // Members
  VIEW_MEMBERS: "view:members",
  CREATE_MEMBERS: "create:members",
  UPDATE_MEMBERS: "update:members",
  DELETE_MEMBERS: "delete:members",
  MANAGE_MEMBERS: "manage:members",
  INVITE_MEMBERS: "invite:members",
  REMOVE_MEMBERS: "remove:members",
  MANAGE_ROLES: "manage:roles",

  // Workspace
  MANAGE_WORKSPACE: "manage:workspace",
  DELETE_WORKSPACE: "delete:workspace",
  TRANSFER_OWNERSHIP: "transfer:ownership",

  // Events
  CREATE_EVENT: "create:event",
  MANAGE_EVENT: "manage:event",
  DELETE_EVENT: "delete:event",
  VIEW_EVENT: "view:event",

  // Guests
  IMPORT_GUESTS: "import:guests",
  MANAGE_GUESTS: "manage:guests",
  VIEW_GUESTS: "view:guests",
  DELETE_GUESTS: "delete:guests",

  // RSVPs
  VIEW_RSVPS: "view:rsvps",
  MANAGE_RSVPS: "manage:rsvps",

  // Emails
  SEND_EMAILS: "send:emails",
  MANAGE_TEMPLATES: "manage:templates",

  // Reporting
  VIEW_REPORTS: "view:reports",
  EXPORT_DATA: "export:data",
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
```

### Phase 2: tRPC Router

**File**: `trpc/routers/permissions.ts`

New tRPC router with `getMyPermissions` query:

```typescript
import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { db } from "@/server/db/config/database"
import { workspaces, workspaceMembers, roles, rolePermissions, permissions } from "@/server/db/schemas"
import { eq, and } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

export const permissionsRouter = createTRPCRouter({
  getMyPermissions: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get workspace by slug
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, input.slug),
      })

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" })
      }

      // Get user's membership and role
      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.userId, ctx.user.id),
          eq(workspaceMembers.workspaceId, workspace.id)
        ),
        with: {
          role: {
            with: {
              rolePermissions: {
                with: {
                  permission: true,
                },
              },
            },
          },
        },
      })

      if (!membership) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" })
      }

      // Extract permission names
      const permissionNames = membership.role.rolePermissions.map(
        (rp) => rp.permission.name
      )

      return {
        role: membership.role.name,
        permissions: permissionNames,
      }
    }),
})
```

**File**: `trpc/routers/index.ts` - Add to router:

```typescript
import { permissionsRouter } from "./permissions"

export const appRouter = createTRPCRouter({
  // ... existing routers
  permissions: permissionsRouter,
})
```

### Phase 3: React Hook

**File**: `hooks/use-permissions.ts`

```typescript
"use client"

import { trpc } from "@/trpc/client"

export function usePermissions(slug: string) {
  const { data, isLoading, error } = trpc.permissions.getMyPermissions.useQuery(
    { slug },
    { staleTime: 5 * 60 * 1000 } // Cache for 5 minutes
  )

  const can = (permission: string | string[]): boolean => {
    if (!data) return false
    if (data.permissions.includes("*")) return true
    if (Array.isArray(permission)) {
      return permission.some((p) => data.permissions.includes(p))
    }
    return data.permissions.includes(permission)
  }

  const canAll = (permissions: string[]): boolean => {
    if (!data) return false
    if (data.permissions.includes("*")) return true
    return permissions.every((p) => data.permissions.includes(p))
  }

  const isRole = (role: string): boolean => data?.role === role

  return {
    // Permission checking
    can,
    canAll,

    // Role checking
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
```

### Phase 4: Conditional Render Component

**File**: `components/global/can.tsx`

```typescript
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
  slug: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function CanAll({ permissions, slug, children, fallback = null }: CanAllProps) {
  const { canAll, isLoading } = usePermissions(slug)

  if (isLoading) return null

  if (canAll(permissions)) {
    return <>{children}</>
  }

  return <>{fallback}</>
}
```

## Usage Examples

### Using the hook directly

```tsx
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/permissions"

function EventsHeader({ slug }: { slug: string }) {
  const { can } = usePermissions(slug)

  return (
    <header>
      <h1>Events</h1>
      {can(PERMISSIONS.CREATE_EVENT) && (
        <CreateEventButton slug={slug} />
      )}
    </header>
  )
}
```

### Using the Can component

```tsx
import { Can } from "@/components/global/can"
import { PERMISSIONS } from "@/lib/permissions"

function EventsHeader({ slug }: { slug: string }) {
  return (
    <header>
      <h1>Events</h1>
      <Can permission={PERMISSIONS.CREATE_EVENT} slug={slug}>
        <CreateEventButton slug={slug} />
      </Can>
    </header>
  )
}
```

### Multiple permissions (OR logic)

```tsx
<Can
  permission={[PERMISSIONS.MANAGE_EVENT, PERMISSIONS.DELETE_EVENT]}
  slug={slug}
>
  <EventActions event={event} />
</Can>
```

### Disabling instead of hiding

```tsx
function EventSettingsForm({ slug }: { slug: string }) {
  const { can } = usePermissions(slug)
  const canEdit = can(PERMISSIONS.MANAGE_EVENT)

  return (
    <form>
      <Input disabled={!canEdit} {...field} />
      <Button disabled={!canEdit}>Save</Button>
    </form>
  )
}
```

## Files Summary

| File | Purpose | Status |
|------|---------|--------|
| `lib/permissions.ts` | Permission constants | ✓ |
| `trpc/routers/permissions.ts` | Backend query | ✓ |
| `trpc/routers/_app.ts` | Register router | ✓ |
| `hooks/use-permissions.ts` | React hook | ✓ |
| `components/global/can.tsx` | Conditional component | ✓ |

## Future Component Updates

Once infrastructure is in place, these components should be updated:

| Component | Permission Check | Action |
|-----------|-----------------|--------|
| `components/events/create-event-button.tsx` | `create:event` | Hide button |
| `components/events/event-settings-form.tsx` | `manage:event` | Disable form |
| `components/events/event-actions.tsx` | `delete:event` | Hide delete |
| `components/email-templates/template-actions.tsx` | `manage:templates` | Hide edit/delete |
| `components/email-templates/create-template-button.tsx` | `manage:templates` | Hide button |
| `components/rsvp-forms/rsvp-form-editor.tsx` | `manage:event` | Disable editing |
| `components/guest-categories/category-actions.tsx` | `manage:event` | Hide actions |

## Permission Reference

| Role | Permissions |
|------|-------------|
| Owner | All (`*`) |
| Admin | 19 permissions (all except workspace deletion/transfer) |
| Manager | 11 permissions (event ops, guests, RSVPs, reports) |
| Member | 5 permissions (view only) |
