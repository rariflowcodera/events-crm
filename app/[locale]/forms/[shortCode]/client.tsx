"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
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

import { usePublicForm, useLookupGuest, useSubmitFormResponse } from "@/trpc/hooks/public-forms-hooks"
import type { FormConfig, FormFieldConfig, FormSectionConfig } from "@/server/db/schemas/event-form"
import type { BilingualText } from "@/server/db/schemas/event-form"

// Email lookup schema
const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

type EmailFormData = z.infer<typeof emailSchema>

interface PublicFormPageProps {
  shortCode: string
  locale: string
}

// Helper to get localized text
function getLocalizedText(text: BilingualText | undefined, locale: string): string {
  if (!text) return ""
  return (locale === "ar" ? text.ar : text.en) || text.en || ""
}

// Type for guest lookup response
type GuestLookupResponse = {
  guest: {
    id: string
    firstName: string
    lastName: string
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

export function PublicFormPage({ shortCode, locale }: PublicFormPageProps) {
  const t = useTranslations()
  const isRtl = locale === "ar"

  // State
  const [step, setStep] = useState<"email" | "form" | "success">("email")
  const [guestData, setGuestData] = useState<GuestLookupResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch form data
  const { data: formData, isLoading: formLoading, error: formError } = usePublicForm(shortCode)

  // Guest lookup mutation
  const { mutateAsync: lookupGuest, isPending: lookingUp } = useLookupGuest()

  // Form submission mutation
  const { mutateAsync: submitResponse, isPending: submitting } = useSubmitFormResponse({
    onSuccess: () => {
      setStep("success")
    },
    onError: (message) => {
      setError(message)
    },
  })

  // Email form
  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  })

  // Handle email lookup
  const handleEmailLookup = async (data: EmailFormData) => {
    setError(null)
    try {
      const result = await lookupGuest({
        shortCode,
        email: data.email,
      })
      setGuestData(result)

      if (!result.canSubmit && !result.canAmend) {
        setError(t("publicForms.alreadySubmitted"))
        return
      }

      setStep("form")
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t("publicForms.guestNotFound")
      setError(errorMessage)
    }
  }

  // Loading state
  if (formLoading) {
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
  if (formError || !formData) {
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

  const { event, formConfig } = formData
  const config = formConfig as FormConfig

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          {event.branding?.logo && (
            <img
              src={event.branding.logo}
              alt={event.name}
              className="mx-auto mb-4 h-16 object-contain"
            />
          )}
          <CardTitle className="text-xl sm:text-2xl">{formData.name}</CardTitle>
          {formData.description && (
            <CardDescription>{formData.description}</CardDescription>
          )}
        </CardHeader>

        <CardContent>
          {/* Email Step */}
          {step === "email" && (
            <EmailStep
              form={emailForm}
              onSubmit={handleEmailLookup}
              loading={lookingUp}
              error={error}
              locale={locale}
            />
          )}

          {/* Form Step */}
          {step === "form" && guestData && (
            <FormStep
              config={config}
              guestData={guestData}
              shortCode={shortCode}
              locale={locale}
              onSubmit={async (responses) => {
                await submitResponse({
                  shortCode,
                  guestId: guestData.guest.id,
                  responses,
                  isAmendment: guestData.canAmend && guestData.hasSubmitted,
                })
              }}
              onBack={() => setStep("email")}
              submitting={submitting}
              error={error}
            />
          )}

          {/* Success Step */}
          {step === "success" && (
            <SuccessStep
              config={config}
              locale={locale}
              isAmendment={guestData?.canAmend && guestData?.hasSubmitted}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Email Step Component
interface EmailStepProps {
  form: ReturnType<typeof useForm<EmailFormData>>
  onSubmit: (data: EmailFormData) => Promise<void>
  loading: boolean
  error: string | null
  locale: string
}

function EmailStep({ form, onSubmit, loading, error, locale }: EmailStepProps) {
  const t = useTranslations()
  const isRtl = locale === "ar"

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-muted-foreground">
          {t("publicForms.enterEmailToStart")}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("publicForms.emailLabel")}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={t("publicForms.emailPlaceholder")}
                    {...field}
                    dir="ltr"
                  />
                </FormControl>
                <FormDescription>
                  {t("publicForms.emailDescription")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className={cn("h-4 w-4 animate-spin", isRtl ? "ml-2" : "mr-2")} />
                {t("common.loading")}
              </>
            ) : (
              t("publicForms.continue")
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}

// Form Step Component
interface FormStepProps {
  config: FormConfig
  guestData: GuestLookupResponse
  shortCode: string
  locale: string
  onSubmit: (responses: Record<string, unknown>) => Promise<void>
  onBack: () => void
  submitting: boolean
  error: string | null
}

function FormStep({
  config,
  guestData,
  locale,
  onSubmit,
  onBack,
  submitting,
  error,
}: FormStepProps) {
  const t = useTranslations()
  const isRtl = locale === "ar"

  // Build form schema from config
  const [formValues, setFormValues] = useState<Record<string, unknown>>(
    guestData.previousResponse?.responses || {}
  )

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formValues)
  }

  // Filter sections based on guest category
  const visibleSections = config.sections
    .filter((section) => section.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)

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

      <form onSubmit={handleSubmit} className="space-y-8">
        {visibleSections.map((section) => (
          <FormSectionRenderer
            key={section.id}
            section={section}
            locale={locale}
            values={formValues}
            guestCategoryId={guestData.guest.categoryId}
            onChange={handleFieldChange}
          />
        ))}

        {/* Actions */}
        <div className={cn("flex gap-2", isRtl ? "flex-row-reverse" : "flex-row")}>
          <Button type="button" variant="outline" onClick={onBack}>
            {t("publicForms.back")}
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className={cn("h-4 w-4 animate-spin", isRtl ? "ml-2" : "mr-2")} />
                {t("common.loading")}
              </>
            ) : (
              getLocalizedText(config.settings.submitButtonText, locale) || t("common.submit")
            )}
          </Button>
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
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">
          {getLocalizedText(section.title, locale)}
        </h3>
        {section.description && (
          <p className="text-sm text-muted-foreground">
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
          />
        )

      case "select":
        return (
          <Select
            value={(value as string) || ""}
            onValueChange={onChange}
            required={field.required}
          >
            <SelectTrigger>
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
                  "flex items-center space-y-0",
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
                    "flex items-center space-y-0",
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
              "flex items-center space-y-0",
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
    getLocalizedText(config.settings.confirmationMessage, locale) ||
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
