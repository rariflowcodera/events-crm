"use client"

import { useState, useMemo } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { FormSection } from "./form-section"
import {
  STANDARD_FIELDS,
  isStandardField,
  getMaterializedColumn,
} from "@/lib/rsvp"
import type {
  RsvpFormConfig,
  RsvpFormSection,
  StandardFieldConfig,
  CustomFieldDefinition,
  BilingualText,
  DynamicFieldProps,
  FieldType,
} from "@/lib/rsvp/types"

type SectionHeaderStyle = {
  backgroundColor: string
  textColor: string
}

interface DynamicFormRendererProps {
  config: RsvpFormConfig
  categoryId: string
  locale: "en" | "ar"
  onSubmit: (data: FormData) => Promise<void>
  initialValues?: Record<string, unknown>
  disabled?: boolean
  /** If true, renders only the sections without form wrapper and submit button */
  embedded?: boolean
  /** Ref to expose form methods for embedded mode */
  formRef?: React.MutableRefObject<{
    getFormData: () => FormData
    getSectionsWithFields: () => Array<{
      id: string
      fieldKeys: string[]
      requiredFieldKeys: string[]
    }>
    triggerValidation: (fieldKeys: string[]) => Promise<boolean>
  } | null>
  /** If provided, only render this specific section (0-indexed) */
  sectionIndex?: number
  /** Section header styling from branding settings */
  sectionHeaderStyle?: SectionHeaderStyle
}

interface FormData {
  responseStatus: "confirmed" | "declined" | "maybe"
  standardResponses: Record<string, unknown>
  customResponses: Record<string, unknown>
}

/**
 * Get localized text from a bilingual object
 */
function getLocalizedText(text: BilingualText | undefined, locale: "en" | "ar"): string {
  if (!text) return ""
  return (locale === "ar" ? text.ar : text.en) || text.en || ""
}

/**
 * Check if a field should be visible based on conditional logic
 */
function isFieldVisible(
  conditionalOn: { fieldKey: string; operator?: string; value?: unknown } | undefined,
  formValues: Record<string, unknown>
): boolean {
  if (!conditionalOn) return true

  const dependsOnValue = formValues[conditionalOn.fieldKey]
  const operator = conditionalOn.operator || "not_empty"
  const targetValue = conditionalOn.value

  switch (operator) {
    case "equals":
      return dependsOnValue === targetValue
    case "not_equals":
      return dependsOnValue !== targetValue
    case "contains":
      if (Array.isArray(dependsOnValue) && typeof targetValue === "string") {
        return dependsOnValue.includes(targetValue)
      }
      return false
    case "not_empty":
      if (Array.isArray(dependsOnValue)) return dependsOnValue.length > 0
      return dependsOnValue !== undefined && dependsOnValue !== "" && dependsOnValue !== null
    default:
      return true
  }
}

/**
 * Check if a field should be visible based on category visibility settings
 */
function isVisibleToCategory(
  visibleToCategories: string[] | undefined,
  categoryId: string
): boolean {
  // If no categories specified, visible to all
  if (!visibleToCategories || visibleToCategories.length === 0) return true
  return visibleToCategories.includes(categoryId)
}

export function DynamicFormRenderer({
  config,
  categoryId,
  locale,
  onSubmit,
  initialValues = {},
  disabled = false,
  embedded = false,
  formRef,
  sectionIndex,
  sectionHeaderStyle,
}: DynamicFormRendererProps) {
  const t = useTranslations("rsvp")
  const tCommon = useTranslations("common")
  const isRtl = locale === "ar"

  const [submitting, setSubmitting] = useState(false)

  const methods = useForm({
    defaultValues: initialValues,
  })

  const formValues = methods.watch()

  /**
   * Convert form config sections into renderable field props
   */
  const renderedSections = useMemo(() => {
    const enabledSections = config.sections
      .filter((section) => section.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)

    return enabledSections.map((section) => {
      const fields: DynamicFieldProps[] = []

      // Process standard fields
      for (const fieldConfig of section.standardFields) {
        if (!fieldConfig.enabled) continue
        if (!isVisibleToCategory(fieldConfig.visibleToCategories, categoryId)) continue

        const standardDef = STANDARD_FIELDS[fieldConfig.fieldKey]
        if (!standardDef) continue

        // Check conditional visibility
        if (standardDef.conditionalOn && !isFieldVisible(standardDef.conditionalOn, formValues)) {
          continue
        }

        // Use label override if provided, otherwise use standard label
        const label = fieldConfig.labelOverride
          ? getLocalizedText(fieldConfig.labelOverride, locale)
          : getLocalizedText(standardDef.label, locale)

        const options = standardDef.options?.map((opt) => ({
          value: opt.value,
          label: getLocalizedText(opt.label, locale),
        }))

        fields.push({
          fieldKey: fieldConfig.fieldKey,
          type: standardDef.type as FieldType,
          label,
          description: standardDef.description
            ? getLocalizedText(standardDef.description, locale)
            : undefined,
          placeholder: standardDef.placeholder
            ? getLocalizedText(standardDef.placeholder, locale)
            : undefined,
          required: fieldConfig.required,
          options,
          disabled,
        })
      }

      // Process custom fields
      const sortedCustomFields = [...section.customFields].sort((a, b) => a.sortOrder - b.sortOrder)

      for (const customField of sortedCustomFields) {
        if (!isVisibleToCategory(customField.visibleToCategories, categoryId)) continue

        // Check conditional visibility
        if (customField.conditionalOn && !isFieldVisible(customField.conditionalOn, formValues)) {
          continue
        }

        const options = customField.options?.map((opt) => ({
          value: opt.value,
          label: getLocalizedText(opt.label, locale),
        }))

        fields.push({
          fieldKey: `custom_${customField.id}`,
          type: customField.type as FieldType,
          label: getLocalizedText(customField.label, locale),
          description: customField.description
            ? getLocalizedText(customField.description, locale)
            : undefined,
          placeholder: customField.placeholder
            ? getLocalizedText(customField.placeholder, locale)
            : undefined,
          required: customField.required,
          options,
          validation: customField.validation,
          disabled,
        })
      }

      return {
        id: section.id,
        title: getLocalizedText(section.title, locale),
        description: section.description
          ? getLocalizedText(section.description, locale)
          : undefined,
        enabled: section.enabled,
        fields,
      }
    })
  }, [config.sections, categoryId, locale, formValues, disabled])

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    setSubmitting(true)

    try {
      // Separate standard and custom responses
      const standardResponses: Record<string, unknown> = {}
      const customResponses: Record<string, unknown> = {}

      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith("custom_")) {
          // Remove "custom_" prefix for storage
          const customFieldId = key.replace("custom_", "")
          customResponses[customFieldId] = value
        } else if (isStandardField(key)) {
          standardResponses[key] = value
        }
      }

      await onSubmit({
        responseStatus: "confirmed", // This will be overridden by the parent
        standardResponses,
        customResponses,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const showProgress = config.settings.showProgressIndicator
  const submitText = config.settings.submitButtonText
    ? getLocalizedText(config.settings.submitButtonText, locale)
    : tCommon("submit")

  // Filter to only sections with fields
  const sectionsWithFields = renderedSections.filter((s) => s.fields.length > 0)

  // Expose form data getter and section info for embedded mode
  if (formRef) {
    formRef.current = {
      getFormData: () => {
        const data = methods.getValues()
        const standardResponses: Record<string, unknown> = {}
        const customResponses: Record<string, unknown> = {}

        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith("custom_")) {
            const customFieldId = key.replace("custom_", "")
            customResponses[customFieldId] = value
          } else if (isStandardField(key)) {
            standardResponses[key] = value
          }
        }

        return {
          responseStatus: "confirmed", // Will be set by parent
          standardResponses,
          customResponses,
        }
      },
      getSectionsWithFields: () => sectionsWithFields.map(s => ({
        id: s.id,
        fieldKeys: s.fields.map(f => f.fieldKey),
        requiredFieldKeys: s.fields.filter(f => f.required).map(f => f.fieldKey),
      })),
      triggerValidation: async (fieldKeys: string[]) => {
        if (fieldKeys.length === 0) return true
        return await methods.trigger(fieldKeys)
      },
    }
  }

  // If sectionIndex is provided, only render that specific section
  const sectionsToRender = sectionIndex !== undefined
    ? [sectionsWithFields[sectionIndex]].filter(Boolean)
    : sectionsWithFields

  // In embedded mode, render just the sections without form wrapper
  if (embedded) {
    return (
      <FormProvider {...methods}>
        <div className="space-y-4">
          {sectionsToRender.map((section, index) => {
            // Calculate actual index in the full list for proper numbering
            const actualIndex = sectionIndex !== undefined ? sectionIndex : index
            return (
              <FormSection
                key={section.id}
                {...section}
                locale={locale}
                showProgress={showProgress}
                sectionIndex={actualIndex}
                totalSections={sectionsWithFields.length}
                sectionHeaderStyle={sectionHeaderStyle}
              />
            )
          })}
        </div>
      </FormProvider>
    )
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleFormSubmit)} className="space-y-4">
        {sectionsToRender.map((section, index) => {
          const actualIndex = sectionIndex !== undefined ? sectionIndex : index
          return (
            <FormSection
              key={section.id}
              {...section}
              locale={locale}
              showProgress={showProgress}
              sectionIndex={actualIndex}
              totalSections={sectionsWithFields.length}
              sectionHeaderStyle={sectionHeaderStyle}
            />
          )
        })}

        <Button
          type="submit"
          className="w-full"
          disabled={submitting || disabled}
        >
          {submitting ? (
            <>
              <Loader2 className={cn("h-4 w-4 animate-spin", isRtl ? "ml-2" : "mr-2")} />
              {tCommon("loading")}
            </>
          ) : (
            submitText
          )}
        </Button>
      </form>
    </FormProvider>
  )
}
