"use client"

import { Check, X, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { isLightColor } from "@/lib/color-utils"

interface VisualResponseSelectorProps {
  value?: string
  onChange: (value: string) => void
  confirmLabel: string
  declineLabel: string
  maybeLabel: string
  showMaybeOption: boolean
  isRtl: boolean
  cardBackgroundColor?: string
}

interface ResponseOption {
  value: "confirmed" | "declined" | "maybe"
  label: string
  Icon: typeof Check
  iconBg: string
  iconColor: string
  selectedBg: string
  selectedBorder: string
  selectedText: string
}

export function VisualResponseSelector({
  value,
  onChange,
  confirmLabel,
  declineLabel,
  maybeLabel,
  showMaybeOption,
  isRtl,
  cardBackgroundColor,
}: VisualResponseSelectorProps) {
  const isDarkCard = cardBackgroundColor
    ? !isLightColor(cardBackgroundColor)
    : false

  const options: ResponseOption[] = [
    {
      value: "confirmed",
      label: confirmLabel,
      Icon: Check,
      iconBg: isDarkCard ? "bg-green-500/20" : "bg-green-100 dark:bg-green-900/30",
      iconColor: isDarkCard ? "text-green-300" : "text-green-600 dark:text-green-400",
      selectedBg: isDarkCard ? "bg-green-500/20" : "bg-green-50 dark:bg-green-900/20",
      selectedBorder: isDarkCard ? "border-green-400" : "border-green-500 dark:border-green-400",
      selectedText: isDarkCard ? "text-green-100" : "text-green-800",
    },
    {
      value: "declined",
      label: declineLabel,
      Icon: X,
      iconBg: isDarkCard ? "bg-red-500/20" : "bg-red-100 dark:bg-red-900/30",
      iconColor: isDarkCard ? "text-red-300" : "text-red-600 dark:text-red-400",
      selectedBg: isDarkCard ? "bg-red-500/20" : "bg-red-50 dark:bg-red-900/20",
      selectedBorder: isDarkCard ? "border-red-400" : "border-red-500 dark:border-red-400",
      selectedText: isDarkCard ? "text-red-100" : "text-red-800",
    },
    ...(showMaybeOption
      ? [
          {
            value: "maybe" as const,
            label: maybeLabel,
            Icon: HelpCircle,
            iconBg: isDarkCard ? "bg-amber-500/20" : "bg-amber-100 dark:bg-amber-900/30",
            iconColor: isDarkCard ? "text-amber-300" : "text-amber-600 dark:text-amber-400",
            selectedBg: isDarkCard ? "bg-amber-500/20" : "bg-amber-50 dark:bg-amber-900/20",
            selectedBorder: isDarkCard ? "border-amber-400" : "border-amber-500 dark:border-amber-400",
            selectedText: isDarkCard ? "text-amber-100" : "text-amber-800",
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
                : isDarkCard
                  ? "border-white/20 hover:border-white/40"
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
                isSelected
                  ? option.selectedText
                  : isDarkCard
                    ? "text-white/70"
                    : "text-muted-foreground"
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
