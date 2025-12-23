"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Loader2, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { linkify } from "@/lib/linkify"
import { getBackgroundStyles, type BackgroundImageMode } from "@/components/branding/background-image-upload"
import { getAccentStyles } from "@/components/branding/card-accent-settings"
import { getLogoForDisplayMode, type ResolvedBranding } from "@/lib/branding/utils"

import { usePublicFormByToken, useSubmitFormResponseByToken } from "@/trpc/hooks/public-forms-hooks"
import type { FormConfig, FormFieldConfig, FormSectionConfig } from "@/server/db/schemas/event-form"
import type { BilingualText } from "@/server/db/schemas/event-form"
import type { EventBranding } from "@/server/db/schemas"

interface TokenFormPageProps {
  token: string
  locale: string
}

// Helper to get localized text
function getLocalizedText(text: BilingualText | undefined, locale: string): string {
  if (!text) return ""
  return (locale === "ar" ? text.ar : text.en) || text.en || ""
}

export function TokenFormPage({ token, locale }: TokenFormPageProps) {
  const t = useTranslations()

  // Language toggle state - separate from URL locale
  const [displayLocale, setDisplayLocale] = useState(locale)
  const isRtl = displayLocale === "ar"

  // System dark mode detection for "auto" logo display mode
  const [isSystemDark, setIsSystemDark] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    setIsSystemDark(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setIsSystemDark(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  // State
  const [step, setStep] = useState<"form" | "success">("form")
  const [error, setError] = useState<string | null>(null)

  // Fetch form and guest data via token
  const { data, isLoading, error: fetchError } = usePublicFormByToken(token)

  // Form submission mutation
  const { mutateAsync: submitResponse, isPending: submitting } = useSubmitFormResponseByToken({
    onSuccess: () => {
      setStep("success")
    },
    onError: (message) => {
      setError(message)
    },
  })

  // Language toggle handler
  const toggleLanguage = () => {
    setDisplayLocale(prev => prev === "en" ? "ar" : "en")
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p>{t("common.loading")}</p>
        </div>
      </div>
    )
  }

  // Error state
  if (fetchError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("publicForms.formNotFound")}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { form: formData, guest, event, hasSubmitted, canSubmit, canAmend, previousResponse } = data
  const config = formData.formConfig as FormConfig
  const resolvedBranding = event.resolvedBranding as ResolvedBranding | undefined
  const eventBranding = event.branding as EventBranding | undefined

  // Check if guest can proceed
  if (!canSubmit && !canAmend) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("publicForms.alreadySubmitted")}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Compute background styles
  const backgroundStyles = resolvedBranding?.backgroundImage
    ? {
        backgroundImage: `url(${resolvedBranding.backgroundImage})`,
        ...getBackgroundStyles((eventBranding?.backgroundImageMode as BackgroundImageMode) || "cover"),
      }
    : {}

  // Compute card accent styles
  const cardAccentStyles = getAccentStyles(eventBranding?.cardAccent)

  // Compute button styles
  const primaryButtonStyle = resolvedBranding?.primaryColor
    ? { backgroundColor: resolvedBranding.primaryColor }
    : {}

  // Get logo with display mode support
  const logoDisplayMode = eventBranding?.logoDisplayMode || "light"
  const logoUrl = getLogoForDisplayMode(
    { logo: resolvedBranding?.logo || eventBranding?.logo, logoDark: resolvedBranding?.logoDark || eventBranding?.logoDark },
    logoDisplayMode,
    isSystemDark
  )

  // Build guest data for form step
  const guestData = {
    guest: {
      id: guest.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      categoryId: guest.categoryId,
      categoryName: guest.categoryName,
    },
    hasSubmitted,
    canSubmit,
    canAmend,
    previousResponse: previousResponse
      ? {
          id: previousResponse.id,
          responses: previousResponse.responses as Record<string, unknown>,
          submittedAt: previousResponse.submittedAt,
        }
      : null,
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-2 sm:p-4 md:p-8"
      dir={isRtl ? "rtl" : "ltr"}
      style={backgroundStyles}
    >
      <Card
        className="w-full max-w-2xl rounded-lg sm:rounded-xl overflow-hidden"
        style={cardAccentStyles}
      >
        <CardHeader className="text-center relative">
          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className={cn(
              "absolute top-3 sm:top-4 min-h-[44px] px-3",
              isRtl ? "left-3 sm:left-4" : "right-3 sm:right-4"
            )}
          >
            {displayLocale === "en" ? "العربية" : "English"}
          </Button>

          {logoUrl && (
            <img
              src={logoUrl}
              alt={event.name}
              className="mx-auto mb-4 h-16 object-contain"
            />
          )}
          <CardTitle className="text-xl sm:text-2xl">{formData.name}</CardTitle>
          {formData.description && (
            <CardDescription>{formData.description}</CardDescription>
          )}
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-6">
          {/* Form Step */}
          {step === "form" && (
            <FormStep
              config={config}
              guestData={guestData}
              token={token}
              locale={displayLocale}
              resolvedBranding={resolvedBranding}
              onSubmit={async (responses) => {
                await submitResponse({
                  token,
                  responses,
                  isAmendment: guestData.canAmend && guestData.hasSubmitted,
                })
              }}
              submitting={submitting}
              error={error}
              primaryButtonStyle={primaryButtonStyle}
            />
          )}

          {/* Success Step */}
          {step === "success" && (
            <SuccessStep
              config={config}
              locale={displayLocale}
              isAmendment={guestData.canAmend && guestData.hasSubmitted}
            />
          )}

          {/* Contact/Support message */}
          {config.settings?.contactMessage && (
            <p className="text-center text-xs text-muted-foreground mt-6 pt-4 border-t">
              {linkify(getLocalizedText(config.settings.contactMessage, displayLocale))}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Type for guest data
type GuestData = {
  guest: {
    id: string
    firstName: string
    lastName: string | null
    email: string | null
    categoryId: string | null
    categoryName: string | null
  }
  hasSubmitted: boolean
  canSubmit: boolean
  canAmend: boolean
  previousResponse: {
    id: string
    responses: Record<string, unknown>
    submittedAt: Date
  } | null
}

// Form Step Component
interface FormStepProps {
  config: FormConfig
  guestData: GuestData
  token: string
  locale: string
  resolvedBranding?: ResolvedBranding
  onSubmit: (responses: Record<string, unknown>) => Promise<void>
  submitting: boolean
  error: string | null
  primaryButtonStyle: React.CSSProperties
}

function FormStep({
  config,
  guestData,
  locale,
  resolvedBranding,
  onSubmit,
  submitting,
  error,
  primaryButtonStyle,
}: FormStepProps) {
  const t = useTranslations()
  const isRtl = locale === "ar"

  // Build form values state
  const [formValues, setFormValues] = useState<Record<string, unknown>>(
    guestData.previousResponse?.responses || {}
  )

  // Multi-step navigation state
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }))
    // Clear validation errors when user makes changes
    setValidationErrors([])
  }

  // Filter sections based on guest category
  const visibleSections = config.sections
    .filter((section) => section.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    // Filter out sections with no visible fields for this guest
    .filter((section) => {
      const visibleFields = section.fields.filter((field) => {
        if (!field.visibleToCategories || field.visibleToCategories.length === 0) {
          return true
        }
        return guestData.guest.categoryId && field.visibleToCategories.includes(guestData.guest.categoryId)
      })
      return visibleFields.length > 0
    })

  const totalSections = visibleSections.length
  const currentSection = visibleSections[currentSectionIndex]
  const isFirstSection = currentSectionIndex === 0
  const isLastSection = currentSectionIndex === totalSections - 1
  const showProgressIndicator = config.settings?.showProgressIndicator && totalSections > 1

  // Get visible fields for current section
  const getVisibleFieldsForSection = (section: FormSectionConfig) => {
    return section.fields
      .filter((field) => {
        if (!field.visibleToCategories || field.visibleToCategories.length === 0) {
          return true
        }
        return guestData.guest.categoryId && field.visibleToCategories.includes(guestData.guest.categoryId)
      })
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  // Validate current section before advancing
  const validateCurrentSection = (): boolean => {
    if (!currentSection) return true

    const visibleFields = getVisibleFieldsForSection(currentSection)
    const errors: string[] = []

    for (const field of visibleFields) {
      if (field.required) {
        const value = formValues[field.id]
        if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
          const fieldLabel = getLocalizedText(field.label, locale)
          errors.push(fieldLabel)
        }
      }
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleNext = () => {
    if (validateCurrentSection()) {
      setCurrentSectionIndex(prev => prev + 1)
      setValidationErrors([])
    }
  }

  const handleBack = () => {
    if (!isFirstSection) {
      setCurrentSectionIndex(prev => prev - 1)
      setValidationErrors([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validateCurrentSection()) {
      await onSubmit(formValues)
    }
  }

  return (
    <div className="space-y-6">
      {/* Guest info */}
      <div className="rounded-lg bg-muted p-4">
        <p className="text-sm text-muted-foreground">
          {t("publicForms.submittingAs")}
        </p>
        <p className="font-medium">
          {guestData.guest.firstName} {guestData.guest.lastName}
        </p>
        <p className="text-sm text-muted-foreground">{guestData.guest.email}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {guestData.canAmend && guestData.hasSubmitted && (
        <Alert>
          <AlertDescription>
            {t("publicForms.amendingPrevious")}
          </AlertDescription>
        </Alert>
      )}

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t("publicForms.requiredFieldsMissing")}: {validationErrors.join(", ")}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Progress Indicator */}
        {showProgressIndicator && (
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
              style={{ backgroundColor: resolvedBranding?.primaryColor || "hsl(var(--primary))" }}
            >
              {currentSectionIndex + 1}
            </div>
            <span className="text-sm text-muted-foreground">
              {t("publicForms.stepOf", { current: currentSectionIndex + 1, total: totalSections })}
            </span>
          </div>
        )}

        {/* Current Section */}
        {currentSection && (
          <FormSectionRenderer
            section={currentSection}
            locale={locale}
            values={formValues}
            guestCategoryId={guestData.guest.categoryId}
            onChange={handleFieldChange}
          />
        )}

        {/* Navigation Actions */}
        <div className={cn(
          "flex gap-3 pt-4",
          isRtl ? "flex-row-reverse" : "flex-row"
        )}>
          {!isFirstSection && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="min-h-[44px] flex items-center gap-2"
            >
              {!isRtl && <ChevronLeft className="h-4 w-4" />}
              {t("publicForms.back")}
              {isRtl && <ChevronRight className="h-4 w-4" />}
            </Button>
          )}

          {isLastSection ? (
            <Button
              type="submit"
              className="flex-1 min-h-[44px]"
              disabled={submitting}
              style={primaryButtonStyle}
            >
              {submitting ? (
                <>
                  <Loader2 className={cn("h-4 w-4 animate-spin", isRtl ? "ml-2" : "mr-2")} />
                  {t("common.loading")}
                </>
              ) : (
                getLocalizedText(config.settings?.submitButtonText, locale) || t("common.submit")
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2"
              style={primaryButtonStyle}
            >
              {t("publicForms.next")}
              {!isRtl && <ChevronRight className="h-4 w-4" />}
              {isRtl && <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

// Form Section Renderer
interface FormSectionRendererProps {
  section: FormSectionConfig
  locale: string
  values: Record<string, unknown>
  guestCategoryId: string | null
  onChange: (fieldId: string, value: unknown) => void
}

function FormSectionRenderer({
  section,
  locale,
  values,
  guestCategoryId,
  onChange,
}: FormSectionRendererProps) {
  // Filter fields based on category visibility
  const visibleFields = section.fields
    .filter((field) => {
      if (!field.visibleToCategories || field.visibleToCategories.length === 0) {
        return true
      }
      return guestCategoryId && field.visibleToCategories.includes(guestCategoryId)
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)

  if (visibleFields.length === 0) return null

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-lg font-medium">
          {getLocalizedText(section.title, locale)}
        </h3>
        {section.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {getLocalizedText(section.description, locale)}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {visibleFields.map((field) => (
          <FormFieldRenderer
            key={field.id}
            field={field}
            locale={locale}
            value={values[field.id]}
            onChange={(value) => onChange(field.id, value)}
          />
        ))}
      </div>
    </div>
  )
}

// Form Field Renderer
interface FormFieldRendererProps {
  field: FormFieldConfig
  locale: string
  value: unknown
  onChange: (value: unknown) => void
}

function FormFieldRenderer({ field, locale, value, onChange }: FormFieldRendererProps) {
  const isRtl = locale === "ar"
  const label = getLocalizedText(field.label, locale)
  const description = getLocalizedText(field.description, locale)
  const placeholder = getLocalizedText(field.placeholder, locale)

  const renderField = () => {
    switch (field.type) {
      case "text":
      case "email":
      case "phone":
        return (
          <Input
            type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={field.required}
            dir={field.type === "email" || field.type === "phone" ? "ltr" : undefined}
            className="min-h-[44px]"
          />
        )

      case "number":
        return (
          <Input
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={placeholder}
            required={field.required}
            className="min-h-[44px]"
          />
        )

      case "textarea":
        return (
          <Textarea
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={field.required}
            rows={4}
          />
        )

      case "date":
        return (
          <Input
            type="date"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className="min-h-[44px]"
          />
        )

      case "select":
        return (
          <Select
            value={(value as string) || ""}
            onValueChange={onChange}
            required={field.required}
          >
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder={placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {getLocalizedText(option.label, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case "radio":
        return (
          <RadioGroup
            value={(value as string) || ""}
            onValueChange={onChange}
            required={field.required}
          >
            {field.options?.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "flex items-center space-y-0 min-h-[44px]",
                  isRtl ? "space-x-reverse space-x-2" : "space-x-2"
                )}
              >
                <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                <label
                  htmlFor={`${field.id}-${option.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {getLocalizedText(option.label, locale)}
                </label>
              </div>
            ))}
          </RadioGroup>
        )

      case "checkbox":
        // For checkbox, handle both single and multiple selection
        if (field.options && field.options.length > 0) {
          // Multiple checkboxes
          const selectedValues = Array.isArray(value) ? value : []
          return (
            <div className="space-y-2">
              {field.options.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center space-y-0 min-h-[44px]",
                    isRtl ? "space-x-reverse space-x-2" : "space-x-2"
                  )}
                >
                  <Checkbox
                    id={`${field.id}-${option.value}`}
                    checked={selectedValues.includes(option.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onChange([...selectedValues, option.value])
                      } else {
                        onChange(selectedValues.filter((v: string) => v !== option.value))
                      }
                    }}
                  />
                  <label
                    htmlFor={`${field.id}-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {getLocalizedText(option.label, locale)}
                  </label>
                </div>
              ))}
            </div>
          )
        } else {
          // Single checkbox (boolean)
          return (
            <div className={cn(
              "flex items-center space-y-0 min-h-[44px]",
              isRtl ? "space-x-reverse space-x-2" : "space-x-2"
            )}>
              <Checkbox
                id={field.id}
                checked={!!value}
                onCheckedChange={(checked) => onChange(checked)}
              />
              <label htmlFor={field.id} className="text-sm font-normal cursor-pointer">
                {label}
              </label>
            </div>
          )
        }

      default:
        return null
    }
  }

  // For single checkbox, label is already shown next to it
  const showLabel = field.type !== "checkbox" || (field.options && field.options.length > 0)

  return (
    <div className="space-y-2">
      {showLabel && (
        <div>
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}
      {renderField()}
    </div>
  )
}

// Success Step Component
interface SuccessStepProps {
  config: FormConfig
  locale: string
  isAmendment?: boolean
}

function SuccessStep({ config, locale, isAmendment }: SuccessStepProps) {
  const t = useTranslations()

  const confirmationMessage =
    getLocalizedText(config.settings?.confirmationMessage, locale) ||
    t("publicForms.defaultConfirmation")

  return (
    <div className="text-center space-y-4 py-8">
      <div className="flex justify-center">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
      </div>
      <h3 className="text-xl font-semibold">
        {isAmendment
          ? t("publicForms.amendmentSuccess")
          : t("publicForms.submissionSuccess")}
      </h3>
      <p className="text-muted-foreground">{confirmationMessage}</p>
    </div>
  )
}
