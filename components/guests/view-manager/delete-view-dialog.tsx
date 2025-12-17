"use client"

import { useDeleteGuestListView } from "@/trpc/hooks/guest-list-views-hooks"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Icons } from "@/components/global/icons"

interface DeleteViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  view: { id: string; name: string }
  onSuccess?: () => void
}

export function DeleteViewDialog({
  open,
  onOpenChange,
  view,
  onSuccess,
}: DeleteViewDialogProps) {
  const { mutate: deleteView, isPending } = useDeleteGuestListView({
    onSuccess: () => {
      onOpenChange(false)
      onSuccess?.()
    },
  })

  const handleDelete = () => {
    deleteView({ viewId: view.id })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete View</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{view.name}&quot;? This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete View"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
