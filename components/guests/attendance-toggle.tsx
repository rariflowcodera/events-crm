"use client"

import { useState } from "react"
import { Check, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
  size?: "sm" | "lg"
}

const ALLOWED_STATUSES: GuestStatus[] = [
  "confirmed",
  "attended",
]

export function AttendanceToggle({
  guestId,
  isAttended,
  status,
  guestName,
  size = "sm",
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

  const handleToggle = () => {
    const newValue = !optimisticAttended
    setOptimisticAttended(newValue) // Optimistic update
    mutate({ guestId, attended: newValue })
  }

  const buttonSize = size === "lg" ? "h-12 w-12" : "h-8 w-8"
  const iconSize = size === "lg" ? "h-6 w-6" : "h-4 w-4"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={optimisticAttended ? "default" : "outline"}
          size="icon"
          className={cn(
            buttonSize,
            optimisticAttended && "bg-green-600 hover:bg-green-700",
            "transition-all"
          )}
          onClick={(e) => {
            e.stopPropagation() // Prevent row navigation
            handleToggle()
          }}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className={cn(iconSize, "animate-spin")} />
          ) : optimisticAttended ? (
            <Check className={iconSize} />
          ) : (
            <X className={cn(iconSize, "text-muted-foreground")} />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {optimisticAttended
          ? `${guestName || "Guest"} attended. Click to undo.`
          : `Mark ${guestName || "guest"} as attended`}
      </TooltipContent>
    </Tooltip>
  )
}
