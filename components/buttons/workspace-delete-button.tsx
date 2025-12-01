import { ComponentProps, useState } from "react"
import { WorkspaceType } from "@/server/db/schema-types"
import { useLeaveWorkspaceTRPC } from "@/trpc/hooks/members-hooks"
import { useDeleteWorkspaceTRPC } from "@/trpc/hooks/workspaces-hooks"

import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icons } from "@/components/global/icons"

type WorkspaceDeleteButtonProps = {
  text?: string | null
  isOwner: boolean
  slug: WorkspaceType["slug"]
  enableRedirect?: boolean
  id: WorkspaceType["id"]
} & ComponentProps<typeof Button>

export function WorkspaceDeleteButton({
  size,
  text = null,
  isOwner,
  slug,
  variant,
  className,
  enableRedirect = true,
  id,
}: WorkspaceDeleteButtonProps) {
  const [confirmText, setConfirmText] = useState<string>("")
  const [showDeleteAlert, setShowDeleteAlert] = useState<boolean>(false)

  const isConfirmed = confirmText.toLowerCase() === "confirm delete"

  const { isPending: isDeleting, mutate } = useDeleteWorkspaceTRPC({ enableRedirect })

  const { isPending: isLeaving, mutate: leaveWorkspace } = useLeaveWorkspaceTRPC({ slug })

  const handleDeleteWorkspace = () => {
    mutate({ id })
  }

  const handleLeaveWorkspace = () => {
    leaveWorkspace({ slug })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && isConfirmed) {
      handleDeleteWorkspace()
      setShowDeleteAlert(false)
    }
  }

  return (
    <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant ? variant : "destructive"}
          type="button"
          className={cn("", className)}
          size={size}
        >
          {!isOwner && <Icons.logout />}
          {text}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground flex flex-col gap-y-2 text-sm">
            {isOwner ? (
              <>
                By proceeding to deleting this Workspace, you&apos;re removing access to all members
                and deleting all their data from our system.
                <span className="mt-4 flex flex-col gap-y-1">
                  <span className="mb-2">
                    Please type <span className="text-primary font-bold">Confirm delete</span> to
                    confirm.
                  </span>
                  <Input
                    autoFocus
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Confirm delete"
                    className="text-primary w-full font-medium"
                  />
                </span>
              </>
            ) : (
              "By proceeding to leaving this Workspace, you are removing access to this Workspace and all its data."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={isOwner ? handleDeleteWorkspace : handleLeaveWorkspace}
            disabled={isDeleting || isLeaving || (isOwner && !isConfirmed)}
            type="button"
            className="bg-destructive dark:bg-destructive/20 hover:bg-destructive gap-x-2 dark:text-red-500"
          >
            {isDeleting || isLeaving ? <Icons.loader className="size-4 animate-spin" /> : null}
            <span>{isOwner ? "Delete" : "Leave"}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
