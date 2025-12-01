"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

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

interface GuestStatusBadgeProps {
  status: GuestStatus
  className?: string
}

const statusConfig: Record<GuestStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  pending: {
    label: "Pending",
    variant: "secondary",
    className: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  },
  invited: {
    label: "Invited",
    variant: "secondary",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  },
  reminded: {
    label: "Reminded",
    variant: "secondary",
    className: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  },
  viewed: {
    label: "Viewed",
    variant: "secondary",
    className: "bg-indigo-100 text-indigo-700 hover:bg-indigo-100",
  },
  confirmed: {
    label: "Confirmed",
    variant: "default",
    className: "bg-green-100 text-green-700 hover:bg-green-100",
  },
  declined: {
    label: "Declined",
    variant: "destructive",
    className: "bg-red-100 text-red-700 hover:bg-red-100",
  },
  maybe: {
    label: "Maybe",
    variant: "secondary",
    className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  },
  waitlisted: {
    label: "Waitlisted",
    variant: "outline",
    className: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  },
  cancelled: {
    label: "Cancelled",
    variant: "destructive",
    className: "bg-gray-100 text-gray-500 hover:bg-gray-100",
  },
  attended: {
    label: "Attended",
    variant: "default",
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  },
  no_show: {
    label: "No Show",
    variant: "destructive",
    className: "bg-rose-100 text-rose-700 hover:bg-rose-100",
  },
}

export function GuestStatusBadge({ status, className }: GuestStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge
      variant={config.variant}
      className={cn("font-medium", config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
