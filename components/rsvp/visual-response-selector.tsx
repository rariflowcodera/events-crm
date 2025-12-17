"use client"

import { Check, X, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface VisualResponseSelectorProps {
  value?: string
  onChange: (value: string) => void
  confirmLabel: string
  declineLabel: string
  maybeLabel: string
  showMaybeOption: boolean
  isRtl: boolean
}

interface ResponseOption {
  value: "confirmed" | "declined" | "maybe"
  label: string
  Icon: typeof Check
  iconBg: string
  iconColor: string
  selectedBg: string
  selectedBorder: string
}

export function VisualResponseSelector({
  value,
  onChange,
  confirmLabel,
  declineLabel,
  maybeLabel,
  showMaybeOption,
  isRtl,
}: VisualResponseSelectorProps) {
  const options: ResponseOption[] = [
    {
      value: "confirmed",
      label: confirmLabel,
      Icon: Check,
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      selectedBg: "bg-green-50 dark:bg-green-900/20",
      selectedBorder: "border-green-500 dark:border-green-400",
    },
    {
      value: "declined",
      label: declineLabel,
      Icon: X,
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      selectedBg: "bg-red-50 dark:bg-red-900/20",
      selectedBorder: "border-red-500 dark:border-red-400",
    },
    ...(showMaybeOption
      ? [
          {
            value: "maybe" as const,
            label: maybeLabel,
            Icon: HelpCircle,
            iconBg: "bg-amber-100 dark:bg-amber-900/30",
            iconColor: "text-amber-600 dark:text-amber-400",
            selectedBg: "bg-amber-50 dark:bg-amber-900/20",
            selectedBorder: "border-amber-500 dark:border-amber-400",
          },
        ]
      : []),
  ]

  return (
    <div
      className={cn(
        "flex gap-3",
        "flex-col sm:flex-row",
        isRtl && "sm:flex-row-reverse"
      )}
    >
      {options.map((option) => {
        const isSelected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-2 transition-all",
              "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
              isSelected
                ? cn(option.selectedBorder, option.selectedBg)
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            <div
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-transform",
                option.iconBg,
                isSelected && "scale-110"
              )}
            >
              <option.Icon className={cn("w-7 h-7", option.iconColor)} />
            </div>
            <span
              className={cn(
                "font-medium text-sm",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
