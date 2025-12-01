"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"
import { Save, FileDown, FileUp, Eye, Settings, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Icons } from "@/components/global/icons"
import { cn } from "@/lib/utils"

import { BilingualInput } from "./bilingual-input"
import { SectionList } from "./section-list"
import { FormPreview } from "./form-preview"
import { TemplatePickerDialog } from "./template-picker-dialog"
import { SaveTemplateDialog } from "./save-template-dialog"

import {
  useRsvpFormConfig,
  useUpdateFormConfig,
  useToggleSection,
  useToggleStandardField,
  useUpdateStandardField,
  useAddCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
  useReorderSections,
  useReorderCustomFields,
  useUpdateFormSettings,
  useInitializeDefaultForm,
} from "@/trpc/hooks/rsvp-forms-hooks"
import { createDefaultFormConfig } from "@/lib/rsvp"
import type {
  RsvpFormConfig,
  StandardFieldConfig,
  CustomFieldDefinition,
  BilingualText,
} from "@/server/db/schemas/event"
import type { SectionId } from "@/lib/rsvp/types"

interface GuestCategory {
  id: string
  name: string
  code: string
  color: string | null
}

interface RsvpFormBuilderProps {
  eventId: string
  workspaceSlug: string
  categories: GuestCategory[]
}

export function RsvpFormBuilder({
  eventId,
  workspaceSlug,
  categories,
}: RsvpFormBuilderProps) {
  const t = useTranslations("rsvpFormBuilder")

  // State
  const [activeTab, setActiveTab] = useState<"builder" | "settings" | "preview">("builder")
  const [language, setLanguage] = useState<"en" | "ar">("en")
  const [previewCategory, setPreviewCategory] = useState<string | undefined>(undefined)
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false)
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false)
  const [localConfig, setLocalConfig] = useState<RsvpFormConfig | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Queries
  const { data: formData, isLoading: isLoadingConfig } = useRsvpFormConfig(eventId)

  // Mutations
  const { mutate: updateFormConfig, isPending: isSavingConfig } = useUpdateFormConfig({
    onSuccess: () => setIsDirty(false),
  })
  const { mutate: toggleSection } = useToggleSection()
  const { mutate: toggleStandardField } = useToggleStandardField()
  const { mutate: updateStandardField } = useUpdateStandardField()
  const { mutate: addCustomField } = useAddCustomField()
  const { mutate: updateCustomField } = useUpdateCustomField()
  const { mutate: deleteCustomField } = useDeleteCustomField()
  const { mutate: reorderSections } = useReorderSections()
  const { mutate: reorderCustomFields } = useReorderCustomFields()
  const { mutate: updateSettings } = useUpdateFormSettings()
  const { mutate: initializeDefault, isPending: isInitializing } = useInitializeDefaultForm()

  // Sync local config with server data
  useEffect(() => {
    if (formData?.config) {
      setLocalConfig(formData.config)
      setIsDirty(false)
    }
  }, [formData?.config])

  // Current config (local if dirty, otherwise from server)
  const config = localConfig || formData?.config || createDefaultFormConfig()

  // Update local config helper
  const updateLocalConfig = (updater: (prev: RsvpFormConfig) => RsvpFormConfig) => {
    setLocalConfig((prev) => {
      const updated = updater(prev || config)
      setIsDirty(true)
      return updated
    })
  }

  // Handlers
  const handleSave = () => {
    if (localConfig) {
      updateFormConfig({ eventId, config: localConfig })
    }
  }

  const handleReset = () => {
    if (formData?.config) {
      setLocalConfig(formData.config)
      setIsDirty(false)
    }
  }

  const handleInitialize = (template: "default" | "minimal") => {
    initializeDefault({ eventId, template })
  }

  // Section handlers
  const handleToggleSection = (sectionId: SectionId, enabled: boolean) => {
    updateLocalConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, enabled } : s
      ),
    }))
  }

  const handleReorderSections = (sectionIds: SectionId[]) => {
    updateLocalConfig((prev) => ({
      ...prev,
      sections: sectionIds.map((id, index) => {
        const section = prev.sections.find((s) => s.id === id)!
        return { ...section, sortOrder: index }
      }),
    }))
  }

  // Standard field handlers
  const handleToggleStandardField = (
    sectionId: SectionId,
    fieldKey: string,
    enabled: boolean
  ) => {
    updateLocalConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s
        const existingIndex = s.standardFields.findIndex((f) => f.fieldKey === fieldKey)
        if (existingIndex >= 0) {
          const newFields = [...s.standardFields]
          newFields[existingIndex] = { ...newFields[existingIndex], enabled }
          return { ...s, standardFields: newFields }
        } else {
          return {
            ...s,
            standardFields: [...s.standardFields, { fieldKey, enabled, required: false }],
          }
        }
      }),
    }))
  }

  const handleUpdateStandardField = (
    sectionId: SectionId,
    fieldKey: string,
    fieldConfig: Partial<StandardFieldConfig>
  ) => {
    updateLocalConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s
        return {
          ...s,
          standardFields: s.standardFields.map((f) =>
            f.fieldKey === fieldKey ? { ...f, ...fieldConfig } : f
          ),
        }
      }),
    }))
  }

  // Custom field handlers
  const handleAddCustomField = (
    sectionId: SectionId,
    field: Omit<CustomFieldDefinition, "sortOrder">
  ) => {
    updateLocalConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s
        return {
          ...s,
          customFields: [
            ...s.customFields,
            { ...field, sortOrder: s.customFields.length } as CustomFieldDefinition,
          ],
        }
      }),
    }))
  }

  const handleUpdateCustomField = (
    sectionId: SectionId,
    fieldId: string,
    field: Partial<CustomFieldDefinition>
  ) => {
    updateLocalConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s
        return {
          ...s,
          customFields: s.customFields.map((f) =>
            f.id === fieldId ? { ...f, ...field } : f
          ),
        }
      }),
    }))
  }

  const handleDeleteCustomField = (sectionId: SectionId, fieldId: string) => {
    updateLocalConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s
        const newFields = s.customFields
          .filter((f) => f.id !== fieldId)
          .map((f, i) => ({ ...f, sortOrder: i }))
        return { ...s, customFields: newFields }
      }),
    }))
  }

  const handleReorderCustomFields = (sectionId: SectionId, fieldIds: string[]) => {
    updateLocalConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s
        const newFields = fieldIds.map((id, index) => {
          const field = s.customFields.find((f) => f.id === id)!
          return { ...field, sortOrder: index }
        })
        return { ...s, customFields: newFields }
      }),
    }))
  }

  // Settings handlers
  const handleUpdateSettings = (
    settings: Partial<RsvpFormConfig["settings"]>
  ) => {
    updateLocalConfig((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }))
  }

  if (isLoadingConfig) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          {isDirty && (
            <Badge variant="secondary" className="text-[10px]">
              {t("unsavedChanges")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <div className="flex items-center gap-2 border rounded-lg px-2 py-1">
            <span className="text-xs text-muted-foreground">{t("language")}:</span>
            <Select value={language} onValueChange={(v) => setLanguage(v as "en" | "ar")}>
              <SelectTrigger className="h-7 w-20 border-0 p-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">EN</SelectItem>
                <SelectItem value="ar">AR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTemplatePickerOpen(true)}
          >
            <FileDown className="h-4 w-4 mr-1" />
            {t("loadTemplate")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSaveTemplateOpen(true)}
          >
            <FileUp className="h-4 w-4 mr-1" />
            {t("saveTemplate")}
          </Button>

          {/* Save/Reset */}
          {isDirty && (
            <>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-1" />
                {t("reset")}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSavingConfig}>
                {isSavingConfig ? (
                  <>
                    <Icons.loader className="h-4 w-4 mr-1 animate-spin" />
                    {t("saving")}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    {t("save")}
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
          <TabsTrigger value="builder">{t("tabs.builder")}</TabsTrigger>
          <TabsTrigger value="settings">{t("tabs.settings")}</TabsTrigger>
          <TabsTrigger value="preview">{t("tabs.preview")}</TabsTrigger>
        </TabsList>

        {/* Builder Tab */}
        <TabsContent value="builder" className="mt-4">
          <SectionList
            sections={config.sections}
            categories={categories}
            language={language}
            onToggleSection={handleToggleSection}
            onReorderSections={handleReorderSections}
            onToggleStandardField={handleToggleStandardField}
            onUpdateStandardField={handleUpdateStandardField}
            onAddCustomField={handleAddCustomField}
            onUpdateCustomField={handleUpdateCustomField}
            onDeleteCustomField={handleDeleteCustomField}
            onReorderCustomFields={handleReorderCustomFields}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("formSettings")}</CardTitle>
              <CardDescription>{t("formSettingsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Allow Amendments */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("allowAmendments")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("allowAmendmentsDescription")}
                  </p>
                </div>
                <Switch
                  checked={config.settings.allowAmendments}
                  onCheckedChange={(checked) =>
                    handleUpdateSettings({ allowAmendments: checked })
                  }
                />
              </div>

              <Separator />

              {/* Show Progress Indicator */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("showProgressIndicator")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("showProgressIndicatorDescription")}
                  </p>
                </div>
                <Switch
                  checked={config.settings.showProgressIndicator}
                  onCheckedChange={(checked) =>
                    handleUpdateSettings({ showProgressIndicator: checked })
                  }
                />
              </div>

              <Separator />

              {/* Confirmation Message */}
              <BilingualInput
                label={t("confirmationMessage")}
                description={t("confirmationMessageDescription")}
                value={config.settings.confirmationMessage || { en: "", ar: "" }}
                onChange={(value) =>
                  handleUpdateSettings({
                    confirmationMessage: value.en ? (value as BilingualText) : undefined,
                  })
                }
                multiline
                rows={3}
              />

              {/* Decline Message */}
              <BilingualInput
                label={t("declineMessage")}
                description={t("declineMessageDescription")}
                value={config.settings.declineMessage || { en: "", ar: "" }}
                onChange={(value) =>
                  handleUpdateSettings({
                    declineMessage: value.en ? (value as BilingualText) : undefined,
                  })
                }
                multiline
                rows={3}
              />

              {/* Submit Button Text */}
              <BilingualInput
                label={t("submitButtonText")}
                description={t("submitButtonTextDescription")}
                value={config.settings.submitButtonText || { en: "Submit RSVP", ar: "إرسال تأكيد الحضور" }}
                onChange={(value) =>
                  handleUpdateSettings({
                    submitButtonText: value as BilingualText,
                  })
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Preview Controls */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t("previewSettings")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Language */}
                  <div className="space-y-2">
                    <Label className="text-xs">{t("previewLanguage")}</Label>
                    <Select
                      value={language}
                      onValueChange={(v) => setLanguage(v as "en" | "ar")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">{t("english")}</SelectItem>
                        <SelectItem value="ar">{t("arabic")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs">{t("previewCategory")}</Label>
                    <Select
                      value={previewCategory || "all"}
                      onValueChange={(v) =>
                        setPreviewCategory(v === "all" ? undefined : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("allCategories")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("allCategories")}</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: cat.color || "#6366f1" }}
                              />
                              {cat.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="pt-6">
                  <FormPreview
                    config={config}
                    language={language}
                    previewCategoryId={previewCategory}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Template Dialogs */}
      <TemplatePickerDialog
        open={isTemplatePickerOpen}
        onOpenChange={setIsTemplatePickerOpen}
        workspaceSlug={workspaceSlug}
        eventId={eventId}
        onSuccess={() => setIsDirty(false)}
      />

      <SaveTemplateDialog
        open={isSaveTemplateOpen}
        onOpenChange={setIsSaveTemplateOpen}
        eventId={eventId}
      />
    </div>
  )
}
