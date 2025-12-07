"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { useDeleteGuest } from "@/trpc/hooks/guests-hooks"
import { getRsvpUrl } from "@/lib/rsvp-url"
import { Button } from "@/components/ui/button"
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
}

export function GuestRowActions({ guest, eventId, event }: GuestRowActionsProps) {
  const t = useTranslations("guest")
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { mutate: deleteGuest, isPending: isDeleting } = useDeleteGuest({
    onSuccess: () => {
      setShowDeleteDialog(false)
      router.refresh()
    },
  })

  const handleCopyRsvpLink = () => {
    const rsvpUrl = getRsvpUrl(event, guest.rsvpToken)
    navigator.clipboard.writeText(rsvpUrl)
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
          <DropdownMenuItem onClick={handleCopyRsvpLink}>
            <Icons.link className="mr-2 h-4 w-4" />
            Copy RSVP Link
          </DropdownMenuItem>
          {guest.email && (
            <DropdownMenuItem disabled>
              <Icons.mail className="mr-2 h-4 w-4" />
              Send Invitation
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Icons.trash className="mr-2 h-4 w-4" />
            Delete Guest
          </DropdownMenuItem>
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
