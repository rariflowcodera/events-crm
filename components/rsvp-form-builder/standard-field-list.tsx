"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronDown, ChevronRight, Settings2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

import { BilingualInput, BilingualDisplay } from "./bilingual-input"
import { CategoryVisibilitySelect, CategoryBadges } from "./category-visibility-select"
import type { StandardFieldDefinition, SectionId } from "@/lib/rsvp/types"
import type { StandardFieldConfig, BilingualText } from "@/server/db/schemas/event"

interface GuestCategory {
  id: string
  name: string
  code: string
  color: string | null
}

interface StandardFieldListProps {
  sectionId: SectionId
  standardFields: StandardFieldDefinition[]
  fieldConfigs: StandardFieldConfig[]
  categories: GuestCategory[]
  language: "en" | "ar"
  onToggleField: (fieldKey: string, enabled: boolean) => void
  onUpdateField: (fieldKey: string, config: Partial<StandardFieldConfig>) => void
  disabled?: boolean
}

export function StandardFieldList({
  sectionId,
  standardFields,
  fieldConfigs,
  categories,
  language,
  onToggleField,
  onUpdateField,
  disabled = false,
}: StandardFieldListProps) {
  const t = useTranslations("rsvpFormBuilder")
  const [editingField, setEditingField] = useState<string | null>(null)

  // Get config for a field, with defaults
  const getFieldConfig = (fieldKey: string): StandardFieldConfig => {
    const config = fieldConfigs.find((f) => f.fieldKey === fieldKey)
    return config || { fieldKey, enabled: false, required: false }
  }

  const editingFieldDef = editingField
    ? standardFields.find((f) => f.fieldKey === editingField)
    : null

  const editingFieldConfig = editingField ? getFieldConfig(editingField) : null

  return (
    <div className="space-y-2">
      {standardFields.map((field) => {
        const config = getFieldConfig(field.fieldKey)
        const isEnabled = config.enabled

        return (
          <div
            key={field.fieldKey}
            className={cn(
              "flex items-center justify-between rounded-lg border p-3 transition-colors",
              isEnabled ? "bg-background" : "bg-muted/50",
              disabled && "opacity-50"
            )}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => onToggleField(field.fieldKey, checked)}
                disabled={disabled}
                aria-label={`Toggle ${field.label.en}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium text-sm", !isEnabled && "text-muted-foreground")}>
                    {config.labelOverride ? (
                      <BilingualDisplay value={config.labelOverride} language={language} />
                    ) : (
                      <BilingualDisplay value={field.label} language={language} />
                    )}
                  </span>
                  {config.required && isEnabled && (
                    <Badge variant="secondary" className="text-[10px] px-1.5">
                      {t("required")}
                    </Badge>
                  )}
                </div>
                {field.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    <BilingualDisplay
                      value={field.description}
                      language={language}
                      fallback=""
                    />
                  </p>
                )}
                {isEnabled && config.visibleToCategories && config.visibleToCategories.length > 0 && (
                  <div className="mt-1">
                    <CategoryBadges
                      categories={categories}
                      selectedIds={config.visibleToCategories}
                    />
                  </div>
                )}
              </div>
            </div>

            {isEnabled && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setEditingField(field.fieldKey)}
                disabled={disabled}
              >
                <Settings2 className="h-4 w-4" />
                <span className="sr-only">{t("configureField")}</span>
              </Button>
            )}
          </div>
        )
      })}

      {/* Field Settings Sheet */}
      <Sheet open={!!editingField} onOpenChange={(open) => !open && setEditingField(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editingFieldDef && (
                <BilingualDisplay value={editingFieldDef.label} language={language} />
              )}
            </SheetTitle>
            <SheetDescription>
              {t("configureFieldSettings")}
            </SheetDescription>
          </SheetHeader>

          {editingFieldConfig && editingFieldDef && (
            <div className="space-y-6 px-4 pb-4 mt-6">
              {/* Required Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("requiredField")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("requiredFieldDescription")}
                  </p>
                </div>
                <Switch
                  checked={editingFieldConfig.required}
                  onCheckedChange={(checked) =>
                    onUpdateField(editingFieldConfig.fieldKey, { required: checked })
                  }
                />
              </div>

              {/* Label Override */}
              <div className="space-y-2">
                <BilingualInput
                  label={t("customLabel")}
                  description={t("customLabelDescription")}
                  value={editingFieldConfig.labelOverride || { en: "", ar: "" }}
                  onChange={(value) =>
                    onUpdateField(editingFieldConfig.fieldKey, {
                      labelOverride: value.en ? value as BilingualText : undefined,
                    })
                  }
                  placeholder={{
                    en: editingFieldDef.label.en,
                    ar: editingFieldDef.label.ar,
                  }}
                />
              </div>

              {/* Category Visibility */}
              <CategoryVisibilitySelect
                label={t("visibleToCategories")}
                description={t("categoryVisibilityDescription")}
                categories={categories}
                value={editingFieldConfig.visibleToCategories}
                onChange={(categoryIds) =>
                  onUpdateField(editingFieldConfig.fieldKey, {
                    visibleToCategories: categoryIds,
                  })
                }
              />

              {/* Field Info (read-only) */}
              <div className="rounded-lg bg-muted p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("fieldInfo")}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-muted-foreground">{t("fieldType")}:</span>
                  <span className="font-medium capitalize">{editingFieldDef.type}</span>
                  <span className="text-muted-foreground">{t("fieldKey")}:</span>
                  <span className="font-mono text-[10px]">{editingFieldDef.fieldKey}</span>
                </div>
              </div>

              {/* Field Options (read-only) */}
              {editingFieldDef.options && editingFieldDef.options.length > 0 && (
                <div className="rounded-lg bg-muted p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("fieldOptionsReadOnly")}
                  </p>
                  <div className="space-y-1">
                    {editingFieldDef.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">•</span>
                        <BilingualDisplay value={option.label} language={language} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

interface StandardFieldSectionProps extends StandardFieldListProps {
  sectionTitle: string
  sectionDescription?: string
  defaultOpen?: boolean
}

export function StandardFieldSection({
  sectionTitle,
  sectionDescription,
  defaultOpen = true,
  ...props
}: StandardFieldSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const enabledCount = props.fieldConfigs.filter((f) => f.enabled).length

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-3 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <div className="text-left">
              <span className="font-medium">{sectionTitle}</span>
              {sectionDescription && (
                <p className="text-xs text-muted-foreground font-normal">
                  {sectionDescription}
                </p>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="ml-2">
            {enabledCount}/{props.standardFields.length}
          </Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        <StandardFieldList {...props} />
      </CollapsibleContent>
    </Collapsible>
  )
}
