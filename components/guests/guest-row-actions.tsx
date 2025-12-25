"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { useDeleteGuest } from "@/trpc/hooks/guests-hooks"
import { getRsvpUrl, getShortRsvpUrl, getFullRsvpUrl } from "@/lib/rsvp-url"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/permissions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Icons } from "@/components/global/icons"
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
import { useState } from "react"
import { toast } from "sonner"

type GuestStatus =
  | "pending"
  | "invited"
  | "reminded"
  | "viewed"
  | "confirmed"
  | "declined"
  | "maybe"
  | "waitlisted"
  | "cancelled"
  | "attended"
  | "no_show"

interface Guest {
  id: string
  firstName: string
  lastName: string
  email: string | null
  rsvpToken: string
  rsvpShortCode: string | null
  status: GuestStatus
}

interface EventCustomDomain {
  customDomain: string | null
  customDomainVerified: boolean | null
}

interface GuestRowActionsProps {
  guest: Guest
  eventId: string
  event: EventCustomDomain
  workspaceSlug: string
}

export function GuestRowActions({ guest, eventId, event, workspaceSlug }: GuestRowActionsProps) {
  const t = useTranslations("guest")
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { can } = usePermissions(workspaceSlug)

  // Permission checks
  const canDeleteGuests = can(PERMISSIONS.DELETE_GUESTS)
  const canSendEmails = can(PERMISSIONS.SEND_EMAILS)

  const { mutate: deleteGuest, isPending: isDeleting } = useDeleteGuest({
    onSuccess: () => {
      setShowDeleteDialog(false)
      router.refresh()
    },
  })

  const handleCopyRsvpLink = () => {
    const rsvpUrl = getFullRsvpUrl(event, guest)
    navigator.clipboard.writeText(rsvpUrl)
    toast.success("RSVP link copied to clipboard")
  }

  const handleCopyShortRsvpLink = () => {
    const shortUrl = getShortRsvpUrl(event, guest)
    if (shortUrl) {
      navigator.clipboard.writeText(shortUrl)
      toast.success("Short RSVP link copied to clipboard")
    }
  }

  const handleDelete = () => {
    deleteGuest({ guestId: guest.id })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Icons.actions className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {guest.rsvpShortCode && (
            <DropdownMenuItem onClick={handleCopyShortRsvpLink}>
              <Icons.link className="mr-2 h-4 w-4" />
              Copy Short RSVP Link
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleCopyRsvpLink}>
            <Icons.link className="mr-2 h-4 w-4" />
            Copy RSVP Link
          </DropdownMenuItem>
          {guest.email && canSendEmails && (
            <DropdownMenuItem disabled>
              <Icons.mail className="mr-2 h-4 w-4" />
              Send Invitation
            </DropdownMenuItem>
          )}
          {canDeleteGuests && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Icons.trash className="mr-2 h-4 w-4" />
                Delete Guest
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Guest</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {guest.firstName} {guest.lastName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
