"use client"

import { cn } from "@/lib/utils"

import { DynamicField } from "./dynamic-field"
import type { FormSectionProps } from "@/lib/rsvp/types"

type SectionHeader = {
  backgroundColor: string
  textColor: string
}

interface FormSectionComponentProps extends FormSectionProps {
  locale: "en" | "ar"
  showProgress?: boolean
  sectionIndex: number
  totalSections: number
  sectionHeaderStyle?: SectionHeader
}

export function FormSection({
  title,
  description,
  fields,
  locale,
  showProgress,
  sectionIndex,
  sectionHeaderStyle,
}: FormSectionComponentProps) {
  const isRtl = locale === "ar"

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Section header */}
      <div
        className={cn(
          "flex items-center gap-3",
          isRtl && "flex-row-reverse",
          sectionHeaderStyle && "px-3 py-2 sm:px-4 sm:py-2.5 rounded-md -mx-1"
        )}
        style={sectionHeaderStyle ? {
          backgroundColor: sectionHeaderStyle.backgroundColor,
          color: sectionHeaderStyle.textColor,
        } : undefined}
      >
        {showProgress && (
          <div
            className={cn(
              "flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-medium",
              sectionHeaderStyle ? "bg-white/20" : "bg-muted"
            )}
            style={sectionHeaderStyle ? { color: sectionHeaderStyle.textColor } : undefined}
          >
            {sectionIndex + 1}
          </div>
        )}
        <div className={cn("text-left", isRtl && "text-right")}>
          <h3 className="font-semibold text-sm sm:text-base">{title}</h3>
          {description && (
            <p className={cn(
              "text-sm mt-0.5",
              sectionHeaderStyle ? "opacity-80" : "text-muted-foreground"
            )}>
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Fields - always visible */}
      {fields.length > 0 ? (
        <div className="space-y-4 sm:space-y-6">
          {fields.map((field) => (
            <DynamicField
              key={field.fieldKey}
              {...field}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          {locale === "ar" ? "لا توجد حقول في هذا القسم" : "No fields in this section"}
        </p>
      )}
    </div>
  )
}
