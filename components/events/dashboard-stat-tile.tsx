"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { LucideIcon } from "lucide-react"

interface DashboardStatTileProps {
  label: string
  value: string | number
  icon?: LucideIcon
  variant?: "default" | "success" | "warning" | "destructive" | "muted"
  description?: string
  isLoading?: boolean
}

const variantStyles = {
  default: "bg-card",
  success: "bg-green-50 dark:bg-green-950/30",
  warning: "bg-yellow-50 dark:bg-yellow-950/30",
  destructive: "bg-red-50 dark:bg-red-950/30",
  muted: "bg-muted/50",
}

export function DashboardStatTile({
  label,
  value,
  icon: Icon,
  variant = "default",
  description,
  isLoading,
}: DashboardStatTileProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border p-4">
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-8 w-16" />
      </div>
    )
  }

  return (
    <div className={cn("rounded-lg border p-4", variantStyles[variant])}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  )
}
