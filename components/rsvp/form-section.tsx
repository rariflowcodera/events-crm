"use client"

import { cn } from "@/lib/utils"

import { DynamicField } from "./dynamic-field"
import type { FormSectionProps } from "@/lib/rsvp/types"

interface FormSectionComponentProps extends FormSectionProps {
  locale: "en" | "ar"
  showProgress?: boolean
  sectionIndex: number
  totalSections: number
}

export function FormSection({
  title,
  description,
  fields,
  locale,
  showProgress,
  sectionIndex,
}: FormSectionComponentProps) {
  const isRtl = locale === "ar"

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className={cn("flex items-center gap-3", isRtl && "flex-row-reverse")}>
        {showProgress && (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
            {sectionIndex + 1}
          </div>
        )}
        <div className={cn("text-left", isRtl && "text-right")}>
          <h3 className="font-semibold text-base">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>

      {/* Fields - always visible */}
      {fields.length > 0 ? (
        <div className="space-y-6">
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
