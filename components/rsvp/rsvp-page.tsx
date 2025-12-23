"use client"

import { useEffect, useLayoutEffect, useState, useRef, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { formatEventDateTime } from "@/lib/date-utils"
import { linkify } from "@/lib/linkify"
import { getBackgroundStyles, type BackgroundImageMode } from "@/components/branding/background-image-upload"
import { getAccentStyles } from "@/components/branding/card-accent-settings"
import { getLogoForDisplayMode } from "@/lib/branding/utils"

import { DynamicFormRenderer } from "./dynamic-form-renderer"
import { VisualResponseSelector } from "./visual-response-selector"
import type { RsvpFormConfig, BilingualText } from "@/lib/rsvp/types"
import { replaceWelcomeMessageVariables, getDefaultWelcomeMessage } from "@/lib/rsvp/variable-utils"

// Schema for the main form (response status + legacy fallback fields)
const rsvpFormSchema = z.object({
  responseStatus: z.enum(["confirmed", "declined", "maybe"]),
  dietaryRequirements: z.string().optional(),
  accessibilityNeeds: z.string().optional(),
  companionInfo: z
    .object({
      bringing: z.boolean(),
      count: z.number().optional(),
      details: z
        .array(
          z.object({
            name: z.string().optional(),
            dietary: z.string().optional(),
          })
        )
        .optional(),
    })
    .optional(),
})

type RsvpFormData = z.infer<typeof rsvpFormSchema>

// Type for dynamic form ref
interface DynamicFormRef {
  getFormData: () => {
    responseStatus: "confirmed" | "declined" | "maybe"
    standardResponses: Record<string, unknown>
    customResponses: Record<string, unknown>
  }
  getSectionsWithFields: () => Array<{
    id: string
    fieldKeys: string[]
    requiredFieldKeys: string[]
  }>
  triggerValidation: (fieldKeys: string[]) => Promise<boolean>
}

interface GuestData {
  guest: {
    id: string
    firstName: string
    lastName: string
    preferredName?: string
    displayNameAr?: string
    title?: string
    salutation?: string
    email?: string
    status: string
    hasCompanion?: boolean
    companionDetails?: {
      name?: string
      email?: string
      phone?: string
      dietaryRequirements?: string
    }
    dietaryRequirements?: string
    accessibilityNeeds?: string
    rsvpRespondedAt?: string
  }
  event: {
    id: string
    name: string
    description?: string
    venue?: string
    venueAddress?: string
    startDate?: string
    endDate?: string
    startTime?: string
    endTime?: string
    isSingleDay?: boolean
    timezone?: string
    rsvpDeadline?: string
    rsvpFormConfig?: RsvpFormConfig
    branding?: {
      logo?: string
      logoDark?: string
      logoDisplayMode?: "light" | "dark" | "auto"
      primaryColor?: string
      secondaryColor?: string
      backgroundImage?: string
      backgroundImageMode?: BackgroundImageMode
      cardAccent?: {
        enabled: boolean
        color: string
        position: "top" | "bottom" | "left" | "right"
        thickness: "thin" | "medium" | "thick"
      }
      sectionHeader?: {
        backgroundColor: string
        textColor: string
      }
    }
    resolvedBranding?: {
      logo?: string
      logoDark?: string
      primaryColor?: string
      accentColor?: string
      primaryColorDark?: string
      accentColorDark?: string
    }
    settings?: {
      allowPlusOne?: boolean
      maxPlusOnes?: number
    }
    organization?: {
      name: string
      logo?: string
    }
  }
  category: {
    id: string
    name: string
    code: string
    color?: string
    rsvpPageConfig?: {
      headline?: BilingualText
      welcomeMessage?: BilingualText
      backgroundImage?: string
      showServiceDetails?: boolean
    }
    serviceAllocations?: Record<string, unknown>
  }
}

interface RsvpPageProps {
  token: string
  locale: string
  customDomain?: string // If set, this page is accessed via a custom domain
}

function getLocalizedText(text: BilingualText | undefined, locale: string): string {
  if (!text) return ""
  return (locale === "ar" ? text.ar : text.en) || text.en || ""
}

export function RsvpPage({ token, locale, customDomain }: RsvpPageProps) {
  const t = useTranslations("rsvp")
  const tCommon = useTranslations("common")
  const [guestData, setGuestData] = useState<GuestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reference to get dynamic form data
  const dynamicFormRef = useRef<DynamicFormRef | null>(null)

  // Language toggle - allows switching between EN/AR without URL change
  const [displayLocale, setDisplayLocale] = useState<"en" | "ar">(locale as "en" | "ar")
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

  // Handle language toggle - uses query param for custom domains, state for main app
  const handleLanguageToggle = () => {
    const newLocale = displayLocale === "en" ? "ar" : "en"
    if (customDomain) {
      // Custom domain: use query param for language
      window.location.href = `?lang=${newLocale}`
    } else {
      // Main app: just toggle the state (no page reload)
      setDisplayLocale(newLocale)
    }
  }

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(0)
  const [actualSectionCount, setActualSectionCount] = useState<number | null>(null)
  const [transitioningStep, setTransitioningStep] = useState(false)

  // Form for response status and legacy fallback fields
  const form = useForm<RsvpFormData>({
    resolver: zodResolver(rsvpFormSchema),
    defaultValues: {
      responseStatus: "confirmed",
      companionInfo: {
        bringing: false,
      },
    },
  })

  const watchResponseStatus = form.watch("responseStatus")
  const watchBringingCompanion = form.watch("companionInfo.bringing")

  // Calculate enabled sections for multi-step form (must be before any conditional returns)
  const enabledSections = useMemo(() => {
    if (!guestData?.event?.rsvpFormConfig?.sections) return []
    return guestData.event.rsvpFormConfig.sections
      .filter(s => s.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [guestData?.event?.rsvpFormConfig?.sections])

  // Update actualSectionCount when DynamicFormRenderer populates the ref
  // Use useLayoutEffect for synchronous update before paint
  // Must be before any conditional returns to satisfy Rules of Hooks
  useLayoutEffect(() => {
    if (dynamicFormRef.current) {
      const sections = dynamicFormRef.current.getSectionsWithFields()
      if (sections.length !== actualSectionCount) {
        setActualSectionCount(sections.length)
      }
    }
  }, [guestData, displayLocale, actualSectionCount])

  useEffect(() => {
    async function fetchGuest() {
      try {
        const res = await fetch(`/api/rsvp/${token}`)
        if (!res.ok) {
          const data = await res.json()
          if (data.code === "EXPIRED") {
            setError(t("expired"))
          } else {
            setError(data.error || "Invalid RSVP link")
          }
          return
        }
        const data = await res.json()
        setGuestData(data)

        // Pre-fill form with existing data
        if (data.guest.dietaryRequirements) {
          form.setValue("dietaryRequirements", data.guest.dietaryRequirements)
        }
        if (data.guest.accessibilityNeeds) {
          form.setValue("accessibilityNeeds", data.guest.accessibilityNeeds)
        }
        if (data.guest.hasCompanion && data.guest.companionDetails) {
          form.setValue("companionInfo", {
            bringing: true,
            details: [
              {
                name: data.guest.companionDetails.name,
                dietary: data.guest.companionDetails.dietaryRequirements,
              },
            ],
          })
        }
      } catch {
        setError("Failed to load RSVP page")
      } finally {
        setLoading(false)
      }
    }
    fetchGuest()
  }, [token, form, t])

  async function onSubmit(data: RsvpFormData) {
    // Prevent submission during step transitions (fixes auto-submit bug)
    if (transitioningStep) return

    setSubmitting(true)
    setError(null)

    try {
      const hasFormConfig = !!guestData?.event.rsvpFormConfig?.sections?.length

      // Build submission payload
      const payload: Record<string, unknown> = {
        responseStatus: data.responseStatus,
      }

      if (hasFormConfig && dynamicFormRef.current && data.responseStatus !== "declined") {
        // Use data from dynamic form renderer
        const dynamicData = dynamicFormRef.current.getFormData()
        payload.standardResponses = dynamicData.standardResponses
        payload.customResponses = dynamicData.customResponses
      } else {
        // Legacy fallback - use form data directly
        payload.dietaryRequirements = data.dietaryRequirements
        payload.accessibilityNeeds = data.accessibilityNeeds
        payload.companionInfo = data.companionInfo
      }

      const res = await fetch(`/api/rsvp/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to submit RSVP")
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit RSVP")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-2 sm:p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p>{tCommon("loading")}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-2 sm:p-4">
        <Card className="w-full max-w-md rounded-lg sm:rounded-xl">
          <CardContent className="pt-6 p-4 sm:p-6 sm:pt-6">
            <p className="text-center text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!guestData) {
    return null
  }

  // Check if guest has already responded - block resubmission if amendments not allowed
  const allowAmendments = guestData.event.rsvpFormConfig?.settings?.allowAmendments ?? false

  if (guestData.guest.rsvpRespondedAt && !allowAmendments) {
    const { guest, event, category } = guestData
    const previousStatus = guest.status as "confirmed" | "declined" | "maybe"

    // Use resolved branding with fallbacks, respecting logo display mode
    const logoDisplayMode = event.branding?.logoDisplayMode || "light"
    const brandLogo = getLogoForDisplayMode(
      { logo: event.resolvedBranding?.logo || event.branding?.logo || event.organization?.logo, logoDark: event.resolvedBranding?.logoDark || event.branding?.logoDark },
      logoDisplayMode,
      isSystemDark
    )
    const brandAccent = event.resolvedBranding?.accentColor || event.branding?.secondaryColor

    // Get custom labels from config or use defaults
    const formConfig = event.rsvpFormConfig
    const confirmedLabel = formConfig?.settings?.confirmOptionLabel
      ? getLocalizedText(formConfig.settings.confirmOptionLabel, displayLocale)
      : (displayLocale === "ar" ? "تأكيد الحضور" : "Confirmed")
    const declinedLabel = formConfig?.settings?.declineOptionLabel
      ? getLocalizedText(formConfig.settings.declineOptionLabel, displayLocale)
      : (displayLocale === "ar" ? "اعتذار" : "Declined")
    const maybeLabel = formConfig?.settings?.maybeOptionLabel
      ? getLocalizedText(formConfig.settings.maybeOptionLabel, displayLocale)
      : (displayLocale === "ar" ? "ربما" : "Maybe")

    // Inline translations for displayLocale (since t() uses URL locale, not toggled locale)
    const alreadyRespondedText = {
      title: displayLocale === "ar" ? "تم إرسال الرد مسبقاً" : "Response Already Submitted",
      message: displayLocale === "ar"
        ? "لقد قمت بإرسال ردك على هذه الفعالية."
        : "You have already submitted your RSVP for this event.",
      yourResponse: displayLocale === "ar" ? "ردك" : "Your response",
      contactToChange: displayLocale === "ar"
        ? "إذا كنت ترغب في تغيير ردك، يرجى التواصل مع منظم الفعالية."
        : "If you need to change your response, please contact the event organizer.",
      confirmed: confirmedLabel,
      declined: declinedLabel,
      maybe: maybeLabel,
    }

    const bgUrl = category.rsvpPageConfig?.backgroundImage || event.branding?.backgroundImage
    const bgMode = event.branding?.backgroundImageMode || "cover"

    return (
      <div
        className="flex min-h-screen items-center justify-center p-2 sm:p-4"
        dir={isRtl ? "rtl" : "ltr"}
        style={{
          backgroundColor: brandAccent || undefined,
          backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
          ...getBackgroundStyles(bgMode),
        }}
      >
        <Card
          className="w-full max-w-md relative rounded-lg sm:rounded-xl overflow-hidden"
          style={getAccentStyles(event.branding?.cardAccent)}
        >
          {/* Language toggle */}
          <button
            type="button"
            onClick={handleLanguageToggle}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors z-10 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {displayLocale === "en" ? "العربية" : "English"}
          </button>

          <CardContent className="pt-6 text-center p-4 sm:p-6 sm:pt-6">
            {brandLogo && (
              <img
                src={brandLogo}
                alt={event.organization?.name || event.name}
                className="mx-auto mb-4 h-40 object-contain"
              />
            )}
            <h2 className="text-xl sm:text-2xl font-bold">
              {alreadyRespondedText.title}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {alreadyRespondedText.message}
            </p>

            {/* Show their previous response */}
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                {alreadyRespondedText.yourResponse}:
              </p>
              <p className="font-semibold text-lg">
                {alreadyRespondedText[previousStatus] || previousStatus}
              </p>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              {alreadyRespondedText.contactToChange}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    const status = form.getValues("responseStatus")
    const config = guestData.event.rsvpFormConfig

    // Get confirmation message from config or use default
    let confirmationMessage: string
    if (status === "confirmed") {
      confirmationMessage = config?.settings?.confirmationMessage
        ? getLocalizedText(config.settings.confirmationMessage, displayLocale)
        : t("confirmation.confirmed")
    } else if (status === "declined") {
      confirmationMessage = config?.settings?.declineMessage
        ? getLocalizedText(config.settings.declineMessage, displayLocale)
        : t("confirmation.declined")
    } else {
      confirmationMessage = t("confirmation.maybe")
    }

    // Use resolved branding with fallbacks, respecting logo display mode
    const logoDisplayMode = guestData.event.branding?.logoDisplayMode || "light"
    const brandLogo = getLogoForDisplayMode(
      { logo: guestData.event.resolvedBranding?.logo || guestData.event.branding?.logo || guestData.event.organization?.logo, logoDark: guestData.event.resolvedBranding?.logoDark || guestData.event.branding?.logoDark },
      logoDisplayMode,
      isSystemDark
    )
    const brandAccent = guestData.event.resolvedBranding?.accentColor || guestData.event.branding?.secondaryColor
    const bgUrl = guestData.category.rsvpPageConfig?.backgroundImage || guestData.event.branding?.backgroundImage
    const bgMode = guestData.event.branding?.backgroundImageMode || "cover"

    return (
      <div
        className="flex min-h-screen items-center justify-center p-2 sm:p-4"
        dir={isRtl ? "rtl" : "ltr"}
        style={{
          backgroundColor: brandAccent || undefined,
          backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
          ...getBackgroundStyles(bgMode),
        }}
      >
        <Card
          className="w-full max-w-md relative rounded-lg sm:rounded-xl overflow-hidden"
          style={getAccentStyles(guestData.event.branding?.cardAccent)}
        >
          <CardContent className="pt-6 text-center p-4 sm:p-6 sm:pt-6">
            {brandLogo && (
              <img
                src={brandLogo}
                alt={guestData.event.organization?.name || guestData.event.name}
                className="mx-auto mb-4 h-40 object-contain"
              />
            )}
            <h2 className="text-xl sm:text-2xl font-bold">{t("submitted")}</h2>
            <p className="mt-2 text-muted-foreground">{confirmationMessage}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { guest, event, category } = guestData
  const guestFullName = `${guest.title ? guest.title + " " : ""}${guest.firstName} ${guest.lastName}`

  // Welcome message display mode: "locale" (default) or "stacked" (show both EN and AR)
  const welcomeMessageDisplayMode = event.rsvpFormConfig?.settings?.welcomeMessageDisplayMode || "locale"

  // Variable replacement data (shared for both languages)
  const variableData = {
    guest: {
      firstName: guest.firstName,
      lastName: guest.lastName,
      preferredName: guest.preferredName,
      displayNameAr: guest.displayNameAr,
      title: guest.title,
      email: guest.email,
    },
    event: {
      name: event.name,
      venue: event.venue,
      venueAddress: event.venueAddress,
      startDate: event.startDate,
      endDate: event.endDate,
      startTime: event.startTime,
      endTime: event.endTime,
      isSingleDay: event.isSingleDay,
      rsvpDeadline: event.rsvpDeadline,
    },
  }

  // Get welcome messages based on display mode
  const getWelcomeMessageForLocale = (locale: "en" | "ar") => {
    const raw =
      event.rsvpFormConfig?.settings?.welcomeMessage?.[locale] ||
      event.rsvpFormConfig?.settings?.welcomeMessage?.en ||
      category.rsvpPageConfig?.welcomeMessage?.[locale] ||
      category.rsvpPageConfig?.welcomeMessage?.en ||
      getDefaultWelcomeMessage(locale)
    return replaceWelcomeMessageVariables(raw, { ...variableData, locale })
  }

  // For single locale mode, use the display locale; for stacked, prepare both
  const welcomeMessage = getWelcomeMessageForLocale(displayLocale)
  const welcomeMessageEn = welcomeMessageDisplayMode === "stacked" ? getWelcomeMessageForLocale("en") : null
  const welcomeMessageAr = welcomeMessageDisplayMode === "stacked" ? getWelcomeMessageForLocale("ar") : null

  const headline =
    category.rsvpPageConfig?.headline?.[displayLocale] ||
    category.rsvpPageConfig?.headline?.en

  const allowPlusOne = event.settings?.allowPlusOne ?? false
  const hasFormConfig = !!event.rsvpFormConfig?.sections?.length

  // Multi-step form logic (enabledSections calculated earlier to satisfy Rules of Hooks)
  // Use actualSectionCount (from DynamicFormRenderer) if available, otherwise fall back to enabledSections.length
  const sectionCount = actualSectionCount ?? enabledSections.length
  const isMultiStep = hasFormConfig && sectionCount > 0
  const totalSteps = isMultiStep ? 1 + sectionCount : 1
  const isLastStep = currentStep === totalSteps - 1
  const showSubmitButton = watchResponseStatus === "declined" || isLastStep || !isMultiStep
  const useVisualStyle = event.rsvpFormConfig?.settings?.useVisualResponseStyle ?? false

  // Get submit button text from config or use default
  const submitButtonText = event.rsvpFormConfig?.settings?.submitButtonText
    ? getLocalizedText(event.rsvpFormConfig.settings.submitButtonText, displayLocale)
    : tCommon("submit")

  // Handler for Next button - validates current step before advancing
  const handleNextClick = async () => {
    setTransitioningStep(true)

    if (currentStep === 0) {
      // Step 0: RSVP question - just advance (responseStatus has a default)
      setCurrentStep(s => s + 1)
      requestAnimationFrame(() => setTransitioningStep(false))
      return
    }

    // Section steps: validate required fields using DynamicFormRenderer's form
    const sections = dynamicFormRef.current?.getSectionsWithFields() || []
    const currentSection = sections[currentStep - 1]

    if (currentSection?.requiredFieldKeys?.length > 0) {
      // Use triggerValidation from DynamicFormRenderer (which owns the form with these fields)
      const isValid = await dynamicFormRef.current?.triggerValidation(currentSection.requiredFieldKeys)
      if (isValid) {
        setCurrentStep(s => s + 1)
      }
    } else {
      // No required fields in this section, just advance
      setCurrentStep(s => s + 1)
    }

    requestAnimationFrame(() => setTransitioningStep(false))
  }

  // Use resolved branding with fallbacks, respecting logo display mode
  const logoDisplayMode = event.branding?.logoDisplayMode || "light"
  const brandLogo = getLogoForDisplayMode(
    { logo: event.resolvedBranding?.logo || event.branding?.logo || event.organization?.logo, logoDark: event.resolvedBranding?.logoDark || event.branding?.logoDark },
    logoDisplayMode,
    isSystemDark
  )
  const brandPrimary = event.resolvedBranding?.primaryColor || event.branding?.primaryColor
  const brandAccent = event.resolvedBranding?.accentColor || event.branding?.secondaryColor
  const bgUrl = category.rsvpPageConfig?.backgroundImage || event.branding?.backgroundImage
  const bgMode = event.branding?.backgroundImageMode || "cover"

  return (
    <div
      className="flex min-h-screen items-center justify-center p-2 sm:p-4"
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        backgroundColor: brandAccent || "#f5f5f5",
        backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
        ...getBackgroundStyles(bgMode),
      }}
    >
      <Card
        className="w-full max-w-2xl relative rounded-lg sm:rounded-xl overflow-hidden"
        style={getAccentStyles(event.branding?.cardAccent)}
      >
        {/* Language toggle */}
        <button
          type="button"
          onClick={handleLanguageToggle}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors z-10 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {displayLocale === "en" ? "العربية" : "English"}
        </button>

        <CardHeader className="text-center px-5 py-4 sm:p-6">
          {brandLogo && (
            <img
              src={brandLogo}
              alt={event.organization?.name || event.name}
              className="mx-auto mb-4 h-40 object-contain"
            />
          )}
          <CardTitle className="text-xl sm:text-2xl">{headline || event.name}</CardTitle>

          {/* Welcome message with HTML support and variable replacement */}
          {welcomeMessageDisplayMode === "stacked" && welcomeMessageEn && welcomeMessageAr ? (
            // Stacked mode: Show both EN and AR messages
            <div className="mt-3 sm:mt-4 space-y-4">
              {/* English message */}
              <div
                className="text-sm text-muted-foreground space-y-1.5 [&_p]:my-1 [&_strong]:font-semibold"
                dir="ltr"
                dangerouslySetInnerHTML={{ __html: welcomeMessageEn }}
              />
              {/* Arabic message */}
              <div
                className="text-sm text-muted-foreground space-y-1.5 [&_p]:my-1 [&_strong]:font-semibold"
                dir="rtl"
                dangerouslySetInnerHTML={{ __html: welcomeMessageAr }}
              />
            </div>
          ) : (
            // Single locale mode: Show message in user's selected language
            <div
              className="mt-3 sm:mt-4 text-sm text-muted-foreground space-y-1.5 [&_p]:my-1 [&_strong]:font-semibold"
              dir={isRtl ? "rtl" : "ltr"}
              dangerouslySetInnerHTML={{ __html: welcomeMessage }}
            />
          )}
        </CardHeader>

        <CardContent className="min-h-[250px] sm:min-h-[300px] flex flex-col px-5 pb-4 pt-0 sm:p-6 sm:pt-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col">
              {/* Form content */}
              <div className="space-y-4 sm:space-y-6 flex-1">
              {/* Step 0: RSVP Question */}
              {currentStep === 0 && (
                <FormField
                  control={form.control}
                  name="responseStatus"
                  render={({ field }) => {
                    const formConfig = event.rsvpFormConfig
                    const questionLabel = formConfig?.settings?.rsvpQuestionLabel
                      ? getLocalizedText(formConfig.settings.rsvpQuestionLabel, displayLocale)
                      : t("title")
                    const confirmLabel = formConfig?.settings?.confirmOptionLabel
                      ? getLocalizedText(formConfig.settings.confirmOptionLabel, displayLocale)
                      : t("confirm")
                    const declineLabel = formConfig?.settings?.declineOptionLabel
                      ? getLocalizedText(formConfig.settings.declineOptionLabel, displayLocale)
                      : t("decline")
                    const maybeLabel = formConfig?.settings?.maybeOptionLabel
                      ? getLocalizedText(formConfig.settings.maybeOptionLabel, displayLocale)
                      : t("maybe")
                    const showMaybeOption = formConfig?.settings?.showMaybeOption ?? true
                    const useVisualStyle = formConfig?.settings?.useVisualResponseStyle ?? false

                    // Handler for visual selection with auto-advance
                    const handleVisualSelection = (value: string) => {
                      field.onChange(value)
                      // Auto-advance: if multi-step and not declined, go to next step
                      if (isMultiStep && value !== "declined") {
                        setCurrentStep(1)
                      }
                    }

                    return (
                      <FormItem>
                        <FormLabel>{questionLabel}</FormLabel>
                        <FormControl>
                          {useVisualStyle ? (
                            <VisualResponseSelector
                              value={field.value}
                              onChange={handleVisualSelection}
                              confirmLabel={confirmLabel}
                              declineLabel={declineLabel}
                              maybeLabel={maybeLabel}
                              showMaybeOption={showMaybeOption}
                              isRtl={isRtl}
                            />
                          ) : (
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-2"
                            >
                              <FormItem className={cn("flex items-center space-y-0", isRtl ? "space-x-reverse space-x-3" : "space-x-3")}>
                                <FormControl>
                                  <RadioGroupItem value="confirmed" />
                                </FormControl>
                                <FormLabel className="font-normal">{confirmLabel}</FormLabel>
                              </FormItem>
                              <FormItem className={cn("flex items-center space-y-0", isRtl ? "space-x-reverse space-x-3" : "space-x-3")}>
                                <FormControl>
                                  <RadioGroupItem value="declined" />
                                </FormControl>
                                <FormLabel className="font-normal">{declineLabel}</FormLabel>
                              </FormItem>
                              {showMaybeOption && (
                                <FormItem className={cn("flex items-center space-y-0", isRtl ? "space-x-reverse space-x-3" : "space-x-3")}>
                                  <FormControl>
                                    <RadioGroupItem value="maybe" />
                                  </FormControl>
                                  <FormLabel className="font-normal">{maybeLabel}</FormLabel>
                                </FormItem>
                              )}
                            </RadioGroup>
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
              )}

              {/* Section pages (multi-step mode) - always render to populate formRef, hide on step 0 */}
              {isMultiStep && watchResponseStatus !== "declined" && (
                <div className={currentStep === 0 ? "hidden" : ""}>
                  <DynamicFormRenderer
                    config={event.rsvpFormConfig!}
                    categoryId={category.id}
                    locale={displayLocale}
                    onSubmit={async () => {}}
                    disabled={submitting}
                    embedded
                    formRef={dynamicFormRef}
                    sectionIndex={Math.max(0, currentStep - 1)}
                    sectionHeaderStyle={event.branding?.sectionHeader}
                  />
                </div>
              )}

              </div>

              {/* Navigation buttons - hide on step 0 when visual style is enabled (selection drives navigation) */}
              {!(currentStep === 0 && useVisualStyle && !showSubmitButton) && (
              <div className={cn("flex gap-2 mt-auto pt-4 pb-6 sm:pt-6 sm:pb-0", currentStep > 0 ? "justify-between" : "")}>
                {/* Back button */}
                {currentStep > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(s => s - 1)}
                    disabled={submitting}
                    className="h-11 sm:h-9"
                  >
                    {t("back")}
                  </Button>
                )}

                {/* Next or Submit button */}
                {showSubmitButton ? (
                  <Button
                    key={`submit-${currentStep}`}
                    type="submit"
                    className={cn("h-11 sm:h-9", currentStep === 0 ? "w-full" : "flex-1")}
                    disabled={submitting}
                    style={brandPrimary ? { backgroundColor: brandPrimary } : undefined}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className={cn("h-4 w-4 animate-spin", isRtl ? "ml-2" : "mr-2")} />
                        {tCommon("loading")}
                      </>
                    ) : (
                      submitButtonText
                    )}
                  </Button>
                ) : (
                  <Button
                    key={`next-${currentStep}`}
                    type="button"
                    className="w-full h-11 sm:h-9"
                    onClick={handleNextClick}
                    style={brandPrimary ? { backgroundColor: brandPrimary } : undefined}
                  >
                    {t("next")}
                  </Button>
                )}
              </div>
              )}
            </form>
          </Form>

          {/* Contact/Support message */}
          {event.rsvpFormConfig?.settings?.contactMessage && (
            <p className="text-center text-xs text-muted-foreground mt-6 pt-4 border-t">
              {linkify(getLocalizedText(event.rsvpFormConfig.settings.contactMessage, displayLocale))}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
