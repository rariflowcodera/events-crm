"use client"

import { MemberType, PermissionType, UserType, WorkspaceType } from "@/server/db/schema-types"
import { ColumnDef } from "@tanstack/react-table"
import { formatDistanceToNow } from "date-fns"

import { cn, isUserOnline } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/global/user-avatar"
import { MemberActions } from "@/components/members/member-actions"
import { MemberInfo } from "@/components/members/member-info"

export type Member = {
  id: UserType["id"]
  name: UserType["name"]
  email: UserType["email"]
  image: UserType["image"]
  role: PermissionType["name"]
  status: MemberType["status"]
  workspaceId: WorkspaceType["id"]
  lastActive: UserType["lastActive"]
  ownerId: UserType["id"]
}

export function membersColumns({ currentUserId }: { currentUserId: string }): ColumnDef<Member>[] {
  return [
    {
      accessorKey: "name",
      header: () => <div className="text-left">Name</div>,
      cell: ({ row }) => {
        const member = row.original
        const isCurrentUser = currentUserId ? member.id === currentUserId : false

        return (
          <div className="flex items-center gap-x-2">
            <UserAvatar user={member} />
            <MemberInfo email={member.email} name={member.name} isCurrentUser={isCurrentUser} />
          </div>
        )
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => {
        const member = row.original

        return <div className="text-muted-foreground hidden">{member.email}</div>
      },
    },

    {
      accessorKey: "lastActive",
      header: "Last logged in",
      cell: ({ row }) => {
        const member = row.original
        const lastActiveDate = member.lastActive ? new Date(member.lastActive) : null
        const online = isUserOnline(lastActiveDate)

        return (
          <div className="text-muted-foreground flex items-center justify-end gap-1 text-xs">
            <span className="relative flex h-2 w-2">
              <span
                className={cn(
                  "bg-primary/20 absolute inline-flex h-full w-full rounded-full opacity-75",
                  {
                    "animate-ping bg-green-400": online,
                  }
                )}
              ></span>
              <span
                className={cn("bg-primary/10 relative inline-flex h-2 w-2 rounded-full", {
                  "bg-green-500": online,
                })}
              ></span>
            </span>
            <span
              className={cn("", {
                "font-medium text-green-500": online,
              })}
            >
              {online
                ? "Online"
                : `Last seen ${formatDistanceToNow(lastActiveDate ?? new Date(), { addSuffix: true })}`}
            </span>
          </div>
        )
      },
    },

    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const member = row.original

        return (
          <div className="flex justify-end">
            <Badge variant="secondary" className="rounded-sm px-1.5 text-[11px] capitalize">
              {member.role}
            </Badge>
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const member = row.original
        const isCurrentUser = currentUserId ? member.id === currentUserId : false

        const isOwner = member.ownerId === member.id

        if (isCurrentUser || isOwner) {
          return null
        }

        return (
          <div className="flex justify-end">
            <MemberActions
              email={member.email}
              userId={member.id}
              workspaceId={member.workspaceId}
              role={member.role}
            />
          </div>
        )
      },
    },
  ]
}
