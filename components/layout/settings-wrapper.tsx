import { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

type SettingsWrapperProps = {
  title: string
  description: string
  children: ReactNode
  className?: string
}

export function SettingsWrapper({ title, description, children, className }: SettingsWrapperProps) {
  return (
    <section className={cn("flex h-[calc(100vh-2rem)] w-full flex-col gap-y-4 overflow-y-auto")}>
      <div className="grid gap-y-2 px-8 pt-8">
        <h1 className="text-sm font-semibold" aria-label={title}>
          {title}
        </h1>
        <p className="text-muted-foreground text-sm" aria-label={description}>
          {description}
        </p>
      </div>
      {/* <ScrollArea className="h-full"> */}
      <div className={cn("space-y-4 px-8 py-4", className)}>{children}</div>
      {/* </ScrollArea> */}
    </section>
  )
}

type SettingsWrapperCardProps = {
  children: ReactNode
  type?: "default" | "destructive"
} & ComponentProps<typeof Card>

export function SettingsWrapperCard({
  children,
  className,
  type = "default",
}: SettingsWrapperCardProps) {
  return (
    <Card
      className={cn(
        "bg-os-background-100 dark:bg-os-background-200 max-w-2xl overflow-hidden",
        {
          "border-destructive/40 dark:border-destructive/50": type === "destructive",
        },
        className
      )}
    >
      {children}
    </Card>
  )
}
