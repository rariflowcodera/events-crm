"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { GripVertical, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Icons } from "@/components/global/icons"
import { cn } from "@/lib/utils"
import type { FormConfig, FormSectionConfig, FormFieldConfig, BilingualText } from "@/server/db/schemas/event-form"

interface GuestCategory {
  id: string
  name: string
  color: string | null
}

interface GenericFormBuilderProps {
  config: FormConfig
  categories: GuestCategory[]
  onChange: (config: FormConfig) => void
}

const fieldTypes = [
  { value: "text", label: "Text", icon: Icons.text },
  { value: "textarea", label: "Long Text", icon: Icons.fileText },
  { value: "number", label: "Number", icon: Icons.hash },
  { value: "email", label: "Email", icon: Icons.mail },
  { value: "phone", label: "Phone", icon: Icons.phone },
  { value: "date", label: "Date", icon: Icons.calendar },
  { value: "select", label: "Dropdown", icon: Icons.chevronDown },
  { value: "radio", label: "Radio Buttons", icon: Icons.circle },
  { value: "checkbox", label: "Checkbox", icon: Icons.check },
] as const

export function GenericFormBuilder({
  config,
  categories,
  onChange,
}: GenericFormBuilderProps) {
  const t = useTranslations("rsvpFormBuilder")
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(config.sections.map((s) => s.id))
  )
  const [editingField, setEditingField] = useState<{
    sectionId: string
    field: FormFieldConfig | null
  } | null>(null)
  const [deletingField, setDeletingField] = useState<{
    sectionId: string
    fieldId: string
  } | null>(null)

  // Section handlers
  const handleAddSection = () => {
    const newSection: FormSectionConfig = {
      id: crypto.randomUUID(),
      title: { en: `Section ${config.sections.length + 1}` },
      enabled: true,
      sortOrder: config.sections.length,
      fields: [],
    }
    onChange({
      ...config,
      sections: [...config.sections, newSection],
    })
    setExpandedSections((prev) => new Set([...prev, newSection.id]))
  }

  const handleDeleteSection = (sectionId: string) => {
    onChange({
      ...config,
      sections: config.sections
        .filter((s) => s.id !== sectionId)
        .map((s, i) => ({ ...s, sortOrder: i })),
    })
  }

  const handleUpdateSection = (sectionId: string, updates: Partial<FormSectionConfig>) => {
    onChange({
      ...config,
      sections: config.sections.map((s) =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    })
  }

  const handleMoveSection = (sectionId: string, direction: "up" | "down") => {
    const currentIndex = config.sections.findIndex((s) => s.id === sectionId)
    if (currentIndex === -1) return

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= config.sections.length) return

    const newSections = [...config.sections]
    const [movedSection] = newSections.splice(currentIndex, 1)
    newSections.splice(newIndex, 0, movedSection)

    onChange({
      ...config,
      sections: newSections.map((s, i) => ({ ...s, sortOrder: i })),
    })
  }

  // Field handlers
  const handleAddField = (sectionId: string) => {
    setEditingField({
      sectionId,
      field: null,
    })
  }

  const handleEditField = (sectionId: string, field: FormFieldConfig) => {
    setEditingField({ sectionId, field })
  }

  const handleSaveField = (sectionId: string, field: FormFieldConfig) => {
    onChange({
      ...config,
      sections: config.sections.map((s) => {
        if (s.id !== sectionId) return s
        const existingIndex = s.fields.findIndex((f) => f.id === field.id)
        if (existingIndex >= 0) {
          const newFields = [...s.fields]
          newFields[existingIndex] = field
          return { ...s, fields: newFields }
        } else {
          return {
            ...s,
            fields: [...s.fields, { ...field, sortOrder: s.fields.length }],
          }
        }
      }),
    })
    setEditingField(null)
  }

  const handleDeleteField = (sectionId: string, fieldId: string) => {
    onChange({
      ...config,
      sections: config.sections.map((s) => {
        if (s.id !== sectionId) return s
        return {
          ...s,
          fields: s.fields
            .filter((f) => f.id !== fieldId)
            .map((f, i) => ({ ...f, sortOrder: i })),
        }
      }),
    })
    setDeletingField(null)
  }

  const handleMoveField = (sectionId: string, fieldId: string, direction: "up" | "down") => {
    onChange({
      ...config,
      sections: config.sections.map((s) => {
        if (s.id !== sectionId) return s
        const currentIndex = s.fields.findIndex((f) => f.id === fieldId)
        if (currentIndex === -1) return s

        const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
        if (newIndex < 0 || newIndex >= s.fields.length) return s

        const newFields = [...s.fields]
        const [movedField] = newFields.splice(currentIndex, 1)
        newFields.splice(newIndex, 0, movedField)

        return {
          ...s,
          fields: newFields.map((f, i) => ({ ...f, sortOrder: i })),
        }
      }),
    })
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      {config.sections.map((section, index) => (
        <SectionCard
          key={section.id}
          section={section}
          index={index}
          totalSections={config.sections.length}
          categories={categories}
          isExpanded={expandedSections.has(section.id)}
          onToggle={() => toggleSection(section.id)}
          onUpdate={(updates) => handleUpdateSection(section.id, updates)}
          onDelete={() => handleDeleteSection(section.id)}
          onMove={(direction) => handleMoveSection(section.id, direction)}
          onAddField={() => handleAddField(section.id)}
          onEditField={(field) => handleEditField(section.id, field)}
          onDeleteField={(fieldId) => setDeletingField({ sectionId: section.id, fieldId })}
          onMoveField={(fieldId, direction) => handleMoveField(section.id, fieldId, direction)}
          canDelete={config.sections.length > 1}
        />
      ))}

      <Button variant="outline" onClick={handleAddSection} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Section
      </Button>

      {/* Field Editor Dialog */}
      {editingField && (
        <FieldEditorDialog
          sectionId={editingField.sectionId}
          field={editingField.field}
          categories={categories}
          onSave={handleSaveField}
          onCancel={() => setEditingField(null)}
        />
      )}

      {/* Delete Field Confirmation */}
      <AlertDialog
        open={!!deletingField}
        onOpenChange={(open) => !open && setDeletingField(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteFieldTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteFieldDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingField && handleDeleteField(deletingField.sectionId, deletingField.fieldId)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface SectionCardProps {
  section: FormSectionConfig
  index: number
  totalSections: number
  categories: GuestCategory[]
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (updates: Partial<FormSectionConfig>) => void
  onDelete: () => void
  onMove: (direction: "up" | "down") => void
  onAddField: () => void
  onEditField: (field: FormFieldConfig) => void
  onDeleteField: (fieldId: string) => void
  onMoveField: (fieldId: string, direction: "up" | "down") => void
  canDelete: boolean
}

function SectionCard({
  section,
  index,
  totalSections,
  categories,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  onMove,
  onAddField,
  onEditField,
  onDeleteField,
  onMoveField,
  canDelete,
}: SectionCardProps) {
  const t = useTranslations("rsvpFormBuilder")

  return (
    <Card>
      <CardHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => onMove("up")}
              disabled={index === 0}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => onMove("down")}
              disabled={index === totalSections - 1}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
          <Collapsible open={isExpanded} className="flex-1">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger onClick={onToggle} className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <CardTitle className="text-base">
                  {section.title.en || "Untitled Section"}
                </CardTitle>
                <Badge variant="secondary" className="ml-2">
                  {section.fields.length} {t("fields")}
                </Badge>
              </CollapsibleTrigger>
              <div className="flex items-center gap-2">
                <Switch
                  checked={section.enabled}
                  onCheckedChange={(enabled) => onUpdate({ enabled })}
                />
                {canDelete && (
                  <Button variant="ghost" size="icon" onClick={onDelete}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
            <CollapsibleContent className="mt-4">
              <div className="space-y-4">
                {/* Section Title */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Title (English)</Label>
                    <Input
                      value={section.title.en || ""}
                      onChange={(e) =>
                        onUpdate({ title: { ...section.title, en: e.target.value } })
                      }
                      placeholder="Section title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Title (Arabic)</Label>
                    <Input
                      value={section.title.ar || ""}
                      onChange={(e) =>
                        onUpdate({ title: { ...section.title, ar: e.target.value } })
                      }
                      placeholder="عنوان القسم"
                      dir="rtl"
                    />
                  </div>
                </div>

                {/* Section Description */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Description (English)</Label>
                    <Textarea
                      value={section.description?.en || ""}
                      onChange={(e) =>
                        onUpdate({
                          description: { ...section.description, en: e.target.value } as BilingualText,
                        })
                      }
                      placeholder="Optional description"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Description (Arabic)</Label>
                    <Textarea
                      value={section.description?.ar || ""}
                      onChange={(e) =>
                        onUpdate({
                          description: { en: section.description?.en || "", ar: e.target.value },
                        })
                      }
                      placeholder="وصف اختياري"
                      rows={2}
                      dir="rtl"
                    />
                  </div>
                </div>

                {/* Fields */}
                <div className="mt-4">
                  <Label className="text-sm font-medium">Fields</Label>
                  <div className="mt-2 space-y-2">
                    {section.fields
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((field, fieldIndex) => (
                        <div
                          key={field.id}
                          className="flex items-center gap-2 rounded-lg border bg-card p-3"
                        >
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4"
                              onClick={() => onMoveField(field.id, "up")}
                              disabled={fieldIndex === 0}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4"
                              onClick={() => onMoveField(field.id, "down")}
                              disabled={fieldIndex === section.fields.length - 1}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {field.label.en || "Untitled Field"}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {field.type}
                              </Badge>
                              {field.required && (
                                <Badge variant="secondary" className="text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditField(field)}
                          >
                            <Icons.edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteField(field.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                  </div>

                  <Button variant="outline" size="sm" onClick={onAddField} className="mt-2">
                    <Plus className="h-4 w-4 mr-1" />
                    {t("addField")}
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardHeader>
    </Card>
  )
}

interface FieldEditorDialogProps {
  sectionId: string
  field: FormFieldConfig | null
  categories: GuestCategory[]
  onSave: (sectionId: string, field: FormFieldConfig) => void
  onCancel: () => void
}

function FieldEditorDialog({
  sectionId,
  field,
  categories,
  onSave,
  onCancel,
}: FieldEditorDialogProps) {
  const t = useTranslations("rsvpFormBuilder")
  const isNew = !field

  const [formData, setFormData] = useState<FormFieldConfig>(
    field || {
      id: crypto.randomUUID(),
      type: "text",
      label: { en: "" },
      description: { en: "" },
      placeholder: { en: "" },
      required: false,
      sortOrder: 0,
      visibleToCategories: [],
      options: [],
    }
  )

  const handleSave = () => {
    if (!formData.label.en) return
    // Clean up empty optional fields to avoid validation errors
    const cleanedData: FormFieldConfig = {
      ...formData,
      description: formData.description?.en ? formData.description : undefined,
      placeholder: formData.placeholder?.en ? formData.placeholder : undefined,
    }
    onSave(sectionId, cleanedData)
  }

  const needsOptions = ["select", "radio", "checkbox"].includes(formData.type)

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? t("addCustomField") : t("editCustomField")}
          </DialogTitle>
          <DialogDescription>{t("customFieldDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Field Type */}
          <div className="space-y-2">
            <Label>{t("fieldType")}</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value as FormFieldConfig["type"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectFieldType")} />
              </SelectTrigger>
              <SelectContent>
                {fieldTypes.map((type) => {
                  const Icon = type.icon
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Field Label */}
          <div className="space-y-2">
            <Label>{t("fieldLabel")}</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                value={formData.label.en || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    label: { ...formData.label, en: e.target.value },
                  })
                }
                placeholder="Label (English)"
              />
              <Input
                value={formData.label.ar || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    label: { en: formData.label.en, ar: e.target.value },
                  })
                }
                placeholder="التسمية (Arabic)"
                dir="rtl"
              />
            </div>
          </div>

          {/* Field Description */}
          <div className="space-y-2">
            <Label>{t("fieldDescription")}</Label>
            <div className="grid grid-cols-2 gap-4">
              <Textarea
                value={formData.description?.en || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: { en: e.target.value, ar: formData.description?.ar || "" },
                  })
                }
                placeholder="Description (English)"
                rows={2}
              />
              <Textarea
                value={formData.description?.ar || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: { en: formData.description?.en || "", ar: e.target.value },
                  })
                }
                placeholder="الوصف (Arabic)"
                rows={2}
                dir="rtl"
              />
            </div>
          </div>

          {/* Placeholder */}
          {["text", "textarea", "email", "phone", "number"].includes(formData.type) && (
            <div className="space-y-2">
              <Label>{t("placeholder")}</Label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  value={formData.placeholder?.en || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      placeholder: { en: e.target.value, ar: formData.placeholder?.ar || "" },
                    })
                  }
                  placeholder="Placeholder (English)"
                />
                <Input
                  value={formData.placeholder?.ar || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      placeholder: { en: formData.placeholder?.en || "", ar: e.target.value },
                    })
                  }
                  placeholder="نص العنصر النائب (Arabic)"
                  dir="rtl"
                />
              </div>
            </div>
          )}

          {/* Options for select/radio/checkbox */}
          {needsOptions && (
            <div className="space-y-2">
              <Label>{t("fieldOptions")}</Label>
              <div className="space-y-2">
                {(formData.options || []).map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option.value}
                      onChange={(e) => {
                        const newOptions = [...(formData.options || [])]
                        newOptions[index] = { ...option, value: e.target.value }
                        setFormData({ ...formData, options: newOptions })
                      }}
                      placeholder={t("optionValue")}
                      className="flex-1"
                    />
                    <Input
                      value={option.label.en || ""}
                      onChange={(e) => {
                        const newOptions = [...(formData.options || [])]
                        newOptions[index] = {
                          ...option,
                          label: { en: e.target.value, ar: option.label.ar || "" },
                        }
                        setFormData({ ...formData, options: newOptions })
                      }}
                      placeholder={t("optionLabel")}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newOptions = (formData.options || []).filter(
                          (_, i) => i !== index
                        )
                        setFormData({ ...formData, options: newOptions })
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      options: [
                        ...(formData.options || []),
                        { value: "", label: { en: "" } },
                      ],
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("addOption")}
                </Button>
              </div>
            </div>
          )}

          {/* Required toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("requiredField")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("requiredFieldDescription")}
              </p>
            </div>
            <Switch
              checked={formData.required}
              onCheckedChange={(required) => setFormData({ ...formData, required })}
            />
          </div>

          {/* Category visibility */}
          {categories.length > 0 && (
            <div className="space-y-2">
              <Label>{t("visibleToCategories")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("categoryVisibilityDescription")}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {categories.map((cat) => {
                  const isSelected = (formData.visibleToCategories || []).includes(cat.id)
                  return (
                    <Badge
                      key={cat.id}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const current = formData.visibleToCategories || []
                        const newCategories = isSelected
                          ? current.filter((id) => id !== cat.id)
                          : [...current, cat.id]
                        setFormData({ ...formData, visibleToCategories: newCategories })
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full mr-1"
                        style={{ backgroundColor: cat.color || "#6366f1" }}
                      />
                      {cat.name}
                    </Badge>
                  )
                })}
              </div>
              {(formData.visibleToCategories || []).length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t("visibleToAllCategories")}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!formData.label.en}>
            {isNew ? t("addField") : t("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
