"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { notFound } from "next/navigation"
import { useTranslations } from "next-intl"
import { Save, RotateCcw, Eye, Settings, BarChart3 } from "lucide-react"
import Link from "next/link"

import { trpc } from "@/trpc/client"
import { PagePanel } from "@/components/global/page-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { createRoute } from "@/lib/routes"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Icons } from "@/components/global/icons"
import { useUpdateEventForm, useEventFormBySlug, useFormResponseSummary, usePublishEventForm, useUnpublishEventForm } from "@/trpc/hooks/event-forms-hooks"
import { GenericFormBuilder } from "@/components/forms/generic-form-builder"
import { FormLinksPanel } from "@/components/forms/form-links-panel"
import type { FormConfig, BilingualText } from "@/server/db/schemas/event-form"

// Helper to clean empty bilingual text fields (empty en string fails validation)
function cleanBilingualText(text: BilingualText | undefined): BilingualText | undefined {
  if (!text || !text.en) return undefined
  return text
}

// Clean form config to remove empty optional bilingual fields before saving
function cleanFormConfig(config: FormConfig): FormConfig {
  return {
    ...config,
    sections: config.sections.map((section) => ({
      ...section,
      description: cleanBilingualText(section.description),
      fields: section.fields.map((field) => ({
        ...field,
        description: cleanBilingualText(field.description),
        placeholder: cleanBilingualText(field.placeholder),
      })),
    })),
    settings: {
      ...config.settings,
      confirmationMessage: cleanBilingualText(config.settings.confirmationMessage),
      submitButtonText: cleanBilingualText(config.settings.submitButtonText),
    },
  }
}

interface FormDetailPageClientProps {
  workspaceSlug: string
  eventSlug: string
  formSlug: string
}

export function FormDetailPageClient({
  workspaceSlug,
  eventSlug,
  formSlug,
}: FormDetailPageClientProps) {
  const router = useRouter()
  const t = useTranslations()

  // Fetch event data
  const { data: event, isLoading: isLoadingEvent } = trpc.events.getBySlug.useQuery(
    { workspaceSlug, eventSlug },
    { enabled: !!workspaceSlug && !!eventSlug }
  )

  // Fetch form data
  const { data: form, isLoading: isLoadingForm } = useEventFormBySlug(
    event?.id ?? "",
    formSlug
  )

  // Fetch categories for visibility settings
  const { data: categoriesData, isLoading: isLoadingCategories } = trpc.guestCategories.getMany.useQuery(
    { eventId: event?.id ?? "" },
    { enabled: !!event?.id }
  )

  // Fetch response summary
  const { data: responseSummary } = useFormResponseSummary(form?.id ?? "")

  const isLoading = isLoadingEvent || isLoadingForm || isLoadingCategories

  // Local state for form editing
  const [localConfig, setLocalConfig] = useState<FormConfig | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [activeTab, setActiveTab] = useState<"builder" | "settings" | "links" | "responses">("builder")

  // Sync local config with server data
  useEffect(() => {
    if (form?.formConfig) {
      setLocalConfig(form.formConfig as FormConfig)
      setIsDirty(false)
    }
  }, [form?.formConfig])

  // Update mutation
  const { mutate: updateForm, isPending: isSaving } = useUpdateEventForm({
    onSuccess: () => setIsDirty(false),
  })

  // Publish/Unpublish mutations
  const { mutate: publishForm, isPending: isPublishing } = usePublishEventForm({})
  const { mutate: unpublishForm, isPending: isUnpublishing } = useUnpublishEventForm({})

  // Fallback URL for back navigation
  const backHref = createRoute("event-detail", { slug: workspaceSlug, eventSlug }).href + "?tab=forms"

  const handleSave = () => {
    if (form && localConfig) {
      updateForm({
        formId: form.id,
        formConfig: cleanFormConfig(localConfig),
      })
    }
  }

  const handleReset = () => {
    if (form?.formConfig) {
      setLocalConfig(form.formConfig as FormConfig)
      setIsDirty(false)
    }
  }

  const handleConfigChange = (newConfig: FormConfig) => {
    setLocalConfig(newConfig)
    setIsDirty(true)
  }

  if (isLoading) {
    return (
      <PagePanel title="Loading..." backHref={backHref}>
        <FormBuilderSkeleton />
      </PagePanel>
    )
  }

  if (!event || !form) {
    notFound()
  }

  const config = localConfig || (form.formConfig as FormConfig)

  return (
    <PagePanel
      title={form.name}
      description={form.description || t("forms.editFormDescription")}
      backHref={backHref}
    >
      <div className="space-y-4">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDirty && (
              <Badge variant="secondary" className="text-[10px]">
                {t("rsvpFormBuilder.unsavedChanges")}
              </Badge>
            )}
            {form.isPublished ? (
              <>
                <Badge className="bg-green-600">{t("forms.published")}</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unpublishForm({ formId: form.id })}
                  disabled={isUnpublishing}
                >
                  {isUnpublishing && <Icons.spinner className="mr-1 h-3 w-3 animate-spin" />}
                  {t("forms.unpublish")}
                </Button>
              </>
            ) : (
              <>
                <Badge variant="secondary">{t("forms.draft")}</Badge>
                <Button
                  size="sm"
                  onClick={() => publishForm({ formId: form.id })}
                  disabled={isPublishing}
                >
                  {isPublishing && <Icons.spinner className="mr-1 h-3 w-3 animate-spin" />}
                  {t("forms.publish")}
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isDirty && (
              <>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  {t("rsvpFormBuilder.reset")}
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Icons.spinner className="h-4 w-4 mr-1 animate-spin" />
                      {t("rsvpFormBuilder.saving")}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      {t("rsvpFormBuilder.save")}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="builder">{t("rsvpFormBuilder.tabs.builder")}</TabsTrigger>
            <TabsTrigger value="settings">{t("rsvpFormBuilder.tabs.settings")}</TabsTrigger>
            <TabsTrigger value="links">{t("forms.links")}</TabsTrigger>
            <TabsTrigger value="responses" className="gap-1">
              {t("formResponses.title")}
              {responseSummary && responseSummary.total > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {responseSummary.total}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Builder Tab */}
          <TabsContent value="builder" className="mt-4">
            <GenericFormBuilder
              config={config}
              categories={categoriesData || []}
              onChange={handleConfigChange}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-4">
            <FormSettingsPanel
              form={form}
              config={config}
              categories={categoriesData || []}
              onConfigChange={handleConfigChange}
            />
          </TabsContent>

          {/* Links Tab */}
          <TabsContent value="links" className="mt-4">
            <FormLinksPanel
              form={{
                id: form.id,
                name: form.name,
                slug: form.slug,
                shortCode: form.shortCode,
                isPublished: form.isPublished,
              }}
              workspaceSlug={workspaceSlug}
              eventSlug={eventSlug}
            />
          </TabsContent>

          {/* Responses Tab */}
          <TabsContent value="responses" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t("formResponses.title")}
                </CardTitle>
                <CardDescription>{t("formResponses.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary Stats */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">{t("formResponses.totalResponses")}</p>
                    <p className="text-2xl font-bold">{responseSummary?.total ?? 0}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">{t("formResponses.recentResponses")}</p>
                    <p className="text-2xl font-bold">{responseSummary?.recentResponses ?? 0}</p>
                    <p className="text-xs text-muted-foreground">{t("formResponses.last24Hours")}</p>
                  </div>
                </div>

                {/* By Category */}
                {responseSummary?.byCategory && responseSummary.byCategory.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium mb-2">{t("formResponses.byCategory")}</p>
                    <div className="space-y-1">
                      {responseSummary.byCategory.map((cat) => (
                        <div key={cat.categoryId || "none"} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{cat.categoryName}</span>
                          <span className="font-medium">{cat.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* View All Button */}
                <div className="pt-2">
                  <Link
                    href={createRoute("form-responses", { slug: workspaceSlug, eventSlug, formSlug }).href}
                  >
                    <Button className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      {t("forms.viewResponses")}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PagePanel>
  )
}

interface FormSettingsPanelProps {
  form: {
    id: string
    name: string
    allowMultipleSubmissions: boolean
    allowAmendments: boolean
    visibleToCategories: string[] | null
  }
  config: FormConfig
  categories: { id: string; name: string; color: string | null }[]
  onConfigChange: (config: FormConfig) => void
}

function FormSettingsPanel({ form, config, categories, onConfigChange }: FormSettingsPanelProps) {
  const t = useTranslations()

  const handleSettingsChange = (settings: Partial<FormConfig["settings"]>) => {
    onConfigChange({
      ...config,
      settings: { ...config.settings, ...settings },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("rsvpFormBuilder.formSettings")}</CardTitle>
        <CardDescription>{t("rsvpFormBuilder.formSettingsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Show Progress Indicator */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("rsvpFormBuilder.showProgressIndicator")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("rsvpFormBuilder.showProgressIndicatorDescription")}
            </p>
          </div>
          <Switch
            checked={config.settings.showProgressIndicator}
            onCheckedChange={(checked) =>
              handleSettingsChange({ showProgressIndicator: checked })
            }
          />
        </div>

        <Separator />

        {/* Confirmation Message */}
        <div className="space-y-2">
          <Label>{t("rsvpFormBuilder.confirmationMessage")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("rsvpFormBuilder.confirmationMessageDescription")}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">English</Label>
              <Textarea
                value={config.settings.confirmationMessage?.en || ""}
                onChange={(e) =>
                  handleSettingsChange({
                    confirmationMessage: {
                      ...config.settings.confirmationMessage,
                      en: e.target.value,
                    },
                  })
                }
                rows={3}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Arabic</Label>
              <Textarea
                value={config.settings.confirmationMessage?.ar || ""}
                onChange={(e) =>
                  handleSettingsChange({
                    confirmationMessage: {
                      en: config.settings.confirmationMessage?.en || "",
                      ar: e.target.value,
                    },
                  })
                }
                rows={3}
                dir="rtl"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Submit Button Text */}
        <div className="space-y-2">
          <Label>{t("rsvpFormBuilder.submitButtonText")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("rsvpFormBuilder.submitButtonTextDescription")}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">English</Label>
              <Input
                value={config.settings.submitButtonText?.en || "Submit"}
                onChange={(e) =>
                  handleSettingsChange({
                    submitButtonText: {
                      ...config.settings.submitButtonText,
                      en: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Arabic</Label>
              <Input
                value={config.settings.submitButtonText?.ar || ""}
                onChange={(e) =>
                  handleSettingsChange({
                    submitButtonText: {
                      en: config.settings.submitButtonText?.en || "Submit",
                      ar: e.target.value,
                    },
                  })
                }
                dir="rtl"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FormBuilderSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Content */}
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}
