import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Icons } from "@/components/global/icons"

type AlertProps = {
  children?: React.ReactNode
  title: string
  icon: keyof typeof Icons
  variant?: "info" | "warning" | "error" | "subscription"
}

export function Alert({ children, title, icon, variant = "info" }: AlertProps) {
  const Icon = Icons[icon]

  return (
    <div
      className={cn("flex items-center gap-x-2 rounded-lg border px-4 py-2", {
        "border-indigo-500/80 bg-indigo-600/10": variant === "info",
        "border-yellow-400/80 bg-yellow-400/5 dark:border-yellow-500/80 dark:bg-yellow-600/10":
          variant === "warning",
        "border-red-500/80 bg-red-600/10 py-3": variant === "error",
        "border-green-500/80 bg-green-600/10": variant === "subscription",
      })}
    >
      <Icon
        className={cn("size-4", {
          "text-indigo-400": variant === "info",
          "text-yellow-500 dark:text-yellow-400": variant === "warning",
          "text-red-400": variant === "error",
          "text-green-400": variant === "subscription",
        })}
      />
      <span
        className={cn("text-xs font-semibold", {
          "text-indigo-600 dark:text-indigo-400": variant === "info",
          "text-yellow-500 dark:text-yellow-400": variant === "warning",
          "text-red-400": variant === "error",
          "text-green-600 dark:text-green-400": variant === "subscription",
        })}
      >
        {title}
      </span>
      {children}
    </div>
  )
}

export function AlertSkeleton() {
  return <Skeleton className="h-8 w-full" />
}
