"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface GuestCategory {
  id: string
  name: string
  code: string
  color: string | null
}

interface GuestCategoryBadgeProps {
  category: GuestCategory
  className?: string
}

export function GuestCategoryBadge({ category, className }: GuestCategoryBadgeProps) {
  const backgroundColor = category.color || "#6366f1"

  // Calculate contrasting text color
  const getContrastColor = (hexColor: string) => {
    const hex = hexColor.replace("#", "")
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? "#000000" : "#ffffff"
  }

  const textColor = getContrastColor(backgroundColor)

  return (
    <Badge
      variant="outline"
      className={cn("font-medium border-0", className)}
      style={{
        backgroundColor: `${backgroundColor}20`,
        color: backgroundColor,
      }}
    >
      {category.code}
    </Badge>
  )
}
