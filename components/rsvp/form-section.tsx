"use client"

import { useFormContext } from "react-hook-form"
import { ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import { DynamicField } from "./dynamic-field"
import type { FormSectionProps } from "@/lib/rsvp/types"

interface FormSectionComponentProps extends FormSectionProps {
  locale: "en" | "ar"
  isOpen: boolean
  onToggle: () => void
  showProgress?: boolean
  sectionIndex: number
  totalSections: number
}

export function FormSection({
  id,
  title,
  description,
  fields,
  locale,
  isOpen,
  onToggle,
  showProgress,
  sectionIndex,
  totalSections,
}: FormSectionComponentProps) {
  const { formState, watch } = useFormContext()
  const isRtl = locale === "ar"

  // Calculate completion status for this section
  const sectionFields = fields.filter((f) => f.required)
  const completedFields = sectionFields.filter((f) => {
    const value = watch(f.fieldKey)
    if (Array.isArray(value)) return value.length > 0
    return value !== undefined && value !== "" && value !== null
  })
  const isComplete = sectionFields.length === 0 || completedFields.length === sectionFields.length
  const progress = sectionFields.length > 0
    ? Math.round((completedFields.length / sectionFields.length) * 100)
    : 100

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div
        className={cn(
          "rounded-lg border bg-card",
          isComplete && "border-green-200 dark:border-green-900",
          !isComplete && isOpen && "border-primary"
        )}
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-between p-4 h-auto hover:bg-transparent",
              isRtl && "flex-row-reverse"
            )}
          >
            <div className={cn("flex items-center gap-3", isRtl && "flex-row-reverse")}>
              {showProgress && (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                  {sectionIndex + 1}
                </div>
              )}
              <div className={cn("text-left", isRtl && "text-right")}>
                <h3 className="font-semibold text-base">{title}</h3>
                {description && (
                  <p className="text-sm text-muted-foreground font-normal mt-0.5">
                    {description}
                  </p>
                )}
              </div>
            </div>
            <div className={cn("flex items-center gap-2", isRtl && "flex-row-reverse")}>
              {showProgress && sectionFields.length > 0 && (
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full",
                  isComplete
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                )}>
                  {progress}%
                </span>
              )}
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            <div className="border-t pt-4" />
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
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
