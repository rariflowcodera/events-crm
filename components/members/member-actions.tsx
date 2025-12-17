"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { PermissionType, UserType, WorkspaceType } from "@/server/db/schema-types"
import { useDeleteInvitationTRPC, useRevokeInvitationTRPC } from "@/trpc/hooks/invitations-hooks"
import {
  useDeleteMemberTRPC,
  useResetPasswordTRPC,
  useUpdateMemberTRPC,
} from "@/trpc/hooks/members-hooks"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/permissions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Icons } from "@/components/global/icons"

type CredentialsDialogData = {
  email: string
  password: string
} | null

type MemberActionsProps = {
  role?: PermissionType["name"]
  email: UserType["email"]
  userId?: UserType["id"] | null
  workspaceId: WorkspaceType["id"]
  isRejected?: boolean
  invitationId?: string
  isPrimaryOwner?: boolean
}

export function MemberActions({
  userId,
  email,
  role,
  workspaceId,
  isRejected = false,
  invitationId,
  isPrimaryOwner = false,
}: MemberActionsProps) {
  const { slug } = useParams<{ slug: string }>()
  const { can, isOwner } = usePermissions(slug)

  // Credentials dialog state
  const [credentialsDialog, setCredentialsDialog] = useState<CredentialsDialogData>(null)
  const [copiedField, setCopiedField] = useState<"email" | "password" | "both" | null>(null)

  // Permission checks
  const canManageMembers = can(PERMISSIONS.MANAGE_MEMBERS)
  const canManageRoles = can(PERMISSIONS.MANAGE_ROLES)

  const { isPending: isDeletingMember, mutate: deleteMember } = useDeleteMemberTRPC({ slug })
  const { isPending: isUpdatingMember, mutate: updateMember } = useUpdateMemberTRPC({ slug })
  const { isPending: isResettingPassword, mutate: resetPassword } = useResetPasswordTRPC({
    slug,
    onSuccess: (data) => {
      setCredentialsDialog({
        email: data.email,
        password: data.generatedPassword,
      })
    },
  })

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

  const handleUpdateMember = (newRole: "member" | "event_staff" | "manager" | "admin" | "owner") => {
    if (!userId) return
    updateMember({ role: newRole, userId, slug })
  }

  const handleResetPassword = () => {
    if (!userId) return
    resetPassword({ userId, slug })
  }

  // Copy to clipboard functions
  const copyToClipboard = async (text: string, field: "email" | "password" | "both") => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopiedField(null), 2000)
  }

  const copyBothCredentials = async () => {
    if (!credentialsDialog) return
    const text = `Email: ${credentialsDialog.email}\nPassword: ${credentialsDialog.password}`
    await copyToClipboard(text, "both")
  }

  const isRoleOwner = role === "owner"
  const isAdmin = role === "admin"
  const isManager = role === "manager"
  const isEventStaff = role === "event_staff"
  const isMember = role === "member"

  // Don't show actions if user cannot manage members at all
  if (!canManageMembers && !canManageRoles) {
    return null
  }

  return (
    <>
      {/* Credentials Dialog - shown after password reset */}
      <Dialog open={!!credentialsDialog} onOpenChange={() => setCredentialsDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Password Reset</DialogTitle>
            <DialogDescription>
              Share these credentials with the user. This password will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="flex items-center gap-2">
                <Input value={credentialsDialog?.email ?? ""} readOnly className="font-mono" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(credentialsDialog?.email ?? "", "email")}
                >
                  {copiedField === "email" ? (
                    <Icons.check className="h-4 w-4" />
                  ) : (
                    <Icons.copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="flex items-center gap-2">
                <Input value={credentialsDialog?.password ?? ""} readOnly className="font-mono" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(credentialsDialog?.password ?? "", "password")}
                >
                  {copiedField === "password" ? (
                    <Icons.check className="h-4 w-4" />
                  ) : (
                    <Icons.copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={copyBothCredentials}
              className="w-full sm:w-auto"
            >
              {copiedField === "both" ? (
                <>
                  <Icons.check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Icons.copy className="mr-2 h-4 w-4" />
                  Copy All
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => setCredentialsDialog(null)}
              className="w-full sm:w-auto"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            {userId && canManageRoles ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Icons.edit className="mr-2 size-4" />
                  Edit role
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {/* Only show Owner option if current user is an owner */}
                    {isOwner && (
                      <DropdownMenuItem
                        disabled={isRoleOwner || isUpdatingMember || isPrimaryOwner}
                        onClick={() => handleUpdateMember("owner")}
                      >
                        Owner
                        {isRoleOwner && <Icons.check className="ml-auto size-4" />}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      disabled={isAdmin || isUpdatingMember}
                      onClick={() => handleUpdateMember("admin")}
                    >
                      Admin
                      {isAdmin && <Icons.check className="ml-auto size-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={isManager || isUpdatingMember}
                      onClick={() => handleUpdateMember("manager")}
                    >
                      Manager
                      {isManager && <Icons.check className="ml-auto size-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={isEventStaff || isUpdatingMember}
                      onClick={() => handleUpdateMember("event_staff")}
                    >
                      Event Staff
                      {isEventStaff && <Icons.check className="ml-auto size-4" />}
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

            {/* Reset Password action */}
            {userId && canManageMembers && (
              <DropdownMenuItem disabled={isResettingPassword} onClick={handleResetPassword}>
                <Icons.key className="mr-2 size-4" />
                Reset Password
              </DropdownMenuItem>
            )}

            {canManageMembers && (
              <>
                <DropdownMenuSeparator />
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
              </>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
