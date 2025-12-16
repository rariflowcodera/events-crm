"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { trpc } from "@/trpc/client"
import { useUpdateEventBranding } from "@/trpc/hooks/events-hooks"

import { eventBrandingSchema } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ColorPicker, LogoUploadGroup, BrandingPreview, InheritanceIndicator, BackgroundImageUpload, CardAccentSettings, SectionHeaderSettings, EmailBrandingSettings } from "@/components/branding"
import { Icons } from "@/components/global/icons"

// ============================================================================
// Types
// ============================================================================

interface EventBrandingTabProps {
  event: {
    id: string
    name: string
  }
  workspaceSlug: string
}

type FormValues = z.infer<typeof eventBrandingSchema>

// ============================================================================
// Component
// ============================================================================

export function EventBrandingTab({ event, workspaceSlug }: EventBrandingTabProps) {
  const t = useTranslations()

  const { data, isLoading, error } = trpc.events.getBranding.useQuery({ eventId: event.id })
  const { mutate: updateBranding, isPending } = useUpdateEventBranding()

  const form = useForm<FormValues>({
    resolver: zodResolver(eventBrandingSchema),
    defaultValues: {
      logo: "",
      logoDark: "",
      primaryColor: "",
      secondaryColor: "",
      primaryColorDark: "",
      secondaryColorDark: "",
      backgroundImage: "",
      backgroundImageMode: undefined,
      cardAccent: undefined,
      sectionHeader: undefined,
      emailBranding: undefined,
    },
  })

  // Update form when data loads
  const eventBranding = data?.eventBranding
  const workspaceBranding = data?.workspaceBranding
  const resolved = data?.resolved

  // Sync form with server data using useEffect
  useEffect(() => {
    if (data) {
      const newValues = {
        logo: data.eventBranding?.logo || "",
        logoDark: data.eventBranding?.logoDark || "",
        primaryColor: data.eventBranding?.primaryColor || "",
        secondaryColor: data.eventBranding?.secondaryColor || "",
        primaryColorDark: data.eventBranding?.primaryColorDark || "",
        secondaryColorDark: data.eventBranding?.secondaryColorDark || "",
        backgroundImage: data.eventBranding?.backgroundImage || "",
        backgroundImageMode: data.eventBranding?.backgroundImageMode,
        cardAccent: data.eventBranding?.cardAccent,
        sectionHeader: data.eventBranding?.sectionHeader,
        emailBranding: data.eventBranding?.emailBranding,
      }
      form.reset(newValues)
    }
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const watchedValues = form.watch()

  // Calculate which fields are inherited (empty in event branding)
  const isInherited = {
    logo: !watchedValues.logo && !!workspaceBranding?.logo,
    logoDark: !watchedValues.logoDark && !!workspaceBranding?.logoDark,
    primaryColor: !watchedValues.primaryColor && !!workspaceBranding?.primaryColor,
    secondaryColor: !watchedValues.secondaryColor && !!workspaceBranding?.accentColor,
    primaryColorDark: !watchedValues.primaryColorDark && !!workspaceBranding?.primaryColorDark,
    secondaryColorDark: !watchedValues.secondaryColorDark && !!workspaceBranding?.accentColorDark,
  }

  const hasAnyCustomBranding = Object.values(watchedValues).some((v) => v)

  const onSubmit = (values: FormValues) => {
    updateBranding({
      eventId: event.id,
      branding: {
        logo: values.logo || undefined,
        logoDark: values.logoDark || undefined,
        primaryColor: values.primaryColor || undefined,
        secondaryColor: values.secondaryColor || undefined,
        primaryColorDark: values.primaryColorDark || undefined,
        secondaryColorDark: values.secondaryColorDark || undefined,
        backgroundImage: values.backgroundImage || undefined,
        backgroundImageMode: values.backgroundImageMode || undefined,
        cardAccent: values.cardAccent || undefined,
        sectionHeader: values.sectionHeader || undefined,
        emailBranding: values.emailBranding || undefined,
      },
    })
  }

  const handleResetToWorkspace = () => {
    updateBranding({
      eventId: event.id,
      branding: null,
    })
    form.reset({
      logo: "",
      logoDark: "",
      primaryColor: "",
      secondaryColor: "",
      primaryColorDark: "",
      secondaryColorDark: "",
      backgroundImage: "",
      backgroundImageMode: undefined,
      cardAccent: undefined,
      sectionHeader: undefined,
      emailBranding: undefined,
    })
  }

  if (isLoading) {
    return <EventBrandingTabSkeleton />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Icons.alertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load branding settings: {error.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      {/* Form Card */}
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Event Branding</CardTitle>
                  <CardDescription>
                    Customize the look and feel of your RSVP pages
                  </CardDescription>
                </div>
                <InheritanceIndicator
                  isInherited={!hasAnyCustomBranding}
                  workspaceName={data?.workspaceName}
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Inheritance info */}
              <Alert>
                <Icons.info className="h-4 w-4" />
                <AlertDescription>
                  Leave fields empty to inherit from workspace branding. Set custom values to override.
                </AlertDescription>
              </Alert>

              {/* Logos Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Logos</h3>
                <LogoUploadGroup
                  logo={watchedValues.logo || ""}
                  logoDark={watchedValues.logoDark || ""}
                  onLogoChange={(url) => {
                    // Update form value for immediate visual feedback
                    form.setValue("logo", url)
                    // Auto-save after logo upload
                    const currentValues = form.getValues()
                    updateBranding({
                      eventId: event.id,
                      branding: {
                        logo: url || undefined,
                        logoDark: currentValues.logoDark || undefined,
                        primaryColor: currentValues.primaryColor || undefined,
                        secondaryColor: currentValues.secondaryColor || undefined,
                        primaryColorDark: currentValues.primaryColorDark || undefined,
                        secondaryColorDark: currentValues.secondaryColorDark || undefined,
                        backgroundImage: currentValues.backgroundImage || undefined,
                      },
                    })
                  }}
                  onLogoDarkChange={(url) => {
                    // Update form value for immediate visual feedback
                    form.setValue("logoDark", url)
                    // Auto-save after logo upload
                    const currentValues = form.getValues()
                    updateBranding({
                      eventId: event.id,
                      branding: {
                        logo: currentValues.logo || undefined,
                        logoDark: url || undefined,
                        primaryColor: currentValues.primaryColor || undefined,
                        secondaryColor: currentValues.secondaryColor || undefined,
                        primaryColorDark: currentValues.primaryColorDark || undefined,
                        secondaryColorDark: currentValues.secondaryColorDark || undefined,
                        backgroundImage: currentValues.backgroundImage || undefined,
                      },
                    })
                  }}
                  disabled={isPending}
                />
                {isInherited.logo && (
                  <p className="text-xs text-muted-foreground">
                    Using workspace logo. Upload a custom logo to override.
                  </p>
                )}
              </div>

              <Separator />

              {/* Light Mode Colors */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Light Mode Colors</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="primaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <ColorPicker
                          value={field.value}
                          onChange={field.onChange}
                          label="Primary Color"
                          disabled={isPending}
                          showInheritOption={true}
                          inheritedValue={workspaceBranding?.primaryColor}
                          onReset={() => form.setValue("primaryColor", "", { shouldDirty: true })}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="secondaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <ColorPicker
                          value={field.value}
                          onChange={field.onChange}
                          label="Accent Color"
                          disabled={isPending}
                          showInheritOption={true}
                          inheritedValue={workspaceBranding?.accentColor}
                          onReset={() => form.setValue("secondaryColor", "", { shouldDirty: true })}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Dark Mode Colors */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Dark Mode Colors</h3>
                  <p className="text-xs text-muted-foreground">
                    Optional. If not set, light mode colors or workspace defaults will be used.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="primaryColorDark"
                    render={({ field }) => (
                      <FormItem>
                        <ColorPicker
                          value={field.value}
                          onChange={field.onChange}
                          label="Primary Color (Dark)"
                          disabled={isPending}
                          showInheritOption={true}
                          inheritedValue={workspaceBranding?.primaryColorDark}
                          onReset={() => form.setValue("primaryColorDark", "", { shouldDirty: true })}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="secondaryColorDark"
                    render={({ field }) => (
                      <FormItem>
                        <ColorPicker
                          value={field.value}
                          onChange={field.onChange}
                          label="Accent Color (Dark)"
                          disabled={isPending}
                          showInheritOption={true}
                          inheritedValue={workspaceBranding?.accentColorDark}
                          onReset={() => form.setValue("secondaryColorDark", "", { shouldDirty: true })}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Background Image */}
              <div className="space-y-4">
                <BackgroundImageUpload
                  value={watchedValues.backgroundImage || ""}
                  onChange={(url) => {
                    // Update form value for immediate visual feedback
                    form.setValue("backgroundImage", url, { shouldDirty: true })
                    // Auto-save after background image change
                    const currentValues = form.getValues()
                    updateBranding({
                      eventId: event.id,
                      branding: {
                        logo: currentValues.logo || undefined,
                        logoDark: currentValues.logoDark || undefined,
                        primaryColor: currentValues.primaryColor || undefined,
                        secondaryColor: currentValues.secondaryColor || undefined,
                        primaryColorDark: currentValues.primaryColorDark || undefined,
                        secondaryColorDark: currentValues.secondaryColorDark || undefined,
                        backgroundImage: url || undefined,
                        backgroundImageMode: currentValues.backgroundImageMode || undefined,
                      },
                    })
                  }}
                  mode={watchedValues.backgroundImageMode || "cover"}
                  onModeChange={(mode) => {
                    // Update form value for immediate visual feedback
                    form.setValue("backgroundImageMode", mode, { shouldDirty: true })
                    // Auto-save after mode change
                    const currentValues = form.getValues()
                    updateBranding({
                      eventId: event.id,
                      branding: {
                        logo: currentValues.logo || undefined,
                        logoDark: currentValues.logoDark || undefined,
                        primaryColor: currentValues.primaryColor || undefined,
                        secondaryColor: currentValues.secondaryColor || undefined,
                        primaryColorDark: currentValues.primaryColorDark || undefined,
                        secondaryColorDark: currentValues.secondaryColorDark || undefined,
                        backgroundImage: currentValues.backgroundImage || undefined,
                        backgroundImageMode: mode || undefined,
                      },
                    })
                  }}
                  disabled={isPending}
                />
              </div>

              <Separator />

              {/* Card Styling Section */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium">{t("branding.cardStyling") || "Card Styling"}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t("branding.cardStylingDescription") || "Customize the appearance of RSVP page cards"}
                  </p>
                </div>

                <CardAccentSettings
                  value={watchedValues.cardAccent}
                  onChange={(accent) => {
                    form.setValue("cardAccent", accent, { shouldDirty: true })
                    // Auto-save
                    const currentValues = form.getValues()
                    updateBranding({
                      eventId: event.id,
                      branding: {
                        logo: currentValues.logo || undefined,
                        logoDark: currentValues.logoDark || undefined,
                        primaryColor: currentValues.primaryColor || undefined,
                        secondaryColor: currentValues.secondaryColor || undefined,
                        primaryColorDark: currentValues.primaryColorDark || undefined,
                        secondaryColorDark: currentValues.secondaryColorDark || undefined,
                        backgroundImage: currentValues.backgroundImage || undefined,
                        backgroundImageMode: currentValues.backgroundImageMode || undefined,
                        cardAccent: accent || undefined,
                        sectionHeader: currentValues.sectionHeader || undefined,
                      },
                    })
                  }}
                  disabled={isPending}
                />

                <SectionHeaderSettings
                  value={watchedValues.sectionHeader}
                  onChange={(header) => {
                    form.setValue("sectionHeader", header, { shouldDirty: true })
                    // Auto-save
                    const currentValues = form.getValues()
                    updateBranding({
                      eventId: event.id,
                      branding: {
                        logo: currentValues.logo || undefined,
                        logoDark: currentValues.logoDark || undefined,
                        primaryColor: currentValues.primaryColor || undefined,
                        secondaryColor: currentValues.secondaryColor || undefined,
                        primaryColorDark: currentValues.primaryColorDark || undefined,
                        secondaryColorDark: currentValues.secondaryColorDark || undefined,
                        backgroundImage: currentValues.backgroundImage || undefined,
                        backgroundImageMode: currentValues.backgroundImageMode || undefined,
                        cardAccent: currentValues.cardAccent || undefined,
                        sectionHeader: header || undefined,
                      },
                    })
                  }}
                  disabled={isPending}
                />
              </div>

              <Separator />

              {/* Email Branding Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Email Branding</h3>
                  <p className="text-xs text-muted-foreground">
                    Customize colors and styles for email templates. Leave empty to inherit from workspace.
                  </p>
                </div>
                <EmailBrandingSettings
                  namePrefix="emailBranding"
                  inheritedValues={workspaceBranding?.emailBranding}
                  visualBrandingColors={{
                    primaryColor: resolved?.primaryColor || undefined,
                    accentColor: resolved?.accentColor || undefined,
                  }}
                />
              </div>
            </CardContent>

            <CardFooter className="flex justify-between border-t pt-4">
              {hasAnyCustomBranding ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetToWorkspace}
                  disabled={isPending}
                >
                  <Icons.refresh className="mr-2 h-4 w-4" />
                  Reset to Workspace
                </Button>
              ) : (
                <div />
              )}
              <Button type="submit" disabled={isPending || !form.formState.isDirty}>
                {isPending ? (
                  <>
                    <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {/* Preview Card */}
      <div className="hidden lg:block">
        <BrandingPreview
          logo={resolved?.logo || watchedValues.logo}
          logoDark={resolved?.logoDark || watchedValues.logoDark}
          primaryColor={resolved?.primaryColor || watchedValues.primaryColor || "#4F46E5"}
          accentColor={resolved?.accentColor || watchedValues.secondaryColor || "#0EA5E9"}
          backgroundImage={watchedValues.backgroundImage}
          backgroundImageMode={watchedValues.backgroundImageMode || "cover"}
          cardAccent={watchedValues.cardAccent}
          sectionHeader={watchedValues.sectionHeader}
          className="sticky top-4"
        />
      </div>
    </div>
  )
}

// ============================================================================
// Skeleton
// ============================================================================

function EventBrandingTabSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logos skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-16" />
            <div className="grid gap-6 sm:grid-cols-2">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </div>

          <Separator />

          {/* Colors skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <Skeleton className="ml-auto h-9 w-28" />
        </CardFooter>
      </Card>

      {/* Preview skeleton */}
      <div className="hidden lg:block">
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    </div>
  )
}
