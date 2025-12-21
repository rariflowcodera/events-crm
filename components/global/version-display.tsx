"use client"

import { NEXT_PUBLIC_APP_VERSION_ENV } from "@/env"

import { cn } from "@/lib/utils"

interface VersionDisplayProps {
  className?: string
}

export function VersionDisplay({ className }: VersionDisplayProps) {
  return (
    <div
      className={cn(
        "px-2 py-1 text-[11px] font-medium text-muted-foreground/60",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
    >
      v{NEXT_PUBLIC_APP_VERSION_ENV}
    </div>
  )
}
