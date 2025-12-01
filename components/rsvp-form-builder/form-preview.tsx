"use client"

import { useTranslations } from "next-intl"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

import { BilingualDisplay } from "./bilingual-input"
import { STANDARD_FIELDS, getFieldsForSection } from "@/lib/rsvp"
import type { RsvpFormConfig, RsvpFormSection, CustomFieldDefinition } from "@/server/db/schemas/event"
import type { StandardFieldDefinition } from "@/lib/rsvp/types"

interface FormPreviewProps {
  config: RsvpFormConfig
  language: "en" | "ar"
  previewCategoryId?: string
  className?: string
}

export function FormPreview({
  config,
  language,
  previewCategoryId,
  className,
}: FormPreviewProps) {
  const t = useTranslations("rsvpFormBuilder")
  const isRtl = language === "ar"

  // Filter and sort sections
  const enabledSections = config.sections
    .filter((s) => s.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  // Check if a field should be visible for the preview category
  const isFieldVisible = (visibleToCategories?: string[]): boolean => {
    if (!visibleToCategories || visibleToCategories.length === 0) return true
    if (!previewCategoryId) return true
    return visibleToCategories.includes(previewCategoryId)
  }

  return (
    <div className={cn("space-y-6", className)} dir={isRtl ? "rtl" : "ltr"}>
      {/* Preview Header */}
      <div className="rounded-lg bg-muted/50 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          {t("previewMode")} - {language === "ar" ? "العربية" : "English"}
        </p>
      </div>

      {/* Form Sections */}
      {enabledSections.map((section) => (
        <SectionPreview
          key={section.id}
          section={section}
          language={language}
          isFieldVisible={isFieldVisible}
        />
      ))}

      {/* Submit Button Preview */}
      <div className="pt-4">
        <Button className="w-full" disabled>
          <BilingualDisplay
            value={config.settings.submitButtonText || { en: "Submit RSVP", ar: "إرسال تأكيد الحضور" }}
            language={language}
          />
        </Button>
      </div>

      {/* Settings Info */}
      {config.settings.showProgressIndicator && (
        <p className="text-xs text-muted-foreground text-center">
          {t("progressIndicatorEnabled")}
        </p>
      )}
    </div>
  )
}

interface SectionPreviewProps {
  section: RsvpFormSection
  language: "en" | "ar"
  isFieldVisible: (visibleToCategories?: string[]) => boolean
}

function SectionPreview({ section, language, isFieldVisible }: SectionPreviewProps) {
  const standardFieldDefs = getFieldsForSection(section.id)

  // Get enabled standard fields that are visible
  const visibleStandardFields = section.standardFields
    .filter((config) => config.enabled && isFieldVisible(config.visibleToCategories))
    .map((config) => {
      const def = standardFieldDefs.find((d) => d.fieldKey === config.fieldKey)
      return def ? { config, def } : null
    })
    .filter((f): f is { config: typeof section.standardFields[0]; def: StandardFieldDefinition } => f !== null)

  // Get visible custom fields
  const visibleCustomFields = section.customFields
    .filter((field) => isFieldVisible(field.visibleToCategories))
    .sort((a, b) => a.sortOrder - b.sortOrder)

  // Don't render empty sections
  if (visibleStandardFields.length === 0 && visibleCustomFields.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          <BilingualDisplay value={section.title} language={language} />
        </CardTitle>
        {section.description && (
          <CardDescription>
            <BilingualDisplay value={section.description} language={language} fallback="" />
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Standard Fields */}
        {visibleStandardFields.map(({ config, def }) => (
          <FieldPreview
            key={def.fieldKey}
            type={def.type}
            label={config.labelOverride || def.label}
            description={def.description}
            placeholder={def.placeholder}
            options={def.options}
            required={config.required}
            language={language}
          />
        ))}

        {/* Custom Fields */}
        {visibleCustomFields.map((field) => (
          <FieldPreview
            key={field.id}
            type={field.type}
            label={field.label}
            description={field.description}
            placeholder={field.placeholder}
            options={field.options}
            required={field.required}
            language={language}
          />
        ))}
      </CardContent>
    </Card>
  )
}

interface FieldPreviewProps {
  type: string
  label: { en: string; ar?: string }
  description?: { en: string; ar?: string }
  placeholder?: { en: string; ar?: string }
  options?: Array<{ value: string; label: { en: string; ar?: string } }>
  required: boolean
  language: "en" | "ar"
}

function FieldPreview({
  type,
  label,
  description,
  placeholder,
  options,
  required,
  language,
}: FieldPreviewProps) {
  const labelText = language === "ar" ? (label.ar || label.en) : label.en
  const placeholderText = placeholder
    ? language === "ar"
      ? placeholder.ar || placeholder.en
      : placeholder.en
    : undefined

  const renderField = () => {
    switch (type) {
      case "text":
      case "email":
      case "phone":
      case "number":
        return (
          <Input
            type={type === "phone" ? "tel" : type}
            placeholder={placeholderText}
            disabled
            className={cn(language === "ar" && "text-right")}
          />
        )

      case "textarea":
        return (
          <Textarea
            placeholder={placeholderText}
            disabled
            rows={3}
            className={cn(language === "ar" && "text-right")}
          />
        )

      case "date":
        return <Input type="date" disabled />

      case "select":
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder={placeholderText || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <BilingualDisplay value={opt.label} language={language} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case "radio":
        return (
          <RadioGroup disabled className="space-y-2">
            {options?.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-2">
                <RadioGroupItem value={opt.value} id={`preview-${opt.value}`} />
                <Label htmlFor={`preview-${opt.value}`} className="font-normal">
                  <BilingualDisplay value={opt.label} language={language} />
                </Label>
              </div>
            ))}
          </RadioGroup>
        )

      case "checkbox":
        return (
          <div className="space-y-2">
            {options?.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-2">
                <Checkbox id={`preview-${opt.value}`} disabled />
                <Label htmlFor={`preview-${opt.value}`} className="font-normal">
                  <BilingualDisplay value={opt.label} language={language} />
                </Label>
              </div>
            ))}
          </div>
        )

      default:
        return <Input placeholder={placeholderText} disabled />
    }
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {labelText}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {description && (
        <p className="text-xs text-muted-foreground">
          <BilingualDisplay value={description} language={language} fallback="" />
        </p>
      )}
      {renderField()}
    </div>
  )
}
