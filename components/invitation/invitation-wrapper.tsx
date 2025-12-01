import { ReactNode } from "react"

import { cn } from "@/lib/utils"

type InvitationWrapperProps = {
  children: ReactNode
  className?: string
}

export function InvitationWrapper({ children, className }: InvitationWrapperProps) {
  return (
    <div
      className={cn("flex h-screen flex-col items-center justify-center gap-y-4 p-4", className)}
    >
      {children}
    </div>
  )
}
