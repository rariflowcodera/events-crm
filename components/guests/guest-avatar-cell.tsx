"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { User } from "lucide-react"

interface GuestAvatarCellProps {
  profileImage: string | null
  firstName: string
  lastName?: string | null
  onClick?: () => void
}

export function GuestAvatarCell({
  profileImage,
  firstName,
  lastName,
  onClick,
}: GuestAvatarCellProps) {
  const initials = `${firstName[0] || ""}${lastName?.[0] || ""}`.toUpperCase()
  const hasImage = !!profileImage

  return (
    <Avatar
      className={cn(
        "size-8 border border-border",
        hasImage && "cursor-pointer hover:ring-2 hover:ring-primary/50 transition-shadow"
      )}
      onClick={(e) => {
        if (hasImage && onClick) {
          e.stopPropagation()
          onClick()
        }
      }}
    >
      {profileImage ? (
        <AvatarImage src={profileImage} alt={[firstName, lastName].filter(Boolean).join(" ")} />
      ) : null}
      <AvatarFallback className="text-xs bg-muted">
        {initials || <User className="size-3" />}
      </AvatarFallback>
    </Avatar>
  )
}
