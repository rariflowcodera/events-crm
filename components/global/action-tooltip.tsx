"use client"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ActionTooltipProps {
  label: string
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  delayDuration?: number
  className?: string
  content?: React.ReactNode
  contentClassName?: string
}

export function ActionTooltip({
  label,
  className,
  delayDuration,
  children,
  side,
  align,
  content,
  contentClassName,
}: ActionTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={delayDuration ? delayDuration : 50}>
        <TooltipTrigger className={cn(className)} asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className={cn(
            "flex cursor-default flex-row items-center justify-between px-3 py-1",
            contentClassName
          )}
        >
          <p className="line-clamp-3 max-w-[27ch] text-[13px] font-normal whitespace-pre-wrap">
            {label}
          </p>
          {content && content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
