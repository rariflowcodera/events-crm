"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { useMarkAttendance } from "@/trpc/hooks/guests-hooks"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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

interface AttendanceToggleProps {
  guestId: string
  isAttended: boolean
  status: GuestStatus
  guestName?: string
}

const ALLOWED_STATUSES: GuestStatus[] = ["confirmed", "attended"]

export function AttendanceToggle({
  guestId,
  isAttended,
  status,
  guestName,
}: AttendanceToggleProps) {
  const [optimisticAttended, setOptimisticAttended] = useState(isAttended)
  const [showUndoConfirm, setShowUndoConfirm] = useState(false)
  const { mutate, isPending } = useMarkAttendance({
    onError: () => {
      // Revert optimistic update on error
      setOptimisticAttended(isAttended)
    },
  })

  const canMarkAttendance = ALLOWED_STATUSES.includes(status)

  // Don't render toggle for disallowed statuses
  if (!canMarkAttendance) {
    return null
  }

  const handleToggle = (checked: boolean) => {
    if (!checked && optimisticAttended) {
      // Undoing attendance - show confirmation
      setShowUndoConfirm(true)
      return
    }
    // Marking attendance - proceed immediately
    setOptimisticAttended(checked)
    mutate({ guestId, attended: checked })
  }

  const handleConfirmUndo = () => {
    setOptimisticAttended(false)
    mutate({ guestId, attended: false })
    setShowUndoConfirm(false)
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Switch
            checked={optimisticAttended}
            onCheckedChange={handleToggle}
            disabled={isPending}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: optimisticAttended ? "#16a34a" : "#f87171",
            }}
          />
        </TooltipTrigger>
        <TooltipContent>
          {optimisticAttended
            ? `${guestName || "Guest"} attended. Click to undo.`
            : `Mark ${guestName || "guest"} as attended`}
        </TooltipContent>
      </Tooltip>

      <AlertDialog open={showUndoConfirm} onOpenChange={setShowUndoConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo Attendance?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to undo attendance for{" "}
              {guestName || "this guest"}? Their status will be reverted to
              confirmed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUndo}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Undoing..." : "Undo Attendance"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
