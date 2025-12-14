"use client"

import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/permissions"
import { createRoute } from "@/lib/routes"
import { CtaCard } from "@/components/global/cta-card"

interface DashboardCardsProps {
  slug: string
}

export function DashboardCards({ slug }: DashboardCardsProps) {
  const { can, isMember } = usePermissions(slug)

  const canManageWorkspace = can(PERMISSIONS.MANAGE_WORKSPACE)
  const canInviteMembers = can(PERMISSIONS.INVITE_MEMBERS)
  const canViewAnalytics = !isMember // Hide analytics for members via role check

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Always show Manage Events - all roles can view events */}
      <CtaCard
        color="orange"
        href={createRoute("events", { slug }).href}
        heading="Manage Events"
        description="Create and manage events, guests, and RSVPs"
        icon="calendar"
      />

      {/* Workspace Settings - requires manage:workspace permission */}
      {canManageWorkspace && (
        <CtaCard
          color="blue"
          href={createRoute("settings-workspace", { slug }).href}
          heading="Workspace Settings"
          description="Configure your workspace settings and preferences"
          icon="settings"
        />
      )}

      {/* View Analytics - hidden for members via role check */}
      {canViewAnalytics && (
        <CtaCard
          color="green"
          href={createRoute("analytics", { slug }).href}
          heading="View Analytics"
          description="View analytics for your workspace and track performance"
          icon="chart"
        />
      )}

      {/* Invite members - requires invite:members permission */}
      {canInviteMembers && (
        <CtaCard
          color="purple"
          href={createRoute("settings-members", { slug }).href}
          heading="Invite members"
          description="Invite team members to collaborate in your workspace"
          icon="userPlus"
        />
      )}
    </div>
  )
}
