"use client"

import { InvitationType } from "@/server/db/schema-types"
import { ColumnDef } from "@tanstack/react-table"

import { getInvitationStatus } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/global/user-avatar"
import { MemberActions } from "@/components/members/member-actions"
import { MemberInfo } from "@/components/members/member-info"

export function invitationsColumns(): ColumnDef<InvitationType>[] {
  return [
    {
      accessorKey: "name",
      header: () => <div className="text-left">Name</div>,
      cell: ({ row }) => {
        const invite = row.original
        const isRejected = invite.status === "rejected"

        return (
          <div className="flex items-center gap-x-2">
            <UserAvatar user={{ email: invite.email, name: invite.email, image: "" }} />
            <MemberInfo
              email={invite.email}
              name={""}
              isCurrentUser={false}
              tokenExpiresAt={invite.expiresAt}
              createdAt={invite.createdAt}
              isExpired={invite.expired}
              isRejected={isRejected}
            />
          </div>
        )
      },
    },

    {
      accessorKey: "pending",
      header: "Pending",
      cell: ({ row }) => {
        const invite = row.original
        const status = invite.status

        return (
          <Badge
            className="w-fit rounded-sm px-1.5 text-xs font-medium"
            variant={status === "pending" ? "purple" : "urgent"}
          >
            {getInvitationStatus(status)}
          </Badge>
        )
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const invite = row.original

        return (
          <div className="flex justify-end">
            <Badge variant="secondary" className="rounded-sm px-1.5 text-[11px] capitalize">
              {invite.role}
            </Badge>
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const invitation = row.original
        const isRejected = invitation.status === "rejected"

        return (
          <div className="flex justify-end">
            <MemberActions
              email={invitation.email}
              userId={null}
              workspaceId={invitation.workspaceId}
              role={invitation.role}
              isRejected={isRejected}
              invitationId={invitation.id}
            />
          </div>
        )
      },
    },
  ]
}
