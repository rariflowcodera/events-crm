import { ReactNode } from "react"

import { cn } from "@/lib/utils"

type SectionWrapperProps = {
  children: ReactNode
  className?: string
}

export function SectionWrapper({ children, className }: SectionWrapperProps) {
  return (
    <section
      className={cn("mx-auto flex size-full max-w-7xl flex-col gap-y-4 px-4 py-2", className)}
    >
      {children}
    </section>
  )
}
