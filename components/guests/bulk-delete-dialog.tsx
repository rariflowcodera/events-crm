"use client"

import { useBulkDeleteGuests } from "@/trpc/hooks/guests-hooks"
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

interface BulkDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  guestIds: string[]
  eventId: string
  onSuccess: () => void
}

export function BulkDeleteDialog({
  isOpen,
  onClose,
  guestIds,
  eventId,
  onSuccess,
}: BulkDeleteDialogProps) {
  const { mutate: bulkDelete, isPending } = useBulkDeleteGuests({
    onSuccess: () => {
      onClose()
      onSuccess()
    },
  })

  const handleDelete = () => {
    bulkDelete({ eventId, guestIds })
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {guestIds.length} Guests</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {guestIds.length} guest
            {guestIds.length === 1 ? "" : "s"}? This action cannot be undone.
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
              `Delete ${guestIds.length} Guest${guestIds.length === 1 ? "" : "s"}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
