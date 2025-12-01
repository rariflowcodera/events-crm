"use client"

import { useParams } from "next/navigation"
import { PermissionType, UserType, WorkspaceType } from "@/server/db/schema-types"
import { useDeleteInvitationTRPC, useRevokeInvitationTRPC } from "@/trpc/hooks/invitations-hooks"
import { useDeleteMemberTRPC, useUpdateMemberTRPC } from "@/trpc/hooks/members-hooks"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Icons } from "@/components/global/icons"

type MemberActionsProps = {
  role?: PermissionType["name"]
  email: UserType["email"]
  userId?: UserType["id"] | null
  workspaceId: WorkspaceType["id"]
  isRejected?: boolean
  invitationId?: string
}

export function MemberActions({
  userId,
  email,
  role,
  workspaceId,
  isRejected = false,
  invitationId,
}: MemberActionsProps) {
  const { slug } = useParams<{ slug: string }>()

  const { isPending: isDeletingMember, mutate: deleteMember } = useDeleteMemberTRPC({ slug })
  const { isPending: isUpdatingMember, mutate: updateMember } = useUpdateMemberTRPC({ slug })

  const { mutate: revokeInvitation, isPending: isRevoking } = useRevokeInvitationTRPC()
  const { mutate: deleteInvitation, isPending: isDeleting } = useDeleteInvitationTRPC()
  const handleInvitation = () => {
    if (isRejected && invitationId) {
      deleteInvitation({ id: invitationId })
    } else {
      revokeInvitation({ email, workspaceId })
    }
  }

  const handleDeleteMember = () => {
    if (!userId) return
    deleteMember({ userId, slug })
  }

  const handleUpdateMember = (role: "member" | "admin") => {
    if (!userId) return
    updateMember({ role, userId, slug })
  }

  const isAdmin = role === "admin"
  const isMember = role === "member"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Icons.actions className="text-muted-foreground rotate-90" />
          <span className="sr-only">More actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="center" className="w-fit min-w-40">
        <DropdownMenuLabel className="sr-only">Member actions</DropdownMenuLabel>
        <DropdownMenuGroup>
          {userId ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Icons.edit className="mr-2 size-4" />
                Edit role
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    disabled={isAdmin || isUpdatingMember}
                    onClick={() => handleUpdateMember("admin")}
                  >
                    Admin
                    {isAdmin && <Icons.check className="ml-auto size-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isMember || isUpdatingMember}
                    onClick={() => handleUpdateMember("member")}
                  >
                    Member
                    {isMember && <Icons.check className="ml-auto size-4" />}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          ) : null}

          {!!userId ? (
            <DropdownMenuItem
              className="flex cursor-pointer items-center text-red-600 focus:bg-red-500/20 focus:text-red-700"
              disabled={isDeletingMember}
              onClick={handleDeleteMember}
            >
              <Icons.userMinus className="text-destructive size-4" />
              Remove
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="flex cursor-pointer items-center text-red-600 focus:bg-red-500/20 focus:text-red-700"
              onClick={handleInvitation}
              disabled={isRevoking || isDeleting}
            >
              {isRejected ? (
                <Icons.trash className="text-destructive size-4" />
              ) : (
                <Icons.xCircle className="text-destructive size-4" />
              )}
              {isRejected ? "Remove" : "Revoke"}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
