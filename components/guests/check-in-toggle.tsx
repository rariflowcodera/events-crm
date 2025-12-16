"use client"

import { useState } from "react"
import { Check, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useCheckInGuest } from "@/trpc/hooks/guests-hooks"
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

interface CheckInToggleProps {
  guestId: string
  isCheckedIn: boolean
  status: GuestStatus
  guestName?: string
  size?: "sm" | "lg"
}

const ALLOWED_STATUSES: GuestStatus[] = [
  "confirmed",
  "maybe",
  "reminded",
  "viewed",
  "invited",
]

export function CheckInToggle({
  guestId,
  isCheckedIn,
  status,
  guestName,
  size = "sm",
}: CheckInToggleProps) {
  const [optimisticCheckedIn, setOptimisticCheckedIn] = useState(isCheckedIn)
  const { mutate, isPending } = useCheckInGuest({
    onError: () => {
      // Revert optimistic update on error
      setOptimisticCheckedIn(isCheckedIn)
    },
  })

  const canCheckIn = ALLOWED_STATUSES.includes(status)

  // Don't render toggle for disallowed statuses
  if (!canCheckIn) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center">
            <span className="text-muted-foreground text-xs">-</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>Cannot check in: {status}</TooltipContent>
      </Tooltip>
    )
  }

  const handleToggle = () => {
    const newValue = !optimisticCheckedIn
    setOptimisticCheckedIn(newValue) // Optimistic update
    mutate({ guestId, checkIn: newValue })
  }

  const buttonSize = size === "lg" ? "h-12 w-12" : "h-8 w-8"
  const iconSize = size === "lg" ? "h-6 w-6" : "h-4 w-4"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={optimisticCheckedIn ? "default" : "outline"}
          size="icon"
          className={cn(
            buttonSize,
            optimisticCheckedIn && "bg-green-600 hover:bg-green-700",
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
          ) : optimisticCheckedIn ? (
            <Check className={iconSize} />
          ) : (
            <X className={cn(iconSize, "text-muted-foreground")} />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {optimisticCheckedIn
          ? `${guestName || "Guest"} is checked in. Click to undo.`
          : `Check in ${guestName || "guest"}`}
      </TooltipContent>
    </Tooltip>
  )
}
