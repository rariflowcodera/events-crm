"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronDown, ChevronRight, Settings2, GripVertical } from "lucide-react"

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
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

import { BilingualInput, BilingualDisplay } from "./bilingual-input"
import { StandardFieldList } from "./standard-field-list"
import { CustomFieldEditor } from "./custom-field-editor"
import { STANDARD_FIELDS, SECTION_DEFINITIONS, getFieldsForSection } from "@/lib/rsvp"
import type { RsvpFormSection, StandardFieldConfig, CustomFieldDefinition, BilingualText } from "@/server/db/schemas/event"
import type { SectionId } from "@/lib/rsvp/types"

interface GuestCategory {
  id: string
  name: string
  code: string
  color: string | null
}

interface SectionListProps {
  sections: RsvpFormSection[]
  categories: GuestCategory[]
  language: "en" | "ar"
  onToggleSection: (sectionId: SectionId, enabled: boolean) => void
  onReorderSections: (sectionIds: SectionId[]) => void
  onToggleStandardField: (sectionId: SectionId, fieldKey: string, enabled: boolean) => void
  onUpdateStandardField: (sectionId: SectionId, fieldKey: string, config: Partial<StandardFieldConfig>) => void
  onAddCustomField: (sectionId: SectionId, field: Omit<CustomFieldDefinition, "sortOrder">) => void
  onUpdateCustomField: (sectionId: SectionId, fieldId: string, field: Partial<CustomFieldDefinition>) => void
  onDeleteCustomField: (sectionId: SectionId, fieldId: string) => void
  onReorderCustomFields: (sectionId: SectionId, fieldIds: string[]) => void
  disabled?: boolean
}

export function SectionList({
  sections,
  categories,
  language,
  onToggleSection,
  onReorderSections,
  onToggleStandardField,
  onUpdateStandardField,
  onAddCustomField,
  onUpdateCustomField,
  onDeleteCustomField,
  onReorderCustomFields,
  disabled = false,
}: SectionListProps) {
  const t = useTranslations("rsvpFormBuilder")
  const [expandedSection, setExpandedSection] = useState<SectionId | null>(
    sections.find((s) => s.enabled)?.id || null
  )

  // Sort sections by sortOrder
  const sortedSections = [...sections].sort((a, b) => a.sortOrder - b.sortOrder)

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= sortedSections.length) return

    const newOrder = [...sortedSections]
    const [moved] = newOrder.splice(index, 1)
    newOrder.splice(newIndex, 0, moved)

    onReorderSections(newOrder.map((s) => s.id))
  }

  const getSectionStats = (section: RsvpFormSection) => {
    const standardFieldDefs = getFieldsForSection(section.id)
    const enabledStandard = section.standardFields.filter((f) => f.enabled).length
    const totalStandard = standardFieldDefs.length
    const customCount = section.customFields.length

    return {
      enabledStandard,
      totalStandard,
      customCount,
      totalEnabled: enabledStandard + customCount,
    }
  }

  return (
    <div className="space-y-3">
      {sortedSections.map((section, index) => {
        const stats = getSectionStats(section)
        const isExpanded = expandedSection === section.id
        const sectionDef = SECTION_DEFINITIONS[section.id]
        const standardFieldDefs = getFieldsForSection(section.id)

        return (
          <div
            key={section.id}
            className={cn(
              "rounded-lg border transition-colors",
              section.enabled ? "bg-background" : "bg-muted/30",
              disabled && "opacity-50"
            )}
          >
            {/* Section Header */}
            <div className="flex items-center gap-2 p-3">
              {/* Reorder Controls */}
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleMoveSection(index, "up")}
                  disabled={disabled || index === 0}
                >
                  <span className="text-xs">↑</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleMoveSection(index, "down")}
                  disabled={disabled || index === sortedSections.length - 1}
                >
                  <span className="text-xs">↓</span>
                </Button>
              </div>

              {/* Enable/Disable Toggle */}
              <Switch
                checked={section.enabled}
                onCheckedChange={(checked) => onToggleSection(section.id, checked)}
                disabled={disabled}
                aria-label={`Toggle ${section.title.en}`}
              />

              {/* Section Info */}
              <button
                type="button"
                className="flex-1 flex items-center justify-between text-left"
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                disabled={!section.enabled}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span
                      className={cn(
                        "font-medium",
                        !section.enabled && "text-muted-foreground"
                      )}
                    >
                      <BilingualDisplay value={section.title} language={language} />
                    </span>
                  </div>
                  {section.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                      <BilingualDisplay value={section.description} language={language} fallback="" />
                    </p>
                  )}
                </div>

                {section.enabled && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {stats.enabledStandard}/{stats.totalStandard} {t("fields")}
                    </Badge>
                    {stats.customCount > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{stats.customCount} {t("custom")}
                      </Badge>
                    )}
                  </div>
                )}
              </button>
            </div>

            {/* Section Content */}
            {section.enabled && isExpanded && (
              <div className="px-3 pb-3 space-y-4">
                <Separator />

                {/* Standard Fields */}
                <div>
                  <h4 className="text-sm font-medium mb-2">{t("standardFields")}</h4>
                  <StandardFieldList
                    sectionId={section.id}
                    standardFields={standardFieldDefs}
                    fieldConfigs={section.standardFields}
                    categories={categories}
                    language={language}
                    onToggleField={(fieldKey, enabled) =>
                      onToggleStandardField(section.id, fieldKey, enabled)
                    }
                    onUpdateField={(fieldKey, config) =>
                      onUpdateStandardField(section.id, fieldKey, config)
                    }
                    disabled={disabled}
                  />
                </div>

                {/* Custom Fields */}
                <div>
                  <h4 className="text-sm font-medium mb-2">{t("customFields")}</h4>
                  <CustomFieldEditor
                    customFields={section.customFields}
                    categories={categories}
                    language={language}
                    onAddField={(field) => onAddCustomField(section.id, field)}
                    onUpdateField={(fieldId, field) =>
                      onUpdateCustomField(section.id, fieldId, field)
                    }
                    onDeleteField={(fieldId) => onDeleteCustomField(section.id, fieldId)}
                    onReorderFields={(fieldIds) =>
                      onReorderCustomFields(section.id, fieldIds)
                    }
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
