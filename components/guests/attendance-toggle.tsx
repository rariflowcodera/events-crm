"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { useMarkAttendance } from "@/trpc/hooks/guests-hooks"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
    setOptimisticAttended(checked) // Optimistic update
    mutate({ guestId, attended: checked })
  }

  return (
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
  )
}
